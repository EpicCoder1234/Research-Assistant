from fastapi import FastAPI, UploadFile, File, Depends, Header, HTTPException
from pypdf import PdfReader
import io
from google import genai
from google.genai import types
import chromadb
import os
from dotenv import load_dotenv
from pydantic import BaseModel
import uuid
from supabase import create_client
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI()

# add this right after app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# auth client (anon key) — used only for JWT verification
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# admin client (service role key) — bypasses RLS for backend data ops
# Add SUPABASE_SERVICE_KEY to your .env (Supabase Dashboard → Settings → API → service_role)
admin_supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_KEY"))  # falls back to anon if not set
)

chroma_client = chromadb.PersistentClient(path="./chroma_db")

SYSTEM_INSTRUCTION = (
    "You are a research paper assistant helping a CS student understand academic papers. "
    "You have two sources of knowledge: "
    "1. The provided context excerpts from the paper — always prioritize this for specific claims, results, and findings. "
    "2. Your own training knowledge — use this to explain concepts, provide analogies, and give background context that helps the student understand the paper better. "
    "Always be clear about which source you're drawing from. "
    "For example: 'According to the paper...' vs 'As background context...' "
    "Be clear, concise, and targeted at a smart undergraduate student."
)


class ChatMessage(BaseModel):
    role: str
    parts: list[str]


class QueryRequest(BaseModel):
    paper_id: str
    question: str
    history: list[ChatMessage] = []


class MessageRequest(BaseModel):
    paper_id: str
    role: str
    content: str


# ── Auth dependency ───────────────────────────────────────────────────────────
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return response.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/papers/upload")
async def upload_paper(file: UploadFile = File(...), user=Depends(get_current_user)):
    content = await file.read()
    filename = file.filename

    # extract text
    reader = PdfReader(io.BytesIO(content))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""

    # generate unique collection name for this paper
    paper_id = str(uuid.uuid4())
    collection_name = f"paper_{paper_id}"

    # create a dedicated ChromaDB collection for this paper
    col = chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

    # chunk text
    chunks = []
    start = 0
    while start < len(text):
        end = start + 1000
        chunks.append(text[start:end])
        start = end - 500

    # embed and store
    total_chunks = 0
    for i, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk:
            continue

        result = gemini.models.embed_content(
            model="gemini-embedding-001",
            contents=chunk,
        )
        embedding = result.embeddings[0].values

        col.add(
            ids=[f"{paper_id}::chunk_{i}"],
            embeddings=[embedding],
            documents=[chunk],
            metadatas=[{"source": filename, "chunk_index": i}]
        )
        total_chunks += 1

    # save paper metadata to Supabase (include user_id)
    admin_supabase.table("papers").insert({
        "id": paper_id,
        "filename": filename,
        "title": filename.replace(".pdf", ""),
        "collection_name": collection_name,
        "user_id": user.id,
    }).execute()

    return {
        "message": "Paper uploaded successfully",
        "paper_id": paper_id,
        "chunks": total_chunks
    }


@app.get("/papers")
def get_papers(user=Depends(get_current_user)):
    response = admin_supabase.table("papers").select("*").eq("user_id", user.id).execute()
    return response.data


@app.delete("/papers/{paper_id}")
def delete_paper(paper_id: str, user=Depends(get_current_user)):
    response = admin_supabase.table("papers").select("collection_name").eq("id", paper_id).eq("user_id", user.id).execute()
    if not response.data:
        return {"error": "Paper not found"}

    collection_name = response.data[0]["collection_name"]

    # delete the ChromaDB collection
    try:
        chroma_client.delete_collection(name=collection_name)
    except Exception:
        pass  # collection may not exist if indexing failed

    # delete all messages for this paper, then the paper row
    admin_supabase.table("messages").delete().eq("paper_id", paper_id).execute()
    admin_supabase.table("papers").delete().eq("id", paper_id).eq("user_id", user.id).execute()

    return {"message": "Paper deleted"}


@app.post("/messages")
def save_message(req: MessageRequest, user=Depends(get_current_user)):
    admin_supabase.table("messages").insert({
        "paper_id": req.paper_id,
        "role": req.role,
        "content": req.content,
    }).execute()
    return {"ok": True}


@app.get("/papers/{paper_id}/messages")
def get_messages(paper_id: str, user=Depends(get_current_user)):
    response = (
        admin_supabase.table("messages")
        .select("role, content, created_at")
        .eq("paper_id", paper_id)
        .order("created_at")
        .execute()
    )
    return response.data


@app.post("/query")
async def query_paper(request: QueryRequest, user=Depends(get_current_user)):
    response = admin_supabase.table("papers").select("collection_name").eq("id", request.paper_id).eq("user_id", user.id).execute()

    if not response.data:
        return {"error": "Paper not found"}

    collection_name = response.data[0]["collection_name"]

    col = chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # 2. embed the question
    result = gemini.models.embed_content(
        model="gemini-embedding-001",
        contents=request.question,
    )
    embedding = result.embeddings[0].values

    # 3. query ChromaDB
    results = col.query(
        query_embeddings=[embedding],
        n_results=min(5, col.count()),
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append({
            "text": doc,
            "source": meta.get("source", "unknown"),
            "score": 1 - dist,
        })

    # 4. build prompt
    context_block = "\n\n---\n\n".join(
        f"[Source: {c['source']} | Relevance: {c['score']:.2f}]\n{c['text']}"
        for c in chunks
    )
    prompt = f"""Context from the paper:

{context_block}

---

Question: {request.question}"""

    # 5. call Gemini with conversation history
    chat = gemini.chats.create(
        model="gemini-2.0-flash",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.1
        ),
        history=[
            {"role": m.role, "parts": [{"text": p} for p in m.parts]}
            for m in request.history
        ]
    )

    response = chat.send_message(prompt)

    # 6. return answer
    return {"answer": response.text}
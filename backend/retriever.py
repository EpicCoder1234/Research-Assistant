from fastapi.responses import StreamingResponse
from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
import chromadb
from dotenv import load_dotenv
import os
from supabase import create_client
import uuid


load_dotenv()
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)
app = FastAPI()
class QueryRequest(BaseModel):
    paper_id: str
    question: str

gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

chroma_client = chromadb.PersistentClient(path="./chroma_db")

@app.post("/query")
async def query_paper(request: QueryRequest):
    # 1. look up collection_name from Supabase
    response = supabase.table("papers").select("collection_name").eq("id", request.paper_id).execute()
    collection_name = response.data[0]["collection_name"]
    col = chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )
    
    # 2. embed the question
    result = genai.embed_content(
        model="gemini-embedding-001",
        content=request.question,
        task_type="retrieval_query"
    )
    embedding = result["embedding"]
    
    # 3. query ChromaDB
    results = col.query(
        query_embeddings=[embedding],
        n_results=5,
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
            "score": 1 - dist,  # cosine similarity (higher = more relevant)
        })

    # 4. build prompt
    context_block = "\n\n---\n\n".join(
        f"[Source: {c['source']} | Relevance: {c['score']:.2f}]\n{c['text']}"
        for c in chunks
    )
    prompt = f"""
    Context:
    {context_block}

    Question: {request.question}
    """
    # 5. call Gemini
    response = gemini.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=(
                "You are a research paper assistant. Answer questions using ONLY "
                "the provided context from the paper. If the context doesn't contain "
                "enough information to answer, say so honestly. Do not make things up. "
                "Be clear and concise. When relevant, mention which part of the paper "
                "your answer comes from."
            ),
            temperature=0.1
        )
    )
    # 6. return answer
    
    return {"answer": response.text}
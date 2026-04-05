# Research Assistant

A personal research paper assistant for CS/ML students. Upload papers, understand them faster, and build a knowledge base that grows smarter over time.

---

## What It Does

Research papers are dense and hard to understand quickly. This tool lets you upload any ML or CS paper as a PDF and have a real conversation with it — asking questions, getting plain English explanations, and testing your understanding. Unlike generic "chat with PDF" apps, it builds a personal knowledge base that accumulates over time, making explanations more personalized the more you use it.

---

## Features

### Paper Upload and Indexing
- Upload any ML or CS research paper as a PDF
- Automatically extracts text, chunks it, embeds it, and stores it in a vector collection
- Each paper is tied to your account — your library is private
- Dashboard shows all papers with title, upload date, and page count

### Chat with a Paper
- Select any paper and ask questions about it in natural language
- Answers are grounded only in the paper's content — no hallucination
- Responses cite which section of the paper the answer came from
- Conversation history is maintained within a session for natural follow-up questions

### Two-Layer RAG Retrieval
- **Layer 1** searches the selected paper for relevant chunks
- **Layer 2** simultaneously searches your personal concepts knowledge base
- Both layers feed into a single prompt so answers are grounded in both the paper and your accumulated understanding
- The system automatically saves strong concept explanations to Layer 2 over time

### Plain English Explanations
- Ask for any section, equation, or concept to be explained simply
- Targeted at smart undergrads, not PhD researchers
- Supports follow-ups like "explain that more simply" or "give me an analogy"

### Cross-Paper Comparison
- Index multiple papers and ask questions across all of them
- Example: *"How does the attention mechanism in this paper differ from the original Transformer paper?"*
- Compare mode retrieves from all indexed papers simultaneously

### Quiz Mode
- After reading a paper, enter quiz mode to test your understanding
- System generates questions based on the paper's key contributions, methods, and results
- Evaluates your natural language answers and tracks which concepts need review

### Personal Concepts Knowledge Base
- A second vector collection that grows as you use the app
- Concept explanations are saved automatically when the system generates strong ones
- You can also manually save explanations you find useful
- Browse and search all saved concepts from your dashboard
- The more you use it, the more personalized it becomes

### Paper Library Dashboard
- See all uploaded papers in one place
- Search your library by title or topic
- Delete papers you no longer need
- See which papers share common concepts

### Authentication
- Sign up and login with email and password
- All papers and concepts are private to your account
- Session persistence so you stay logged in across visits

### Streaming Responses
- Answers stream in token by token rather than waiting for the full response
- Makes the app feel fast even on long explanations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, deployed on Vercel |
| Backend | FastAPI (Python), deployed on Render |
| Vector Database | ChromaDB (two collections: papers + concepts) |
| RAG Framework | LangChain |
| AI Model | Gemini (embeddings + generation) |
| Auth and User Data | Supabase |
| PDF Processing | pypdf |

---

## Architecture

### Two-Layer RAG

```
User query
    │
    ├── Layer 1: ChromaDB "papers" collection
    │   └── Relevant chunks from the selected paper
    │
    ├── Layer 2: ChromaDB "concepts" collection
    │   └── Relevant explanations from personal knowledge base
    │
    └── Both combined into one prompt → Gemini → streamed answer
```

### Data Flow

```
1. User uploads PDF
2. Backend extracts text, chunks it, embeds it via Gemini
3. Chunks stored in ChromaDB papers collection with user_id metadata
4. User asks a question in the chat interface
5. FastAPI receives POST /query
6. LangChain retrieves top chunks from both collections
7. Prompt built with paper context + concept context + question
8. Gemini streams response back to frontend
9. Strong concept explanations auto-saved to concepts collection
```

---

## API Endpoints

```
POST   /auth/signup               create account
POST   /auth/login                login

POST   /papers/upload             upload and index a PDF
GET    /papers                    list all papers for current user
DELETE /papers/{id}               delete a paper and its vectors

POST   /query                     main RAG query
                                  body: { paper_id, question, mode }
                                  mode: explain | quiz | compare

POST   /concepts/save             manually save a concept explanation
GET    /concepts                  list all saved concepts
DELETE /concepts/{id}             delete a concept
```

---

## Query Modes

| Mode | Description |
|---|---|
| `explain` | Default mode. Answers questions grounded in the paper and concepts layer |
| `quiz` | Generates and evaluates questions about the paper for active recall |
| `compare` | Retrieves from multiple papers simultaneously for cross-paper questions |

---

## Project Structure

```
research-assistant/
├── backend/
│   ├── main.py                   FastAPI app, all routes
│   ├── rag/
│   │   ├── indexer.py            process, chunk, and embed papers
│   │   ├── retriever.py          two-layer RAG query logic
│   │   └── collections.py        ChromaDB collection setup
│   ├── auth/
│   │   └── supabase.py           auth middleware
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx     upload papers, view library
│   │   │   └── Chat.jsx          chat with a paper
│   │   └── App.jsx
│   └── package.json
└── .env
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Gemini API key
- Supabase project

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file:

```
GEMINI_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

Run the backend:

```bash
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## What Makes This Different

Most "chat with PDF" apps do single-layer retrieval — search the document and answer. This app adds:

- **A personal knowledge layer** that accumulates over time and gets more personalized the more you use it
- **Cross-paper retrieval** across your entire library so you can compare papers directly
- **Quiz mode** for active recall, not just passive reading
- **Two-layer RAG** that grounds answers in both the specific paper and your broader accumulated understanding

---

## Roadmap

- [ ] FastAPI backend skeleton
- [ ] Paper upload and single-layer indexing
- [ ] Basic query endpoint
- [ ] Two-layer retrieval with concepts collection
- [ ] Supabase auth
- [ ] React frontend
- [ ] Streaming responses
- [ ] Quiz mode
- [ ] Cross-paper compare mode
- [ ] Deploy to Render + Vercel
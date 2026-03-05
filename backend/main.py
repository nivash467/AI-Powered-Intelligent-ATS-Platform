from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.resume import router as resume_router
from routes.analysis import router as analysis_router
from routes.candidates import router as candidates_router
from database.db import verify_connection


@asynccontextmanager
async def lifespan(app):
    # Startup: verify MongoDB connection
    verify_connection()
    yield
    # Shutdown
    print("🔌 ATS Backend shutting down...")


app = FastAPI(
    title="Intelligent ATS Platform API",
    description="Backend API for the AI-powered candidate screening and hiring intelligence platform.",
    version="1.0.0",
    lifespan=lifespan
)

# ─── CORS Configuration ────────────────────────
# Allow the Vite frontend dev server to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Alternate dev port
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ──────────────────────────
app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(analysis_router)
app.include_router(candidates_router)


# ─── Root Endpoint ──────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Intelligent ATS Platform API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "ats-backend"}

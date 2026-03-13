"""iLikey Audio — FastAPI Backend"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import songs, tags, sections, auth

app = FastAPI(
    title="iLikey Audio API",
    version="0.1.0",
    description="Backend API for the iLikey Audio song tagging app",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(songs.router, prefix="/api/songs", tags=["songs"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
app.include_router(sections.router, prefix="/api/sections", tags=["sections"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

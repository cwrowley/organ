from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from routers import churches, pieces, gigs

app = FastAPI(
    title="Organ Gigs API",
    description="API for managing organ gigs, churches, and pieces of music.",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(churches.router, prefix="/churches", tags=["Churches"])
app.include_router(pieces.router, prefix="/pieces", tags=["Pieces"])
app.include_router(gigs.router, prefix="/gigs", tags=["Gigs"])

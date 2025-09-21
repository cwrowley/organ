import uvicorn
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from organ.routers import churches, gigs, pieces

app = FastAPI(
    title="Organ Gigs API",
    description="API for managing organ gigs, churches, and pieces of music.",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory="organ/static"), name="static")

@app.get("/")
async def root():
    return RedirectResponse("/static/index.html")

app.include_router(churches.router, prefix="/churches", tags=["Churches"])
app.include_router(pieces.router, prefix="/pieces", tags=["Pieces"])
app.include_router(gigs.router, prefix="/gigs", tags=["Gigs"])

if __name__ == "__main__":
    uvicorn.run("organ.main:app", host="0.0.0.0", port=1685, reload=True)

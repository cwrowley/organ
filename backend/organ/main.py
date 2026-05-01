import os

import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse

from organ.auth import verify_api_key
from organ.routers import churches, gigs, pieces

app = FastAPI(
    title="Organ Gigs API",
    description="API for managing organ gigs, churches, and pieces of music.",
    version="1.0.0"
)

_auth = [Depends(verify_api_key)]
app.include_router(churches.router, prefix="/api/churches", tags=["Churches"], dependencies=_auth)
app.include_router(pieces.router, prefix="/api/pieces", tags=["Pieces"], dependencies=_auth)
app.include_router(gigs.router, prefix="/api/gigs", tags=["Gigs"], dependencies=_auth)

_STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
_INDEX = os.path.join(_STATIC_DIR, "index.html")

@app.get("/{full_path:path}")
async def spa(full_path: str):
    candidate = os.path.normpath(os.path.join(_STATIC_DIR, full_path))
    if not candidate.startswith(_STATIC_DIR):
        raise HTTPException(status_code=404)
    if full_path and os.path.isfile(candidate):
        return FileResponse(candidate)
    if os.path.isfile(_INDEX):
        return FileResponse(_INDEX)
    raise HTTPException(status_code=404, detail="Frontend not built")

def run_server():
    uvicorn.run("organ.main:app", host="0.0.0.0", port=1685, reload=True)

if __name__ == "__main__":
    run_server()

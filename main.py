from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from models import Gig, GigPiece, Church, Piece, Role, SessionLocal
from pydantic import BaseModel
from datetime import date

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class GigPieceCreate(BaseModel):
    piece_id: int
    role: Role

class GigCreate(BaseModel):
    date: date
    church_id: int
    fee: float
    pieces: list[GigPieceCreate]

class ChurchCreate(BaseModel):
    name: str
    location: str | None = None
    info: str | None = None

class PieceCreate(BaseModel):
    title: str
    composer: str
    duration: int | None = None

## Endpoints for churches

@app.get("/churches/")
def read_churches(db: Session = Depends(get_db)):
    churches = db.query(Church).order_by(Church.name).all()
    return churches

@app.post("/churches/")
def add_church(church: ChurchCreate, db: Session = Depends(get_db)):
    new_church = Church(**church.model_dump())
    db.add(new_church)
    db.commit()
    db.refresh(new_church)
    return new_church

@app.get("/churches/{church_id}")
def read_church(church_id: int, db: Session = Depends(get_db)):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    return church

@app.put("/churches/{church_id}")
def update_church(church_id: int, church_update: ChurchCreate, db: Session = Depends(get_db)):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    for key, value in church_update.model_dump().items():
        setattr(church, key, value)
    db.commit()
    db.refresh(church)
    return church

@app.delete("/churches/{church_id}")
def delete_church(church_id: int, db: Session = Depends(get_db)):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    db.delete(church)
    db.commit()
    return {"detail": "Church deleted successfully"}

# Endpoints for pieces

@app.get("/pieces/")
def read_pieces(db: Session = Depends(get_db)):
    pieces = db.query(Piece).order_by(Piece.composer, Piece.title).all()
    return pieces

@app.post("/pieces/")
def add_piece(piece: PieceCreate, db: Session = Depends(get_db)):
    new_piece = Piece(**piece.model_dump())
    db.add(new_piece)
    db.commit()
    db.refresh(new_piece)
    return new_piece

@app.get("/pieces/{piece_id}")
def read_piece(piece_id: int, db: Session = Depends(get_db)):
    piece = db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    return piece

@app.put("/pieces/{piece_id}")
def update_piece(piece_id: int, piece_update: PieceCreate, db: Session = Depends(get_db)):
    piece = db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    for key, value in piece_update.model_dump().items():
        setattr(piece, key, value)
    db.commit()
    db.refresh(piece)
    return piece

@app.delete("/pieces/{piece_id}")
def delete_piece(piece_id: int, db: Session = Depends(get_db)):
    piece = db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    db.delete(piece)
    db.commit()
    return {"detail": "Piece deleted successfully"}
 
@app.get("/gigs/")
def read_gigs(db: Session = Depends(get_db)):
    gigs = db.query(Gig).all()
    return gigs 

@app.post("/gigs/")
def add_gig(gig: GigCreate, db: Session = Depends(get_db)):
    new_gig = Gig(date=gig.date, church_id=gig.church_id, fee=gig.fee)
    db.add(new_gig)
    db.flush()
    # Associate pieces with the new gig
    for p in gig.pieces:
        gig_piece = GigPiece(gig_id=new_gig.id, piece_id=p.piece_id, role=p.role)
        db.add(gig_piece)
    db.commit()
    db.refresh(new_gig)
    return new_gig

@app.get("/gigs/{gig_id}")
def read_gig(gig_id: int, db: Session = Depends(get_db)):
    gig = db.get(Gig, gig_id)
    if not gig:
        return {"error": "Gig not found"}
    church = db.get(Church, gig.church_id)
    # Fetch associated pieces
    pieces = []
    for gp in gig.gig_pieces:
        pieces.append({
            "piece": db.get(Piece, gp.piece_id),
            "role": gp.role
        })
    return {
        "date": gig.date,
        "church": church,
        "fee": gig.fee,
        "pieces": pieces,
    }

@app.put("/gigs/{gig_id}")
def update_gig(gig_id: int, gig_update: GigCreate, db: Session = Depends(get_db)):
    gig = db.get(Gig, gig_id)
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    # Update gig details
    gig.date = gig_update.date
    gig.church_id = gig_update.church_id
    gig.fee = gig_update.fee
    # Clear existing pieces and add new ones
    db.query(GigPiece).filter(GigPiece.gig_id == gig.id).delete()
    for p in gig_update.pieces:
        gig_piece = GigPiece(gig_id=gig.id, piece_id=p.piece_id, role=p.role)
        db.add(gig_piece)
    db.commit()
    db.refresh(gig)
    return gig
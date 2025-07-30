from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import Gig, GigPiece, Piece
from app.schemas import GigOut, PieceCreate, PieceOut
from app.session import get_db

router = APIRouter()

@router.get("/", response_model=list[PieceOut])
def read_pieces(db: Session = Depends(get_db)):
    pieces = db.query(Piece).order_by(Piece.composer, Piece.title).all()
    return pieces

@router.post("/", response_model=PieceOut)
def add_piece(piece: PieceCreate, db: Session = Depends(get_db)):
    new_piece = Piece(**piece.model_dump())
    db.add(new_piece)
    db.commit()
    db.refresh(new_piece)
    return new_piece

@router.get("/{piece_id}", response_model=PieceOut)
def read_piece(piece_id: int, db: Session = Depends(get_db)):
    piece = db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    return piece

@router.put("/{piece_id}", response_model=PieceOut)
def update_piece(piece_id: int, piece_update: PieceCreate, db: Session = Depends(get_db)):
    piece = db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    for key, value in piece_update.model_dump().items():
        setattr(piece, key, value)
    db.commit()
    db.refresh(piece)
    return piece

@router.delete("/{piece_id}")
def delete_piece(piece_id: int, db: Session = Depends(get_db)):
    piece = db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    db.delete(piece)
    db.commit()
    return {"detail": "Piece deleted successfully"}

@router.get("/{piece_id}/gigs", response_model=list[GigOut])
def read_piece_gigs(piece_id: int, db: Session = Depends(get_db)):
    piece = db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    gigs = (
        db.query(Gig)
        .join(GigPiece)
        .filter(GigPiece.piece_id == piece_id)
        .order_by(desc(Gig.date))
        .all()
    )
    return gigs

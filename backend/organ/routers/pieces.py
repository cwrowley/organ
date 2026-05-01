from collections import defaultdict
from datetime import date as date_t

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from organ.models import Gig, GigPiece, Piece
from organ.schemas import GigOut, PieceCreate, PieceWithStats
from organ.session import get_db

router = APIRouter()


def _piece_dict(piece: Piece, dates: list[date_t], today: date_t) -> dict:
    sorted_dates = sorted(dates)
    past = [d for d in sorted_dates if d < today]
    upcoming = [d for d in sorted_dates if d >= today]
    return {
        "id": piece.id,
        "title": piece.title,
        "composer": piece.composer,
        "duration": piece.duration,
        "notes": piece.notes,
        "last_performed": past[-1] if past else None,
        "upcoming_dates": upcoming,
        "performance_count": len(past),
    }


def _piece_with_stats(db: Session, piece: Piece) -> dict:
    rows = (
        db.query(Gig.date)
        .join(GigPiece)
        .filter(GigPiece.piece_id == piece.id)
        .all()
    )
    return _piece_dict(piece, [r[0] for r in rows], date_t.today())


@router.get("/", response_model=list[PieceWithStats])
def read_pieces(db: Session = Depends(get_db)):
    today = date_t.today()
    pieces = db.query(Piece).order_by(Piece.composer, Piece.title).all()
    rows = db.query(GigPiece.piece_id, Gig.date).join(Gig).all()
    by_piece: dict[int, list[date_t]] = defaultdict(list)
    for pid, gdate in rows:
        by_piece[pid].append(gdate)
    return [_piece_dict(p, by_piece.get(p.id, []), today) for p in pieces]

@router.post("/", response_model=PieceWithStats)
def add_piece(piece: PieceCreate, db: Session = Depends(get_db)):
    new_piece = Piece(**piece.model_dump())
    db.add(new_piece)
    db.commit()
    db.refresh(new_piece)
    return _piece_with_stats(db, new_piece)

@router.get("/{piece_id}", response_model=PieceWithStats)
def read_piece(piece_id: int, db: Session = Depends(get_db)):
    piece = db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    return _piece_with_stats(db, piece)

@router.put("/{piece_id}", response_model=PieceWithStats)
def update_piece(piece_id: int, piece_update: PieceCreate, db: Session = Depends(get_db)):
    piece = db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    for key, value in piece_update.model_dump().items():
        setattr(piece, key, value)
    db.commit()
    db.refresh(piece)
    return _piece_with_stats(db, piece)

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

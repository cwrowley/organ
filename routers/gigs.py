from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from models import Gig, GigPiece
from schemas import GigCreate, GigOut
from session import get_db

router = APIRouter()

@router.get("/", response_model=list[GigOut])
def read_gigs(db: Session = Depends(get_db)):
    gigs = db.query(Gig).options(
        joinedload(Gig.church),
        joinedload(Gig.gig_pieces).joinedload(GigPiece.piece)
    ).all()
    return gigs

@router.get("/{gig_id}", response_model=GigOut)
def read_gig(gig_id: int, db: Session = Depends(get_db)):
    gig = db.get(Gig, gig_id, options=[
        joinedload(Gig.church),
        joinedload(Gig.gig_pieces).joinedload(GigPiece.piece)
    ])
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    return gig

@router.post("/", response_model=GigOut)
def add_gig(gig: GigCreate, db: Session = Depends(get_db)):
    new_gig = Gig(date=gig.date, church_id=gig.church_id, fee=gig.fee)
    db.add(new_gig)
    db.flush()
    for p in gig.pieces:
        gig_piece = GigPiece(gig_id=new_gig.id, piece_id=p.piece_id, role=p.role)
        db.add(gig_piece)
    db.commit()
    db.refresh(new_gig)
    gig_with_data = db.get(Gig, new_gig.id, options=[
        joinedload(Gig.church),
        joinedload(Gig.gig_pieces).joinedload(GigPiece.piece)
    ])
    return gig_with_data

@router.put("/{gig_id}", response_model=GigOut)
def update_gig(gig_id: int, gig_update: GigCreate, db: Session = Depends(get_db)):
    gig = db.get(Gig, gig_id)
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    gig.date = gig_update.date
    gig.church_id = gig_update.church_id
    gig.fee = gig_update.fee
    db.query(GigPiece).filter(GigPiece.gig_id == gig.id).delete()
    for p in gig_update.pieces:
        gig_piece = GigPiece(gig_id=gig.id, piece_id=p.piece_id, role=p.role)
        db.add(gig_piece)
    db.commit()
    gig_with_data = db.get(Gig, gig.id, options=[
        joinedload(Gig.church),
        joinedload(Gig.gig_pieces).joinedload(GigPiece.piece)
    ])
    return gig_with_data


from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from models import Gig, GigPiece, Role
from schemas import GigCreate, GigOut
from session import get_db

router = APIRouter()

def _sort_gig_pieces(gig: Gig | None) -> None:
    """Helper function to sort gig_pieces by role for a given gig"""
    if gig and gig.gig_pieces:
        gig.gig_pieces.sort(key=lambda gp: list(Role).index(gp.role))

def _get_gig_with_data(db: Session, gig_id: int) -> Gig | None:
    """Helper function to get a gig by ID with all related data loaded and sorted"""
    gig = db.get(Gig, gig_id, options=[
        joinedload(Gig.church),
        joinedload(Gig.gig_pieces).joinedload(GigPiece.piece)
    ])
    _sort_gig_pieces(gig)
    return gig

def _get_gigs_with_data(db: Session) -> list[Gig]:
    """Helper function to get all gigs with related data loaded and sorted"""
    gigs = db.query(Gig).options(
        joinedload(Gig.church),
        joinedload(Gig.gig_pieces).joinedload(GigPiece.piece)
    ).all()
    for gig in gigs:
        _sort_gig_pieces(gig)
    return gigs

@router.get("/", response_model=list[GigOut])
def read_gigs(db: Session = Depends(get_db)):
    return _get_gigs_with_data(db)

@router.get("/{gig_id}", response_model=GigOut)
def read_gig(gig_id: int, db: Session = Depends(get_db)):
    gig = _get_gig_with_data(db, gig_id)
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
    return _get_gig_with_data(db, new_gig.id)

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
    return _get_gig_with_data(db, gig.id)


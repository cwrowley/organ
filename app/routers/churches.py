from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import Church, Gig
from app.schemas import ChurchCreate, ChurchOut, GigOut
from app.session import get_db

router = APIRouter()

@router.get("/", response_model=list[ChurchOut])
def read_churches(db: Session = Depends(get_db)):
    churches = db.query(Church).order_by(Church.name).all()
    return churches

@router.post("/", response_model=ChurchOut)
def add_church(church: ChurchCreate, db: Session = Depends(get_db)):
    new_church = Church(**church.model_dump())
    db.add(new_church)
    db.commit()
    db.refresh(new_church)
    return new_church

@router.get("/{church_id}", response_model=ChurchOut)
def read_church(church_id: int, db: Session = Depends(get_db)):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    return church

@router.put("/{church_id}", response_model=ChurchOut)
def update_church(church_id: int, church_update: ChurchCreate, db: Session = Depends(get_db)):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    for key, value in church_update.model_dump().items():
        setattr(church, key, value)
    db.commit()
    db.refresh(church)
    return church

@router.delete("/{church_id}")
def delete_church(church_id: int, db: Session = Depends(get_db)):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    db.delete(church)
    db.commit()
    return {"detail": "Church deleted successfully"}

@router.get("/{church_id}/gigs", response_model=list[GigOut])
def read_church_gigs(church_id: int, db: Session = Depends(get_db)):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    gigs = db.query(Gig).filter(Gig.church_id == church_id).order_by(desc(Gig.date)).all()
    return gigs

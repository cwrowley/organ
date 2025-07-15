from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models import Role

# ----------------------------
# Piece Schemas
# ----------------------------

class PieceCreate(BaseModel):
    title: str
    composer: str
    duration: Optional[int] = None
    notes: Optional[str] = None

class PieceOut(BaseModel):
    id: int
    title: str
    composer: str
    duration: Optional[int]
    notes: Optional[str]

    model_config = ConfigDict(from_attributes=True)

# ----------------------------
# Church Schemas
# ----------------------------

class ChurchCreate(BaseModel):
    name: str
    location: Optional[str] = None
    info: Optional[str] = None

class ChurchOut(BaseModel):
    id: int
    name: str
    location: Optional[str]
    info: Optional[str]

    model_config = ConfigDict(from_attributes=True)

# ----------------------------
# GigPiece Schemas
# ----------------------------

class GigPieceCreate(BaseModel):
    piece_id: int
    role: Role

class GigPieceOut(BaseModel):
    piece: PieceOut
    role: Role

    model_config = ConfigDict(from_attributes=True)

# ----------------------------
# Gig Schemas
# ----------------------------

class GigCreate(BaseModel):
    date: date
    church_id: int
    fee: Optional[float]
    occasion: Optional[str]
    pieces: list[GigPieceCreate]

class GigOut(BaseModel):
    id: int
    date: date
    church: ChurchOut
    fee: Optional[float]
    occasion: Optional[str]
    gig_pieces: list[GigPieceOut]

    model_config = ConfigDict(from_attributes=True)

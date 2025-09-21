from __future__ import annotations

import datetime
import enum
from typing import Optional

from sqlalchemy import Date, Enum, ForeignKey, create_engine
from sqlalchemy.orm import (DeclarativeBase, Mapped, mapped_column,
                            relationship, sessionmaker)
from typing_extensions import Annotated

__all__ = ["Piece", "Church", "Gig", "GigPiece", "Role"]

class Base(DeclarativeBase):
    pass

intpk = Annotated[int, mapped_column(primary_key=True)]

class Piece(Base):
    __tablename__ = 'pieces'
    id: Mapped[intpk]
    title: Mapped[str]
    composer: Mapped[str]
    duration: Mapped[Optional[int]]
    notes: Mapped[Optional[str]] # e.g., "Orgelbuchlein, p40", "Appropriate for Good Friday"

    # relationship to GigPieces
    gig_pieces: Mapped[list[GigPiece]] = relationship(back_populates='piece')

class Church(Base):
    __tablename__ = 'churches'
    id: Mapped[intpk]
    name: Mapped[str] = mapped_column(unique=True)
    location: Mapped[Optional[str]]
    info: Mapped[Optional[str]]  # misc information, such as door combinations

    # relationship to Gigs
    gigs: Mapped[list[Gig]] = relationship(back_populates='church')

class Gig(Base):
    __tablename__ = 'gigs'
    id: Mapped[intpk]
    date: Mapped[datetime.date] = mapped_column(Date)
    church_id: Mapped[int] = mapped_column(ForeignKey('churches.id'))
    fee: Mapped[Optional[float]]
    occasion: Mapped[Optional[str]]  # e.g., "Sunday Service", "Wedding", etc.

    # relationships
    church: Mapped[Church] = relationship(back_populates='gigs')
    gig_pieces: Mapped[list[GigPiece]] = relationship(back_populates='gig', cascade="all, delete-orphan")

class Role(enum.Enum):
    Prelude = "Prelude"
    Offertory = "Offertory"
    Postlude = "Postlude"
    Other = "Other"

class GigPiece(Base):
    __tablename__ = 'gig_pieces'
    id: Mapped[intpk]
    gig_id: Mapped[int] = mapped_column(ForeignKey('gigs.id'))
    piece_id: Mapped[int] = mapped_column(ForeignKey('pieces.id'))
    role: Mapped[Role] = mapped_column(Enum(Role))

    # relationships
    gig: Mapped[Gig] = relationship(back_populates='gig_pieces')
    piece: Mapped[Piece] = relationship(back_populates='gig_pieces')

engine = create_engine('sqlite:///organ_gigs.db')
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

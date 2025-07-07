from __future__ import annotations
import enum
from sqlalchemy import create_engine, ForeignKey, Date, Enum
from sqlalchemy.orm import relationship, sessionmaker, DeclarativeBase, Mapped, mapped_column
from typing import Optional
from typing_extensions import Annotated
import datetime

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

    # relationships
    church: Mapped[Church] = relationship(back_populates='gigs')
    gig_pieces: Mapped[list[GigPiece]] = relationship(back_populates='gig')

class Role(enum.Enum):
    PRELUDE = "PRELUDE"
    OFFERTORY = "OFFERTORY"
    POSTLUDE = "POSTLUDE"
    OTHER = "OTHER"

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

def make_db():
    Base.metadata.create_all(engine)
    print("Database and tables created.")

def populate_initial_data():
    db = SessionLocal()
    pieces = [
        Piece(title="Prelude in C Major, BWV 547", composer="J.S. Bach", duration=300),
        Piece(title="Fugue in C major, BWV 547", composer="J.S. Bach", duration=400),
        Piece(title="Psalm XIX", composer="Benedetto Marcello", duration=250),
    ]
    db.bulk_save_objects(pieces)
    churches = [
        Church(name="All Saints Church", location="Princeton, NJ", info="Door combination: 1234"),
        Church(name="Trinity Episcopal Church", location="Princeton, NJ", info="Door combination: 5678"),
        Church(name="Dutch Neck Presbyterian Church", location="Dutch Neck, NJ"),
        Church(name="Abiding Presence Lutheran Church", location="Ewing, NJ", info="Door combination: 91011"),
        Church(name="Princeton University Chapel", location="Princeton, NJ", info="Door combination: 121314"),
    ]
    db.bulk_save_objects(churches)
    db.commit()
    db.close()

if __name__ == "__main__":
    make_db()
    populate_initial_data()
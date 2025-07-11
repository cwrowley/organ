from datetime import date

from models import Base, Church, Gig, GigPiece, Piece
from session import SessionLocal, engine


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

def populate_sample_data():
    db = SessionLocal()
    try:
        pieces = [
            Piece(title="Prelude in C Major, BWV 547", composer="J.S. Bach", duration=300),
            Piece(title="Fugue in C major, BWV 547", composer="J.S. Bach", duration=400),
            Piece(title="Psalm XIX", composer="Benedetto Marcello", duration=250),
        ]
        churches = [
            Church(name="All Saints Church", location="Princeton, NJ", info="Door combination: 1234"),
            Church(name="Trinity Episcopal Church", location="Princeton, NJ", info="Door combination: 5678"),
            Church(name="Dutch Neck Presbyterian Church", location="Dutch Neck, NJ"),
            Church(name="Abiding Presence Lutheran Church", location="Ewing, NJ", info="Door combination: 91011"),
            Church(name="Princeton University Chapel", location="Princeton, NJ", info="Door combination: 121314"),
        ]
        db.bulk_save_objects(pieces + churches)
        gig = Gig(date=date(2024, 12, 24), church_id=1, fee=100.0)
        db.add(gig)
        db.commit()  # Ensure gig has an ID before creating GigPiece
        db.refresh(gig)  # Refresh to get the ID
        gig_pieces = [GigPiece(gig_id=gig.id, piece_id=1, role="PRELUDE"),
                        GigPiece(gig_id=gig.id, piece_id=2, role="POSTLUDE")]
        for p in gig_pieces:
            db.add(p)
        db.commit()
        print("Sample data populated.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    populate_sample_data()

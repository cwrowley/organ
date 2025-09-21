import os
from datetime import date

from models import Base, Church, Gig, GigPiece, Piece
from session import DATABASE_PATH, SessionLocal, engine


def init_db():
    # Ensure the database directory exists
    db_dir = os.path.dirname(DATABASE_PATH)
    if db_dir:  # Only create directory if there is a directory path
        os.makedirs(db_dir, exist_ok=True)

    Base.metadata.create_all(bind=engine)
    print(f"Database tables created at: {DATABASE_PATH}")

def populate_sample_data():
    db = SessionLocal()
    try:
        pieces = [
            Piece(title="Prelude in C, BWV 547", composer="Bach, J.S.", duration=315),
            Piece(title="Fugue in C, BWV 547", composer="Bach, J.S.", duration=300),
            Piece(title="Prelude in a, BWV 543", composer="Bach, J.S.", duration=195),
            Piece(title="Fugue in a, BWV 543", composer="Bach, J.S.", duration=345),
            Piece(title="Prelude in A, BWV 536", composer="Bach, J.S."),
            Piece(title="Ich ruf' zu dir, Herr Jesu Christ", composer="Bach, J.S.", duration=250, notes="Orgelbüchlein, #40, p124"),
            Piece(title="Mein Jesu, der du mich", composer="Brahms, Johannes", duration=280, notes="#1 in Eleven Chorale Preludes, Op 122"),
            Piece(title="O wie seilig seid ihr doch, ihr Frommen", composer="Brahms, Johannes", duration=75, notes="#6 in Eleven Chorale Preludes, Op 122"),
            Piece(title="Es ist ein Ros' entsprungen", composer="Brahms, Johannes", duration=130, notes="#8 in Eleven Chorale Preludes, Op 122"),
            Piece(title="Psalm XIX", composer="Marcello, Benedetto", duration=250),
        ]
        churches = [
            Church(name="Princeton University Chapel", location="Princeton, NJ", info="Organ combination 03111"),
            Church(name="Trinity Episcopal Church", location="Princeton, NJ"),
            Church(name="Episcopal Church at Princeton", location="Princeton, NJ"),
            Church(name="Abiding Presence Lutheran Church", location="Ewing, NJ", info="Door combination: 6209#"),
            Church(name="All Saints Church", location="Princeton, NJ", info="Door combination: 0119"),
            Church(name="Dutch Neck Presbyterian Church", location="Dutch Neck, NJ"),
            Church(name="Doylestown Presbyterian Church", location="Doylestown, PA"),
            Church(name="Bound Brook Presbyterian Church", location="Bound Brook, NJ"),
        ]
        db.bulk_save_objects(pieces + churches)
        gig = Gig(date=date(2024, 12, 24), church_id=1, fee=1.0, occasion="Christmas Eve")
        db.add(gig)
        db.commit()  # Ensure gig has an ID before creating GigPiece
        db.refresh(gig)  # Refresh to get the ID
        gig_pieces = [GigPiece(gig_id=gig.id, piece_id=1, role="Prelude"),
                        GigPiece(gig_id=gig.id, piece_id=2, role="Postlude")]
        for p in gig_pieces:
            db.add(p)
        db.commit()
        print("Sample data populated.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    populate_sample_data()

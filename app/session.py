from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

__all__ = ["get_db", "SessionLocal"]

DATABASE_URL = "sqlite:///./app/organ_gigs.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


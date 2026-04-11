# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A dual-interface app for tracking organ music gigs, repertoire, and performances at churches. It has two separate clients — a web frontend and an Emacs frontend — both talking to a shared FastAPI backend.

## Commands

All backend commands should be run from the `backend/` subdirectory.

**Start the server:**
```bash
cd backend && uvicorn organ.main:app --host 0.0.0.0 --port 1685
# or
cd backend && python -m organ
```

**Initialize/reset the database with sample data:**
```bash
cd backend && python organ/init_db.py
```

**Install dependencies:**
```bash
cd backend && uv sync
```

There are no automated tests yet (see `backend/organ.org` for planned test fixtures).

## Architecture

The repo has two sub-projects:

### `backend/` — Python/FastAPI Backend + Web Frontend

- **`organ/main.py`** — FastAPI app, mounts routers and serves static files at `/static/`
- **`organ/models.py`** — SQLAlchemy ORM models (Piece, Church, Gig, GigPiece)
- **`organ/schemas.py`** — Pydantic v2 request/response schemas
- **`organ/session.py`** — SQLite database session config (db at `data/organ_gigs.db`)
- **`organ/routers/`** — CRUD routers for `pieces`, `churches`, `gigs`
- **`organ/static/`** — Vanilla JS web frontend (no build step)
  - `static/js/main.js` is the main ~1000-line app logic file
  - `static/js/modules/` contains `ApiService`, `GigManager`, `ChurchManager`, `FormManager`

**Data model:**
```
Church ←── Gig ──→ GigPiece (role: Prelude|Offertory|Postlude|Other) ←── Piece
```

Cascading deletes: removing a Gig deletes its GigPiece join records.

No migrations tool — schema is created directly via SQLAlchemy on init.

### `organ-emacs/` — Emacs Lisp Frontend

- **`organ.el`** — Main entry point, transient menu (prefix: `C-c o`)
- **`organ-api.el`** — HTTP client wrapper around the `request` library
- **`organ-gigs.el`** — Gig list/edit UI using `tablist`
- **`organ-pieces.el`** / **`organ-churches.el`** — Piece/church selection with in-memory caching

The Emacs frontend caches pieces and churches locally to reduce API calls.

## Key Details

- Port **1685** (Johann Sebastian Bach's birth year)
- Python **3.13**, managed with `uv`
- Emacs package deps: `tablist`, `request`, `transient`
- The web frontend is served from FastAPI's static file mount — no separate dev server needed

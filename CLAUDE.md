# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A dual-interface app for tracking organ music gigs, repertoire, and performances at churches. It has two separate clients — a web frontend (SvelteKit) and an Emacs frontend — both talking to a shared FastAPI backend.

## Commands

**Start the backend** (from `backend/`):
```bash
cd backend && uvicorn organ.main:app --host 0.0.0.0 --port 1685
# or
cd backend && python -m organ
```

**Run the frontend dev server** (from `frontend/`):
```bash
cd frontend && npm run dev   # Vite at http://localhost:5173, proxies /api → :1685
```

**Build the frontend** (writes into `backend/organ/static/`):
```bash
cd frontend && npm run build
```

**Initialize/reset the database with sample data:**
```bash
cd backend && python organ/init_db.py
```

**Install dependencies:**
```bash
cd backend && uv sync
cd frontend && npm install
```

There are no automated tests yet (see `backend/organ.org` for planned test fixtures).

## Architecture

The repo has three sub-projects:

### `backend/` — Python/FastAPI Backend

- **`organ/main.py`** — FastAPI app. API routes under `/api/`; any other path falls through to a catch-all that serves the built SPA from `organ/static/` (so client-side routes work on hard refresh).
- **`organ/auth.py`** — Bearer-token auth via `ORGAN_API_KEY` env var.
- **`organ/models.py`** — SQLAlchemy ORM models (Piece, Church, Gig, GigPiece)
- **`organ/schemas.py`** — Pydantic v2 request/response schemas
- **`organ/session.py`** — SQLite database session config (db at `data/organ_gigs.db`)
- **`organ/routers/`** — CRUD routers for `pieces`, `churches`, `gigs` (mounted under `/api/`)
- **`organ/static/`** — built SPA output, populated by `cd frontend && npm run build`. Don't edit by hand.

### `frontend/` — SvelteKit Web Frontend

- **Stack:** SvelteKit 2 + Svelte 5 (runes) + TypeScript + Tailwind, built as a static SPA via `@sveltejs/adapter-static` with `fallback: 'index.html'`. Output goes to `backend/organ/static/`.
- **`src/lib/api.ts`** — fetch wrapper, attaches `Authorization: Bearer <key>` from localStorage; on 401 it clears the key, which surfaces the login screen via the layout.
- **`src/lib/auth.ts`** — `apiKey` writable store backed by localStorage (`organ_api_key`).
- **`src/lib/types.ts`** — TS mirrors of the Pydantic schemas. Keep in sync if backend schemas change.
- **`src/lib/GigForm.svelte`** — shared form used by `gigs/new` and `gigs/[id]/edit`.
- **`src/routes/+layout.svelte`** — auth gate (prompts for API key) + nav.
- **Routes:** `/` (gig list, upcoming/past split), `/gigs/[id]`, `/gigs/new`, `/gigs/[id]/edit`, `/pieces`, `/churches`.
- **Dev workflow:** Vite dev server on `:5173` proxies `/api` to `:1685`. Production: FastAPI serves the built SPA at `:1685`.

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
- API requires `ORGAN_API_KEY` env var (Bearer token). Web frontend prompts for it on first load and stores in `localStorage`. Emacs/MCP read it from env or customize var.

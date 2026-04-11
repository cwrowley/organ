"""MCP server for the Organ Gigs database.

Exposes read-only tools so an LLM can answer questions like
"When is my next gig?" or "What pieces am I playing this month?"

Calls the running FastAPI backend (localhost:1685) rather than touching
the database directly, so all existing logic is reused.

Run via: uv run --directory /path/to/backend python -m organ.mcp_server
Claude Code launches this automatically as a subprocess (stdio transport).
"""

from datetime import date

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Organ Gigs")
BASE_URL = "http://localhost:1685"


@mcp.tool()
def list_gigs() -> str:
    """List all gigs with dates, churches, occasions, fees, and pieces (with roles).

    Returns every gig sorted by date, including today's date for reference.
    Use this to answer questions about upcoming gigs, past performances,
    repertoire at specific gigs, fees, etc.
    """
    response = httpx.get(f"{BASE_URL}/gigs/")
    response.raise_for_status()
    gigs = response.json()

    if not gigs:
        return "No gigs found."

    lines = [f"Today's date: {date.today().isoformat()}", ""]
    for gig in sorted(gigs, key=lambda g: g["date"]):
        lines.append(f"Date: {gig['date']}")
        lines.append(f"  Church: {gig['church']['name']}")
        if gig.get("location"):
            lines.append(f"  Location: {gig['church']['location']}")
        if gig.get("occasion"):
            lines.append(f"  Occasion: {gig['occasion']}")
        if gig.get("fee") is not None:
            lines.append(f"  Fee: ${gig['fee']:.2f}")
        if gig["gig_pieces"]:
            lines.append("  Pieces:")
            for gp in gig["gig_pieces"]:
                piece = gp["piece"]
                duration = f", {piece['duration']} min" if piece.get("duration") else ""
                lines.append(f"    [{gp['role']}] {piece['composer']} — {piece['title']}{duration}")
        lines.append("")

    return "\n".join(lines)


@mcp.tool()
def list_pieces() -> str:
    """List all pieces in the repertoire with composer, title, duration, and notes.

    Use this to answer questions about the repertoire, suggest pieces for a
    given occasion, find pieces by a specific composer, etc.
    """
    response = httpx.get(f"{BASE_URL}/pieces/")
    response.raise_for_status()
    pieces = response.json()

    if not pieces:
        return "No pieces found."

    lines = []
    for piece in pieces:
        line = f"{piece['composer']} — {piece['title']}"
        if piece.get("duration"):
            line += f" ({piece['duration']} min)"
        if piece.get("notes"):
            line += f"\n    Notes: {piece['notes']}"
        lines.append(line)

    return "\n".join(lines)


@mcp.tool()
def list_churches() -> str:
    """List all churches with names, locations, and miscellaneous info.

    Use this to answer questions about venues, locations, or church-specific
    details (e.g. door codes stored in the info field).
    """
    response = httpx.get(f"{BASE_URL}/churches/")
    response.raise_for_status()
    churches = response.json()

    if not churches:
        return "No churches found."

    lines = []
    for church in churches:
        line = church["name"]
        if church.get("location"):
            line += f"\n  Location: {church['location']}"
        if church.get("info"):
            line += f"\n  Info: {church['info']}"
        lines.append(line)

    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run()

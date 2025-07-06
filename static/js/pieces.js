document.addEventListener("DOMContentLoaded", () => {
    fetchChurchesForMap();
    fetchPieces();
    document.getElementById('add-piece-form').addEventListener('submit', addPiece);
});

let churchMap = {};

function fetchChurchesForMap() {
    fetch('/churches/')
        .then(response => response.json())
        .then(churches => {
            churchMap = {};
            churches.forEach(church => {
                churchMap[church.id] = church.name;
            });
        })
        .catch(error => console.error('Error fetching churches:', error));
}

function fetchPieces() {
    fetch('/pieces/')
        .then(response => response.json())
        .then(pieces => {
            const tableBody = document.getElementById('pieces-table-body');
            tableBody.innerHTML = '';
            pieces.forEach(piece => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${piece.composer}</td>
                    <td><a href="#" onclick="showPieceGigs(${piece.id})">${piece.title}</a></td>
                    <td>${piece.duration || ''}</td>
                    <td><button onclick="editPiece(${piece.id}, '${piece.title}', '${piece.composer}', ${piece.duration || 0})">Edit</button></td>
                `;
                tableBody.appendChild(row);
            });
            populateComposerAutocomplete(pieces);
        })
        .catch(error => console.error('Error fetching pieces:', error));
}

function addPiece(event) {
    event.preventDefault();
    const title = document.getElementById('piece-title').value;
    const composer = document.getElementById('piece-composer').value;
    const duration = document.getElementById('piece-duration').value;

    fetch('/pieces/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, composer, duration }),
    })
    .then(response => response.json())
    .then(() => {
        fetchPieces();
        event.target.reset();
    })
    .catch(error => console.error('Error adding piece:', error));
}

function editPiece(id, title, composer, duration) {
    const tableBody = document.getElementById('pieces-table-body');
    const rows = [...tableBody.rows];
    const rowIndex = rows.findIndex(row => row.cells[1].textContent === title);
    const row = tableBody.rows[rowIndex];

    row.innerHTML = `
        <td><input type="text" id="edit-composer-${id}" value="${composer}"></td>
        <td><input type="text" id="edit-title-${id}" value="${title}"></td>
        <td><input type="number" id="edit-duration-${id}" value="${duration}"></td>
        <td><button onclick="savePiece(${id})">Save</button></td>
    `;
}

function savePiece(id) {
    const title = document.getElementById(`edit-title-${id}`).value;
    const composer = document.getElementById(`edit-composer-${id}`).value;
    const duration = parseInt(document.getElementById(`edit-duration-${id}`).value);

    fetch(`/pieces/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, composer, duration }),
    })
    .then(response => response.json())
    .then(() => fetchPieces())
    .catch(error => console.error('Error updating piece:', error));
}

function showPieceGigs(pieceId) {
    fetch(`/pieces/${pieceId}/gigs`)
        .then(response => response.json())
        .then(gigs => {
            const gigsList = document.getElementById('piece-gigs-list');
            gigsList.innerHTML = '';
            if (gigs.length === 0) {
                gigsList.innerHTML = '<li>No gigs found for this piece.</li>';
                return;
            }
            // Sort gigs by date
            gigs.sort((a, b) => new Date(b.date) - new Date(a.date));
            gigs.forEach(gig => {
                const churchName = churchMap[gig.church_id] || `Church ID ${gig.church_id}`;
                const formattedDate = new Date(gig.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const li = document.createElement('li');
                li.textContent = `${formattedDate} at ${churchName}`;
                gigsList.appendChild(li);
            });
        })
        .catch(error => console.error('Error fetching gigs for piece:', error));
}

function populateComposerAutocomplete(pieces) {
    const composerSet = new Set();
    pieces.forEach(piece => {
        if (piece.composer) {
            composerSet.add(piece.composer);
        }
    });
    const datalist = document.getElementById('composer-list');
    datalist.innerHTML = '';
    composerSet.forEach(composer => {
        const option = document.createElement('option');
        option.value = composer;
        datalist.appendChild(option);
    });
}
document.addEventListener("DOMContentLoaded", () => {
    fetchChurches();
    fetchPieces();

    document.getElementById('add-church-form').addEventListener('submit', addChurch);
    document.getElementById('add-piece-form').addEventListener('submit', addPiece);
});

function fetchChurches() {
    fetch('/churches/')
        .then(response => response.json())
        .then(churches => {
            const churchesList = document.getElementById('churches-list');
            churchesList.innerHTML = '';
            churches.forEach(church => {
                const li = document.createElement('li');
                li.textContent = `${church.name} - ${church.location}`;
                churchesList.appendChild(li);
            });
        })
        .catch(error => console.error('Error fetching churches:', error));
}

function fetchPieces() {
    fetch('/pieces/')
        .then(response => response.json())
        .then(pieces => {
            const piecesList = document.getElementById('pieces-list');
            piecesList.innerHTML = '';
            pieces.forEach(piece => {
                const li = document.createElement('li');
                li.textContent = `${piece.composer} - ${piece.title}`;
                piecesList.appendChild(li);
            });
        })
        .catch(error => console.error('Error fetching pieces:', error));
}

function addChurch(event) {
    event.preventDefault();
    const name = document.getElementById('church-name').value;
    const location = document.getElementById('church-location').value;
    const info = document.getElementById('church-info').value;

    fetch('/churches/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, location, info }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        fetchChurches(); // Refresh the list
    })
    .catch(error => console.error('Error adding church:', error));
}

function addPiece(event) {
    event.preventDefault();
    const title = document.getElementById('piece-title').value;
    const composer = document.getElementById('piece-composer').value;
    const duration = document.getElementById('piece-duration').value;

    fetch('/pieces/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, composer, duration }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        fetchPieces(); // Refresh the list
    })
    .catch(error => console.error('Error adding piece:', error));
}
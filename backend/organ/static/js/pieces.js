document.addEventListener("DOMContentLoaded", async () => {
    await initializeChurchMap();
    await fetchPieces();
    setupPieceSearch();
    document.getElementById('add-piece-form').addEventListener('submit', addPiece);
});

let currentlySelectedRow = null;

async function fetchPieces() {
    try {
        const pieces = await fetchData('/pieces/');
        const tableBody = document.getElementById('pieces-table-body');
        tableBody.innerHTML = '';
        
        pieces.forEach(piece => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${piece.composer}</td>
                <td>${piece.title}</td>
                <td>${piece.duration || ''}</td>
                <td><button onclick="editPiece(${piece.id}, '${piece.title}', '${piece.composer}', ${piece.duration || 0})">Edit</button></td>
            `;
            row.setAttribute('tabindex', '0'); // Make row focusable
            row.dataset.pieceId = piece.id;
            row.dataset.title = piece.title;
            row.dataset.composer = piece.composer;

            row.addEventListener('click', () => {
                showPieceGigs(piece.id, piece.title, piece.composer, row);
            });

            tableBody.appendChild(row);
        });
        
        createComposerAutocomplete(pieces, 'composer-list');
    } catch (error) {
        console.error('Error fetching pieces:', error);
    }
}

async function addPiece(event) {
    event.preventDefault();
    const title = document.getElementById('piece-title').value;
    const composer = document.getElementById('piece-composer').value;
    const duration = document.getElementById('piece-duration').value;

    const pieceData = { title, composer };
    if (duration) {
        pieceData.duration = parseInt(duration);
    }

    try {
        await postData('/pieces/', pieceData);
        await fetchPieces();
        event.target.reset();
    } catch (error) {
        console.error('Error adding piece:', error);
    }
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

async function savePiece(id) {
    const title = document.getElementById(`edit-title-${id}`).value;
    const composer = document.getElementById(`edit-composer-${id}`).value;
    const duration = parseInt(document.getElementById(`edit-duration-${id}`).value);

    try {
        await putData(`/pieces/${id}`, { title, composer, duration });
        await fetchPieces();
    } catch (error) {
        console.error('Error updating piece:', error);
    }
}

async function showPieceGigs(pieceId, title = '', composer = '', clickedRow = null) {
    try {
        const gigs = await fetchData(`/pieces/${pieceId}/gigs`);
        const gigsList = document.getElementById('piece-gigs-list');
        const heading = document.getElementById('piece-heading');

        // Update heading to include piece title
        heading.textContent = `${title}, by ${composer}`;

        // Scroll to the gigs section
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Highlight the selected row
        if (currentlySelectedRow) {
            currentlySelectedRow.classList.remove('selected-row');
        }
        if (clickedRow) {
            const row = clickedRow.closest('tr');
            row.classList.add('selected-row');
            currentlySelectedRow = row;
        }

        // Populate the gigs list
        gigsList.innerHTML = '';
        if (gigs.length === 0) {
            gigsList.innerHTML = '<li>No gigs found for this piece.</li>';
            return;
        }
        
        // Sort gigs by date
        gigs.sort((a, b) => new Date(b.date) - new Date(a.date));
        gigs.forEach(gig => {
            const churchName = getChurchName(gig.church_id);
            const formattedDate = formatDate(gig.date);
            const li = document.createElement('li');
            li.textContent = `${formattedDate} at ${churchName}`;
            gigsList.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching gigs for piece:', error);
    }
}

// Add keyboard navigation for the pieces table
document.addEventListener('keydown', (event) => {
    const activeElement = document.activeElement;
    const isTyping = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';

    // Don't trigger shortcuts when typing in inputs
    if (isTyping) return;

    const rows = [...document.querySelectorAll('#pieces-table-body tr')].filter(row => row.style.display !== 'none');
    if (rows.length === 0) return;

    const focusedIndex = rows.findIndex(row => row.classList.contains('keyboard-focus'));
    let newIndex = focusedIndex;

    if (event.key == 'ArrowDown') {
        newIndex = (focusedIndex + 1) % rows.length;
    } else if (event.key == 'ArrowUp') {
        newIndex = (focusedIndex - 1 + rows.length) % rows.length;
    } else if (event.key == 'Enter' && focusedIndex !== -1) {
        const row = rows[focusedIndex];
        const {pieceId, title, composer} = row.dataset;
        showPieceGigs(pieceId, title, composer, row.querySelector('a'));
        return;
    } else if (event.key.toLowerCase() === 'a' && !event.ctrlKey && !event.metaKey) {
        // Jump to Add Piece form
        const titleInput = document.getElementById('piece-title');
        if (titleInput) {
            titleInput.focus();
            event.preventDefault();
        }
        return;
    } else {
        return; // Ignore other keys
    }

    event.preventDefault();
    if (focusedIndex !== -1) {
        rows[focusedIndex].classList.remove('keyboard-focus');
    }
    rows[newIndex].classList.add('keyboard-focus');
    rows[newIndex].focus();
});

document.addEventListener('click', () => {
    document.querySelectorAll('.keyboard-focus').forEach(row => {
        row.classList.remove('keyboard-focus');
    });
});

function setupPieceSearch() {
    const searchInput = document.getElementById('piece-search');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('#pieces-table-body tr');

        rows.forEach(row => {
            const composer = row.dataset.composer.toLowerCase();
            const title = row.dataset.title.toLowerCase();
            const matches = composer.includes(query) || title.includes(query);
            row.style.display = matches ? '' : 'none';
        });
    });
}
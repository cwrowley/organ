let pieces = null;

async function fetchOptions(endpoint) {
    const response = await fetch(endpoint);
    return response.json();
}

async function populateOptions() {
    const churches = await fetchOptions('/churches/');
    pieces = await fetchOptions('/pieces/');
    
    const churchSelect = document.getElementById('church');
    churches.forEach(church => {
        const option = document.createElement('option');
        option.value = church.id;
        option.textContent = church.name;
        churchSelect.appendChild(option);
    });

    const pieceSelect = document.querySelector('.piece');
    populatePieceOptions(pieceSelect);

    const roleSelect = document.querySelector('.role');
    populateRoleOptions(roleSelect);
}

function populatePieceOptions(select) {
    pieces.forEach(piece => {
        const option = document.createElement('option');
        option.value = piece.id;
        option.textContent = `${piece.composer} - ${piece.title}`;
        select.appendChild(option);
    });
}

function populateRoleOptions(select) {
    const roles = ['Prelude', 'Offertory', 'Postlude', 'Other'];
    roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        select.appendChild(option);
    });
}

function addPiece() {
    const piecesContainer = document.getElementById('pieces-container');
    const pieceCount = piecesContainer.children.length + 1;

    const pieceRolePair = document.createElement('div');
    pieceRolePair.classList.add('piece-role-pair');

    pieceRolePair.innerHTML = `
        <label>Piece ${pieceCount}:</label>
        <select class="piece">
            <option value="" disabled selected>Select a piece</option>
            <!-- Options will be populated by JavaScript -->
        </select>
        <select class="role">
            <option value="" disabled selected>Select a role</option>
            <!-- Options will be populated by JavaScript -->
        </select><br>
    `;

    piecesContainer.appendChild(pieceRolePair);

    // Populate the new select element with options
    const pieceSelect = pieceRolePair.querySelector('.piece');
    populatePieceOptions(pieceSelect);
    const roleSelect = pieceRolePair.querySelector('.role');
    populateRoleOptions(roleSelect);
}

async function addGig() {
    const gig_pieces = [];
    const pieceRolePairs = document.querySelectorAll('.piece-role-pair');

    pieceRolePairs.forEach(pair => {
        const pieceValue = pair.querySelector('.piece').value;
        const roleValue = pair.querySelector('.role').value;

        if (pieceValue && roleValue) {
            gig_pieces.push({
                piece_id: parseInt(pieceValue),
                role: roleValue
            });
        }
    });

    const gigData = {
        date: document.getElementById('date').value,
        church_id: parseInt(document.getElementById('church').value),
        fee: parseFloat(document.getElementById('fee').value),
        pieces: gig_pieces
    };

    const response = await fetch('/gigs/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(gigData)
    });

    const result = await response.json();
    console.log(result)

    if (response.ok) {
        alert('Gig added successfully!');
    } else {
        alert('Error adding gig: ' + result.detail);
    }
}

window.onload = populateOptions;

document.addEventListener("DOMContentLoaded", async () => {
    await initializeChurchMap();
    fetchChurches();
    fetchPieces();
    fetchGigs();

    document.getElementById('add-church-form').addEventListener('submit', addChurch);
    document.getElementById('add-gig-form').addEventListener('submit', addGig);
    document.getElementById('add-piece-form').addEventListener('submit', addPiece);
    
    // Populate composer autocomplete
    await populateComposerAutocomplete();
});

async function fetchChurches() {
    try {
        const churches = await fetchData('/churches/');
        const tableBody = document.getElementById('churches-table-body');
        tableBody.innerHTML = '';
        churches.forEach(church => {
            const row = document.createElement('tr');
            row.className = 'church-row';
            row.dataset.churchId = church.id;
            row.setAttribute('tabindex', '0'); // Make row focusable
            row.innerHTML = `
                <td>${church.name}</td>
                <td>${church.location || ''}</td>
                <td>${church.info || ''}</td>
                <td><button onclick="editChurch(${church.id}, '${church.name}', '${church.location || ''}', '${church.info || ''}')">Edit</button></td>
            `;
            
            // Add click event listener to the row
            row.addEventListener('click', (event) => {
                // Don't trigger row selection if user clicked the Edit button
                if (event.target.tagName === 'BUTTON') {
                    return;
                }
                selectChurch(row, church.id);
            });
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching churches:', error);
    }
}

function editChurch(id, name, location, info) {
    const tableBody = document.getElementById('churches-table-body');
    const rows = [...tableBody.rows]
    const rowIndex = rows.findIndex(row => row.cells[0].textContent === name);
    const row = tableBody.rows[rowIndex];
    row.innerHTML = `
        <td><input type="text" id="edit-name-${id}" value="${name}"></td>
        <td><input type="text" id="edit-location-${id}" value="${location}"></td>
        <td><input type="text" id="edit-info-${id}" value="${info}"></td>
        <td><button onclick="updateChurch(${id})">Update</button></td>
    `;
    const oldRow = [...tableBody.children].find(td => td.textContent.includes(name));
    churchesList.replaceChild(row, oldRow);
}

async function updateChurch(id) {
    const name = document.getElementById(`edit-name-${id}`).value;
    const location = document.getElementById(`edit-location-${id}`).value;
    const info = document.getElementById(`edit-info-${id}`).value;

    try {
        await putData(`/churches/${id}`, { name, location, info });
        await fetchChurches(); // Refresh the list after update
        await initializeChurchMap(); // Update church map
    } catch (error) {
        console.error('Error updating church:', error);
    }
}

// Shared function to render gigs
function renderGigs(gigs) {
    const gigsContainer = document.getElementById('gigs-container');
    gigsContainer.innerHTML = '';
    
    if (gigs.length === 0) {
        gigsContainer.innerHTML = '<div class="no-gigs-message">No gigs found.</div>';
        return;
    }
    
    gigs.forEach(gig => {
        const gigCard = document.createElement('div');
        gigCard.className = 'gig-card';
        
        // Format pieces list
        let piecesHtml = '';
        if (gig.gig_pieces && gig.gig_pieces.length > 0) {
            piecesHtml = `
                <div class="gig-pieces">
                    <h4>Pieces</h4>
                    <ul class="pieces-list">
                        ${gig.gig_pieces.map(gigPiece => `
                            <li class="piece-item">
                                <span class="piece-composer">${gigPiece.piece.composer}</span>
                                <span class="piece-title">${gigPiece.piece.title}</span>
                                <span class="piece-role">${gigPiece.role}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        gigCard.innerHTML = `
            <div class="gig-header">
                <div>
                    <div class="gig-date">${formatDate(gig.date)}</div>
                    <div class="gig-church">${gig.church.name}</div>
                    ${gig.fee ? `<div class="gig-fee">$${gig.fee}</div>` : ''}
                </div>
                <div class="gig-right-info">
                    <button class="btn btn--primary btn--sm gig-edit-btn" onclick="editGig(${gig.id})">Edit</button>
                </div>
            </div>
            ${piecesHtml}
        `;
        
        gigsContainer.appendChild(gigCard);
    });
}

async function fetchGigs() {
    try {
        const gigs = await fetchData('/gigs/');
        renderGigs(gigs);
    } catch (error) {
        console.error('Error fetching gigs:', error);
    }
}

async function filterGigsByChurch(churchId) {
    try {
        const gigs = await fetchData(`/churches/${churchId}/gigs`);
        renderGigs(gigs);
    } catch (error) {
        console.error('Error fetching gigs for church:', error);
    }
}

async function fetchPieces() {
    try {
        const pieces = await fetchData('/pieces/');
        // Pieces are displayed on pieces.html, not main page
        // This function mainly updates the composer autocomplete
        createComposerAutocomplete(pieces, 'composer-list');
    } catch (error) {
        console.error('Error fetching pieces:', error);
    }
}

async function addChurch(event) {
    event.preventDefault();
    const name = document.getElementById('church-name').value;
    const location = document.getElementById('church-location').value;
    const info = document.getElementById('church-info').value;

    try {
        await postData('/churches/', { name, location, info });
        fetchChurches(); // Refresh the list
        await initializeChurchMap(); // Update church map
    } catch (error) {
        console.error('Error adding church:', error);
    }
}

async function addPiece(event) {
    event.preventDefault();
    const title = document.getElementById('piece-title').value;
    const composer = document.getElementById('piece-composer').value;
    const duration = document.getElementById('piece-duration').value;

    const pieceData = {
        title: title,
        composer: composer
    };
    
    // Only include duration if it's provided
    if (duration) {
        pieceData.duration = parseInt(duration);
    }

    try {
        const data = await postData('/pieces/', pieceData);
        
        // Clear the form
        document.getElementById('add-piece-form').reset();
        
        // Refresh the pieces in any open gig form dropdowns
        await refreshPieceDropdowns();
        
        // If the gig form is open, automatically select the new piece in the first available dropdown
        const gigFormContainer = document.getElementById('add-gig-form-container');
        if (gigFormContainer.style.display !== 'none') {
            selectNewPieceInGigForm(data.id);
        }
        
        // Update composer autocomplete
        await populateComposerAutocomplete();
        
        alert(`Piece "${composer} - ${title}" added successfully!`);
    } catch (error) {
        console.error('Error adding piece:', error);
        alert('Error adding piece. Please try again.');
    }
}

async function populateComposerAutocomplete() {
    try {
        const pieces = await fetchData('/pieces/');
        createComposerAutocomplete(pieces, 'composer-list');
    } catch (error) {
        console.error('Error fetching pieces for autocomplete:', error);
    }
}

async function refreshPieceDropdowns() {
    // Refresh all piece dropdowns in the gig form
    const pieceSelects = document.querySelectorAll('.piece-select');
    const promises = [];
    
    pieceSelects.forEach(select => {
        const currentValue = select.value; // Remember current selection
        const promise = populateSinglePieceDropdown(select).then(() => {
            // Restore selection if it still exists
            if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
                select.value = currentValue;
            }
        });
        promises.push(promise);
    });
    
    await Promise.all(promises);
}

function selectNewPieceInGigForm(newPieceId) {
    // Find the first empty piece dropdown and select the new piece
    const pieceSelects = document.querySelectorAll('.piece-select');
    for (const select of pieceSelects) {
        if (!select.value || select.value === '') {
            select.value = newPieceId;
            // Focus on the corresponding role dropdown
            const roleSelect = select.parentElement.querySelector('.role-select');
            if (roleSelect) {
                roleSelect.focus();
            }
            break;
        }
    }
}

// Helper function to scroll to the Add Gig form
function scrollToAddGigForm() {
    const addGigFormContainer = document.getElementById('add-gig-form-container');
    const addGigHeading = addGigFormContainer.querySelector('h3');
    if (addGigHeading) {
        addGigHeading.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    } else {
        // Fallback to scrolling to the container itself
        addGigFormContainer.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

function showAddGigForm() {
    document.getElementById('add-gig-form-container').style.display = 'block';
    
    // Clear any existing pieces from the form except the first one
    const container = document.getElementById('gig-pieces-container');
    container.innerHTML = `
        <div class="piece-role-pair">
            <label>Piece 1:</label>
            <select class="piece-select" required>
                <option value="" disabled selected>Select a piece</option>
            </select>
            <select class="role-select" required>
                <option value="" disabled selected>Select a role</option>
            </select>
            <button type="button" onclick="removePieceFromGig(this)">Remove</button>
        </div>
    `;
    
    // Populate dropdowns
    populateChurchDropdown();
    populatePieceDropdowns();
    populateRoleDropdowns();
    
    // Scroll to the form after it's visible
    setTimeout(() => {
        scrollToAddGigForm();
    }, 50);
}

function hideAddGigForm() {
    document.getElementById('add-gig-form-container').style.display = 'none';
    // Clear the form
    document.getElementById('add-gig-form').reset();
}

function addPieceToGig() {
    const container = document.getElementById('gig-pieces-container');
    const pieceCount = container.children.length + 1;
    const pieceDiv = document.createElement('div');
    pieceDiv.className = 'piece-role-pair';
    
    pieceDiv.innerHTML = `
        <label>Piece ${pieceCount}:</label>
        <select class="piece-select" required>
            <option value="" disabled selected>Select a piece</option>
        </select>
        <select class="role-select" required>
            <option value="" disabled selected>Select a role</option>
        </select>
        <button type="button" onclick="removePieceFromGig(this)">Remove</button>
    `;
    
    container.appendChild(pieceDiv);
    
    // Populate the new dropdowns
    populateSinglePieceDropdown(pieceDiv.querySelector('.piece-select'));
    populateSelectWithRoles(pieceDiv.querySelector('.role-select'));
}

async function populateSinglePieceDropdown(select) {
    try {
        const pieces = await fetchData('/pieces/');
        
        // Clear existing options except the first one
        select.innerHTML = '<option value="" disabled selected>Select a piece</option>';
        
        pieces.forEach(piece => {
            const option = document.createElement('option');
            option.value = piece.id;
            option.textContent = `${piece.composer} - ${piece.title}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching pieces for new dropdown:', error);
    }
}

// Helper function to get the valid roles from the backend enum
function getValidRoles() {
    return ['Prelude', 'Postlude', 'Offertory', 'Other'];
}

// Helper function to populate a single select element with role options
function populateSelectWithRoles(select) {
    const roles = getValidRoles();
    
    // Add the default option if it doesn't exist
    if (select.options.length === 0 || select.options[0].value !== '') {
        select.innerHTML = '<option value="" disabled selected>Select a role</option>';
    }
    
    roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        select.appendChild(option);
    });
}

function removePieceFromGig(button) {
    button.parentElement.remove();
}

async function addGig(event) {
    event.preventDefault();
    
    const date = document.getElementById('gig-date').value;
    const fee = parseFloat(document.getElementById('gig-fee').value) || 0;
    const churchId = parseInt(document.getElementById('gig-church').value);
    
    // Collect pieces data
    const pieceEntries = document.querySelectorAll('.piece-role-pair');
    const pieces = [];
    
    for (const entry of pieceEntries) {
        const pieceId = parseInt(entry.querySelector('.piece-select').value);
        const role = entry.querySelector('.role-select').value;
        
        if (pieceId && role) {
            pieces.push({
                piece_id: pieceId,
                role: role
            });
        }
    }
    
    const gigData = {
        date: date,
        church_id: churchId,
        fee: fee,
        pieces: pieces
    };
    
    try {
        await postData('/gigs/', gigData);
        
        // Hide the form and refresh the gigs list
        hideAddGigForm();
        filterGigsByChurch(churchId); // Refresh the filtered list
        
    } catch (error) {
        console.error('Error adding gig:', error);
        alert('Error adding gig. Please check the console for details.');
    }
}

function selectChurch(selectedRow, churchId) {
    // Remove highlight from all rows
    const allRows = document.querySelectorAll('.church-row');
    allRows.forEach(row => row.classList.remove('selected'));
    
    // Highlight the selected row
    selectedRow.classList.add('selected');
    
    // Filter gigs by the selected church
    filterGigsByChurch(churchId);
    
    // Scroll to the gigs section
    const gigsSection = document.querySelector('h2');
    const gigsHeaders = document.querySelectorAll('h2');
    let gigsH2 = null;
    
    // Find the "Gigs" h2 element
    gigsHeaders.forEach(header => {
        if (header.textContent.trim() === 'Gigs') {
            gigsH2 = header;
        }
    });
    
    if (gigsH2) {
        gigsH2.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

async function populateChurchDropdown() {
    try {
        const churches = await fetchData('/churches/');
        const churchSelect = document.getElementById('gig-church');
        
        // Clear existing options except the first one
        churchSelect.innerHTML = '<option value="" disabled selected>Select a church</option>';
        
        churches.forEach(church => {
            const option = document.createElement('option');
            option.value = church.id;
            option.textContent = church.name;
            churchSelect.appendChild(option);
        });
        
        // Set the selected church if one was chosen from the table
        const selectedChurchId = getSelectedChurchId();
        if (selectedChurchId) {
            churchSelect.value = selectedChurchId;
        }
    } catch (error) {
        console.error('Error fetching churches for form:', error);
    }
}

function getSelectedChurchId() {
    const selectedRow = document.querySelector('.church-row.selected');
    return selectedRow ? selectedRow.dataset.churchId : null;
}

async function populatePieceDropdowns() {
    try {
        const pieces = await fetchData('/pieces/');
        
        // Populate all piece select elements
        const pieceSelects = document.querySelectorAll('.piece-select');
        pieceSelects.forEach(select => {
            select.innerHTML = '<option value="" disabled selected>Select a piece</option>';
            pieces.forEach(piece => {
                const option = document.createElement('option');
                option.value = piece.id;
                option.textContent = `${piece.composer} - ${piece.title}`;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error fetching pieces for form:', error);
    }
}

function populateRoleDropdowns() {
    const roleSelects = document.querySelectorAll('.role-select');
    roleSelects.forEach(select => {
        populateSelectWithRoles(select);
    });
}

// Add keyboard navigation for the churches table
document.addEventListener('keydown', (event) => {
    const activeElement = document.activeElement;
    const isTyping = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT';

    // Don't trigger shortcuts when typing in inputs
    if (isTyping) return;

    const rows = [...document.querySelectorAll('#churches-table-body tr')];
    if (rows.length === 0) return;

    const focusedIndex = rows.findIndex(row => row.classList.contains('keyboard-focus'));
    let newIndex = focusedIndex;

    if (event.key === 'ArrowDown') {
        newIndex = (focusedIndex + 1) % rows.length;
        event.preventDefault();
    } else if (event.key === 'ArrowUp') {
        newIndex = (focusedIndex - 1 + rows.length) % rows.length;
        event.preventDefault();
    } else if (event.key === 'Enter' && focusedIndex !== -1) {
        const row = rows[focusedIndex];
        const churchId = row.dataset.churchId;
        selectChurch(row, churchId);
        event.preventDefault();
        return;
    } else if (event.key.toLowerCase() === 'p' && !event.ctrlKey && !event.metaKey) {
        // Jump to Add Piece form
        const titleInput = document.getElementById('piece-title');
        if (titleInput) {
            titleInput.focus();
            event.preventDefault();
        }
        return;
    } else if (event.key.toLowerCase() === 'g' && !event.ctrlKey && !event.metaKey) {
        // Jump to Add Gig form
        const addGigFormContainer = document.getElementById('add-gig-form-container');
        const addGigBtn = document.getElementById('add-gig-btn');
        
        if (addGigFormContainer && addGigBtn) {
            // Make sure the form is visible
            if (addGigFormContainer.style.display === 'none') {
                addGigBtn.click(); // This will show the form
            }
            
            // Wait a moment for the form to be visible, then scroll to it
            setTimeout(() => {
                scrollToAddGigForm();
            }, 50);
            
            event.preventDefault();
        }
        return;
    } else {
        return; // Ignore other keys
    }

    // Update keyboard focus
    if (focusedIndex !== -1) {
        rows[focusedIndex].classList.remove('keyboard-focus');
    }
    rows[newIndex].classList.add('keyboard-focus');
    rows[newIndex].focus();
});

// Remove keyboard focus when clicking elsewhere
document.addEventListener('click', () => {
    document.querySelectorAll('.keyboard-focus').forEach(row => {
        row.classList.remove('keyboard-focus');
    });
});

// Additional helper functions for gig functionality
function editGig(gigId) {
    // TODO: Implement gig editing functionality
    console.log('Edit gig:', gigId);
    alert('Gig editing functionality not yet implemented');
}

function toggleShowAllGigs() {
    // TODO: Implement show all gigs functionality
    console.log('Toggle show all gigs');
    fetchGigs(); // For now, just refresh all gigs
}

function loadMoreGigs() {
    // TODO: Implement pagination/load more functionality
    console.log('Load more gigs');
    alert('Load more gigs functionality not yet implemented');
}
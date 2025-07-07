// Common utilities and shared functions

// API utility functions
async function fetchData(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data from ${endpoint}:`, error);
        throw error;
    }
}

async function postData(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error posting data to ${endpoint}:`, error);
        throw error;
    }
}

async function putData(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating data at ${endpoint}:`, error);
        throw error;
    }
}

// Shared piece-related functions
function createComposerAutocomplete(pieces, datalistId) {
    const composerSet = new Set();
    pieces.forEach(piece => {
        if (piece.composer) {
            composerSet.add(piece.composer);
        }
    });
    
    const datalist = document.getElementById(datalistId);
    datalist.innerHTML = '';
    composerSet.forEach(composer => {
        const option = document.createElement('option');
        option.value = composer;
        datalist.appendChild(option);
    });
}

// Date formatting utility
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Church mapping utility
let globalChurchMap = {};

async function initializeChurchMap() {
    try {
        const churches = await fetchData('/churches/');
        globalChurchMap = {};
        churches.forEach(church => {
            globalChurchMap[church.id] = church.name;
        });
        return globalChurchMap;
    } catch (error) {
        console.error('Error initializing church map:', error);
        return {};
    }
}

function getChurchName(churchId) {
    return globalChurchMap[churchId] || `Church ID ${churchId}`;
}

// Role enum conversion utility
function roleEnumToDisplayString(roleEnum) {
    const roleMap = {
        'PRELUDE': 'Prelude',
        'OFFERTORY': 'Offertory',
        'POSTLUDE': 'Postlude',
        'OTHER': 'Other'
    };
    
    return roleMap[roleEnum] || roleEnum;
}

// Helper function to get all valid roles with their display strings
function getValidRoles() {
    return [
        { value: 'PRELUDE', label: 'Prelude' },
        { value: 'POSTLUDE', label: 'Postlude' },
        { value: 'OFFERTORY', label: 'Offertory' },
        { value: 'OTHER', label: 'Other' }
    ];
}

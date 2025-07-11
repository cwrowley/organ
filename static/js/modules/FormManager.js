// Form Management Module
import ApiService from './ApiService.js';
import { showNotification, validateForm, getFormData, populateSelect } from './UIHelpers.js';

class FormManager {
    constructor() {
        this.activeForm = null;
        this.pieces = [];
        this.churches = [];
    }

    async init() {
        await this.loadFormData();
        this.setupEventListeners();
    }

    async loadFormData() {
        try {
            [this.pieces, this.churches] = await Promise.all([
                ApiService.get('/pieces/'),
                ApiService.get('/churches/')
            ]);
        } catch (error) {
            console.error('Error loading form data:', error);
            showNotification('Failed to load form data', 'error');
        }
    }

    setupEventListeners() {
        // Add piece form
        this.setupAddPieceForm();
        
        // Add gig form
        this.setupAddGigForm();

        // Form visibility toggles
        this.setupFormToggles();
    }

    setupAddPieceForm() {
        const form = document.getElementById('add-piece-form');
        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const validation = validateForm(form);
            if (!validation.isValid) {
                showNotification(validation.errors.join(', '), 'error');
                return;
            }

            const formData = getFormData(form);
            const pieceData = {
                title: formData.title,
                composer: formData.composer
            };

            if (formData.duration) {
                pieceData.duration = parseInt(formData.duration);
            }

            try {
                const newPiece = await ApiService.post('/pieces/', pieceData);
                form.reset();
                this.pieces.push(newPiece);
                
                showNotification(`Piece "${pieceData.composer} - ${pieceData.title}" added successfully!`, 'success');
                
                // Update any open gig forms
                this.refreshPieceDropdowns();
                
            } catch (error) {
                console.error('Error adding piece:', error);
                showNotification('Failed to add piece', 'error');
            }
        });

        // Setup composer autocomplete
        this.setupComposerAutocomplete();
    }

    setupAddGigForm() {
        const form = document.getElementById('add-gig-form');
        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const gigData = this.collectGigFormData(form);
            if (!gigData) return;

            try {
                await ApiService.post('/gigs/', gigData);
                this.hideGigForm();
                showNotification('Gig added successfully!', 'success');
                
                // Trigger refresh of gigs list
                if (this.onGigAdded) {
                    this.onGigAdded(gigData.church_id);
                }
                
            } catch (error) {
                console.error('Error adding gig:', error);
                showNotification('Failed to add gig', 'error');
            }
        });
    }

    setupFormToggles() {
        const showGigFormBtn = document.getElementById('add-gig-btn');
        if (showGigFormBtn) {
            showGigFormBtn.addEventListener('click', () => this.showGigForm());
        }

        const hideGigFormBtn = document.getElementById('cancel-gig-btn');
        if (hideGigFormBtn) {
            hideGigFormBtn.addEventListener('click', () => this.hideGigForm());
        }

        const addPieceRowBtn = document.getElementById('add-piece-row');
        if (addPieceRowBtn) {
            addPieceRowBtn.addEventListener('click', () => this.addPieceRow());
        }
    }

    setupComposerAutocomplete() {
        const composerInput = document.getElementById('piece-composer');
        const datalist = document.getElementById('composer-list');
        
        if (!composerInput || !datalist) return;

        const composers = new Set();
        this.pieces.forEach(piece => {
            if (piece.composer) composers.add(piece.composer);
        });

        datalist.innerHTML = '';
        composers.forEach(composer => {
            const option = document.createElement('option');
            option.value = composer;
            datalist.appendChild(option);
        });
    }

    showGigForm() {
        const formContainer = document.getElementById('add-gig-form-container');
        if (!formContainer) return;

        formContainer.style.display = 'block';
        this.resetGigForm();
        this.populateGigFormDropdowns();
        
        // Hide any inline edit forms
        this.cancelInlineEdits();
    }

    hideGigForm() {
        const formContainer = document.getElementById('add-gig-form-container');
        if (formContainer) {
            formContainer.style.display = 'none';
        }
        
        const form = document.getElementById('add-gig-form');
        if (form) {
            form.reset();
        }
    }

    resetGigForm() {
        const container = document.getElementById('gig-pieces-container');
        if (!container) return;

        container.innerHTML = `
            <div class="form-piece-row">
                <select class="piece-select" required>
                    <option value="" disabled selected>Select a piece</option>
                </select>
                <select class="role-select" required>
                    <option value="" disabled selected>Select a role</option>
                </select>
                <button type="button" class="remove-piece-btn">Remove</button>
            </div>
        `;

        // Setup remove button
        container.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-piece-btn')) {
                this.removePieceRow(event.target);
            }
        });
    }

    async populateGigFormDropdowns() {
        // Populate church dropdown
        const churchSelect = document.getElementById('gig-church');
        if (churchSelect) {
            await populateSelect(churchSelect, this.churches, {
                placeholder: 'Select a church'
            });
        }

        // Populate piece and role dropdowns
        this.refreshAllDropdowns();
    }

    refreshAllDropdowns() {
        const pieceSelects = document.querySelectorAll('.piece-select');
        const roleSelects = document.querySelectorAll('.role-select');

        pieceSelects.forEach(select => {
            this.populatePieceSelect(select);
        });

        roleSelects.forEach(select => {
            this.populateRoleSelect(select);
        });
    }

    populatePieceSelect(select) {
        const currentValue = select.value;
        const options = this.pieces.map(piece => ({
            id: piece.id,
            name: `${piece.composer} - ${piece.title}`
        }));

        populateSelect(select, options, {
            placeholder: 'Select a piece',
            selectedValue: currentValue
        });
    }

    populateRoleSelect(select) {
        const currentValue = select.value;
        const roles = [
            { id: 'PRELUDE', name: 'Prelude' },
            { id: 'POSTLUDE', name: 'Postlude' },
            { id: 'OFFERTORY', name: 'Offertory' },
            { id: 'OTHER', name: 'Other' }
        ];

        populateSelect(select, roles, {
            placeholder: 'Select a role',
            selectedValue: currentValue
        });
    }

    addPieceRow() {
        const container = document.getElementById('gig-pieces-container');
        if (!container) return;

        const pieceRow = document.createElement('div');
        pieceRow.className = 'form-piece-row';
        
        pieceRow.innerHTML = `
            <select class="piece-select" required>
                <option value="" disabled selected>Select a piece</option>
            </select>
            <select class="role-select" required>
                <option value="" disabled selected>Select a role</option>
            </select>
            <button type="button" class="remove-piece-btn">Remove</button>
        `;

        container.appendChild(pieceRow);

        // Populate the new dropdowns
        this.populatePieceSelect(pieceRow.querySelector('.piece-select'));
        this.populateRoleSelect(pieceRow.querySelector('.role-select'));
    }

    removePieceRow(button) {
        const row = button.closest('.form-piece-row');
        if (row) {
            row.remove();
        }
    }

    collectGigFormData(form) {
        const formData = getFormData(form);
        
        // Collect pieces data
        const pieceRows = form.querySelectorAll('.form-piece-row');
        const pieces = [];

        for (const row of pieceRows) {
            const pieceId = row.querySelector('.piece-select').value;
            const role = row.querySelector('.role-select').value;

            if (pieceId && role) {
                pieces.push({
                    piece_id: parseInt(pieceId),
                    role: role
                });
            }
        }

        if (pieces.length === 0) {
            showNotification('Please select at least one piece', 'error');
            return null;
        }

        return {
            date: formData.date,
            church_id: parseInt(formData.church),
            fee: parseFloat(formData.fee) || 0,
            pieces: pieces
        };
    }

    refreshPieceDropdowns() {
        // Refresh piece dropdowns in any open forms
        this.refreshAllDropdowns();
        this.setupComposerAutocomplete();
    }

    cancelInlineEdits() {
        const editingCards = document.querySelectorAll('.gig-card--editing');
        editingCards.forEach(card => {
            const cancelButton = card.querySelector('[data-action="cancel"]');
            if (cancelButton) {
                cancelButton.click();
            }
        });
    }

    // Callback for when gig is added
    onGigAdded(callback) {
        this.onGigAdded = callback;
    }
}

export default FormManager;

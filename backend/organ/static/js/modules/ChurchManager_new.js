// Church Management Module
import ApiService from './ApiService.js';
import { showNotification } from './UIHelpers.js';

class ChurchManager {
    constructor() {
        this.churches = [];
        this.selectedChurchId = null;
        this.churchSelectedCallback = null;
    }

    async init() {
        await this.loadChurches();
        this.setupEventListeners();
        this.setupKeyboardNavigation();
    }

    async loadChurches() {
        try {
            this.churches = await ApiService.get('/churches/');
            this.renderChurchTable();
        } catch (error) {
            console.error('Error loading churches:', error);
            showNotification('Failed to load churches', 'error');
        }
    }

    renderChurchTable() {
        const tableBody = document.getElementById('churches-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        
        this.churches.forEach(church => {
            const row = this.createChurchRow(church);
            tableBody.appendChild(row);
        });
    }

    createChurchRow(church) {
        const row = document.createElement('tr');
        row.className = 'church-row';
        row.dataset.churchId = church.id;
        row.setAttribute('tabindex', '0');
        row.style.cursor = 'pointer';
        
        row.innerHTML = `
            <td>${church.name}</td>
            <td>${church.location || ''}</td>
        `;

        return row;
    }

    setupEventListeners() {
        const tableBody = document.getElementById('churches-table-body');
        if (tableBody) {
            tableBody.addEventListener('click', this.handleTableClick.bind(this));
        }

        const addForm = document.getElementById('add-church-form');
        if (addForm) {
            addForm.addEventListener('submit', this.handleAddChurch.bind(this));
        }
    }

    handleTableClick(event) {
        const row = event.target.closest('.church-row');
        if (!row) return;
        this.selectChurch(row);
    }

    selectChurch(row) {
        // Clear previous selection
        document.querySelectorAll('.church-row.selected')
            .forEach(r => r.classList.remove('selected'));
        
        // Select new row
        row.classList.add('selected');
        this.selectedChurchId = parseInt(row.dataset.churchId);
        
        // Show church detail view
        this.showChurchDetail(this.selectedChurchId);
        
        // Trigger gig filtering
        this.churchSelectedCallback?.(this.selectedChurchId);
    }

    showChurchDetail(churchId) {
        const church = this.getChurchById(churchId);
        const container = document.getElementById('church-detail-container');
        const content = document.getElementById('church-detail-content');
        this.renderChurchDetailView(content, church);
        container.style.display = 'block';
    }

    renderChurchDetailView(content, church) {
        content.innerHTML = `
            <h2>${church.name}</h2>
                <p class="church-detail__location">${church.location || ''}</p>
                <p class="church-detail__info">${church.info || ''}</p>
                <button class="btn btn--primary" data-action="edit">Edit</button>
        `;

        // Add event listener for the edit button
        const editButton = content.querySelector('[data-action="edit"]');
        if (editButton) {
            editButton.addEventListener('click', () => this.editChurchDetail(content, church));
        }
    }

    editChurchDetail(content, church) {
        // const content = document.getElementById('church-detail-content');
        // if (!content) return;

        this.renderChurchEditForm(content, church);
    }

    renderChurchEditForm(content, church) {
        content.innerHTML = `
            <div class="card">
            <div class="card__header">
                <h3 class="card__title">Edit Church</h3>
            </div>
            <div class="card__body">
                <div class="form">
                    <div class="form-field">
                        <input type="text" id="edit-church-name" value="${church.name}" data-field="name" class="form-input" required>
                    </div>
                    <div class="form-field">
                        <input type="text" id="edit-church-location" value="${church.location || ''}" data-field="location" class="form-input">
                    </div>
                    <div class="form-field">
                        <textarea id="edit-church-info" data-field="info" class="form-input" rows="3">${church.info || ''}</textarea>
                    </div>
                </div>
            </div>
            <div class="card__actions">
                <button id="save" class="btn btn--success" data-action="save">Save</button>
                <button id="cancel" class="btn btn--secondary" data-action="cancel">Cancel</button>
            </div>
            </div>
        `;

        // Add event listeners for save and cancel buttons
        const saveButton = content.querySelector('[data-action="save"]');
        const cancelButton = content.querySelector('[data-action="cancel"]');
        
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveChurchDetail(content, church));
        }
        
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancelChurchDetailEdit(content, church));
        }
    }

    async saveChurchDetail(content, church) {
        // const content = document.getElementById('church-detail-content');
        // if (!content) return;

        const inputs = content.querySelectorAll('input[data-field], textarea[data-field]');
        const updatedData = {};
        
        inputs.forEach(input => {
            updatedData[input.dataset.field] = input.value;
        });

        try {
            await ApiService.put(`/churches/${church.id}`, updatedData);
            await this.loadChurches(); // Refresh the table
            
            // Update the church object and re-render detail view
            const updatedChurch = this.getChurchById(church.id);
            if (updatedChurch) {
                this.renderChurchDetailView(content, updatedChurch);
            }
            
            showNotification('Church updated successfully', 'success');
        } catch (error) {
            console.error('Error updating church:', error);
            showNotification('Failed to update church', 'error');
        }
    }

    cancelChurchDetailEdit(church) {
        const content = document.getElementById('church-detail-content');
        if (!content) return;

        // Re-render the detail view without edit form
        this.renderChurchDetailView(content, church);
    }

    async handleAddChurch(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        const churchData = {
            name: formData.get('name'),
            location: formData.get('location'),
            info: formData.get('info')
        };

        console.log('Adding church:', churchData);
        try {
            await ApiService.post('/churches/', churchData);
            await this.loadChurches();
            event.target.reset();
            showNotification('Church added successfully', 'success');
        } catch (error) {
            console.error('Error adding church:', error);
            showNotification('Failed to add church', 'error');
        }
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    }

    handleKeyboardNavigation(event) {
        // Implementation for arrow key navigation
        // This would be extracted from the current keyboard handling code
    }

    // Method to be called by other modules when church selection changes
    onChurchSelected(callback) {
        this.churchSelectedCallback = callback;
    }

    getSelectedChurchId() {
        return this.selectedChurchId;
    }

    getChurchById(id) {
        return this.churches.find(church => church.id === id);
    }
}

export default ChurchManager;

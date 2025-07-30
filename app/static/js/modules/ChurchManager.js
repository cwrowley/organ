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
        // this.setupKeyboardNavigation();
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
        this.showChurch(this.selectedChurchId);

        // Trigger gig filtering
        this.churchSelectedCallback?.(this.selectedChurchId);
    }

    showChurch(churchId) {
        const church = this.getChurchById(churchId);
        const container = document.getElementById('church-container');
        this.renderChurchDetail(church);
        container.style.display = 'block';
    }

    renderChurchDetail(church) {
        const content = document.getElementById('church-content');
        content.innerHTML = `
            <h2>${church.name}</h2>
                <p class="church-detail__location">${church.location || ''}</p>
                <p class="church-detail__info">${church.info || ''}</p>
                <!-- disable edit button for now -->
                <!-- <button class="btn btn--primary" data-action="edit">Edit</button> -->
        `;
        // Add event listener for the edit button
        const editButton = content.querySelector('[data-action="edit"]');
        if (editButton) {
            editButton.addEventListener('click', () => this.editChurch(church));
        }
    }
    editChurch(church) {
        const content = document.getElementById('church-content');
        this.renderEditForm(content, church);
    }

    renderEditForm(element, church) {
        element.innerHTML = `
            <div class="card">
            <div class="card__header">
                <h3 class="card__title">Edit Church</h3>
            </div>
            <div class="card__body">
            <input type="text" value="${church.name}" data-field="name" class="form-input"></td>
            <input type="text" value="${church.location || ''}" placeholder="Location" data-field="location" class="form-input"></td>
            <input type="text" value="${church.info || ''}" placeholder="Info" data-field="info" class="form-input"></td>
            <td>
                <button class="btn btn--success btn--sm" data-action="save">Save</button>
                <button class="btn btn--secondary btn--sm" data-action="cancel">Cancel</button>
            </td>
        `;

        // Store original data for cancel functionality
        element.dataset.originalData = JSON.stringify(church);
    }

    async saveChurch(row) {
        const churchId = parseInt(row.dataset.churchId);
        const inputs = row.querySelectorAll('input[data-field]');
        
        const updatedData = {};
        inputs.forEach(input => {
            updatedData[input.dataset.field] = input.value;
        });

        try {
            await ApiService.put(`/churches/${churchId}`, updatedData);
            await this.loadChurches(); // Refresh the table
            showNotification('Church updated successfully', 'success');
        } catch (error) {
            console.error('Error updating church:', error);
            showNotification('Failed to update church', 'error');
        }
    }

    cancelEdit(row) {
        // Restore original data and exit edit mode
        const originalData = JSON.parse(row.dataset.originalData);
        const church = this.churches.find(c => c.id === originalData.id);
        
        if (church) {
            // Re-render the row in display mode
            row.innerHTML = `
                <td>${church.name}</td>
                <td>${church.location || ''}</td>
                <td>${church.info || ''}</td>
                <td>
                    <button class="btn btn--secondary btn--sm" data-action="edit">Edit</button>
                </td>
            `;
        }
        
        // Clean up the stored data
        delete row.dataset.originalData;
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

// Main Application Module - Orchestrates all components
import ChurchManager from './modules/ChurchManager.js';
import GigManager from './modules/GigManager.js';
import FormManager from './modules/FormManager.js';
import { KeyboardNavigator } from './modules/UIHelpers.js';

class OrganGigApp {
    constructor() {
        this.churchManager = null;
        this.gigManager = null;
        this.formManager = null;
        this.keyboardNavigator = null;
    }

    async init() {
        try {
            await this.initializeManagers();
            this.setupGlobalEventListeners();
            // this.setupKeyboardShortcuts();
            
            console.log('Organ Gig App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }

    async initializeManagers() {
        // Initialize managers in order of dependency
        this.churchManager = new ChurchManager();
        await this.churchManager.init();

        this.gigManager = new GigManager(this.churchManager);
        await this.gigManager.init();

        this.formManager = new FormManager();
        await this.formManager.init();

        // Setup inter-manager communication
        this.setupManagerCommunication();
    }

    setupManagerCommunication() {
        // When church is selected, filter gigs
        this.churchManager.onChurchSelected((churchId) => {
            this.gigManager.loadGigs(churchId);
        });

        // When gig is added, refresh gig list
        this.formManager.onGigAdded((churchId) => {
            this.gigManager.loadGigs(churchId);
        });
    }

    setupGlobalEventListeners() {
        // Handle clicks outside of forms to close them
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        
        // Handle escape key to close forms/modals
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    }

    setupKeyboardShortcuts() {
        // Setup keyboard navigation for churches table
        const churchesTable = document.getElementById('churches-table-body');
        if (churchesTable) {
            this.keyboardNavigator = new KeyboardNavigator(
                document.body,
                '.church-row',
                {
                    activeClass: 'selected',
                    onSelect: (row) => {
                        const churchId = parseInt(row.dataset.churchId);
                        this.churchManager.selectChurch(row);
                    }
                }
            );
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    handleKeyboardShortcuts(event) {
        // Don't trigger shortcuts when typing in inputs
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
        if (isTyping) return;

        const key = event.key.toLowerCase();
        const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

        if (hasModifier) return;

        switch (key) {
            case 'p':
                // Focus on piece title input
                this.focusElement('piece-title');
                event.preventDefault();
                break;
                
            case 'g':
                // Show gig form
                this.formManager.showGigForm();
                event.preventDefault();
                break;
                
            case 'c':
                // Focus on church name input
                this.focusElement('church-name');
                event.preventDefault();
                break;
        }
    }

    handleGlobalClick(event) {
        // Close dropdowns, forms, etc. when clicking outside
        const target = event.target;
        
        // Example: close church selection when clicking outside
        if (!target.closest('#churches-table-body')) {
            // Clear church selection if clicking elsewhere
            // (This is optional behavior)
        }
    }

    handleEscapeKey() {
        // Close any open forms or modals
        this.formManager.hideGigForm();
        this.formManager.cancelInlineEdits();
    }

    focusElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Public API methods for external use
    getSelectedChurch() {
        return this.churchManager.getSelectedChurchId();
    }

    refreshData() {
        return Promise.all([
            this.churchManager.loadChurches(),
            this.gigManager.loadGigs(),
            this.formManager.loadFormData()
        ]);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.organGigApp = new OrganGigApp();
    window.organGigApp.init();
});

export default OrganGigApp;

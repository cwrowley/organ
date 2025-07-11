// Gig Management Module
import ApiService from './ApiService.js';
import { showNotification, createElement } from './UIHelpers.js';

class GigManager {
    constructor(churchManager) {
        this.churchManager = churchManager;
        this.allGigs = [];
        this.displayedGigsCount = 0;
        this.GIGS_PER_PAGE = 5;
        this.currentFilter = null;
    }

    async init() {
        await this.loadGigs();
        this.setupEventListeners();
        this.setupChurchSelection();
    }

    async loadGigs(churchId = null) {
        try {
            const endpoint = churchId ? `/churches/${churchId}/gigs` : '/gigs/';
            const gigs = await ApiService.get(endpoint);
            this.currentFilter = churchId;
            this.renderGigs(gigs);
        } catch (error) {
            console.error('Error loading gigs:', error);
            showNotification('Failed to load gigs', 'error');
        }
    }

    renderGigs(gigs, reset = true) {
        const container = document.getElementById('gigs-container');
        if (!container) return;

        if (reset) {
            this.allGigs = gigs;
            this.displayedGigsCount = 0;
            container.innerHTML = '';
        }

        if (this.allGigs.length === 0) {
            container.innerHTML = '<div class="no-gigs-message">No gigs found.</div>';
            this.hidePaginationControls();
            return;
        }

        this.renderGigBatch();
        this.updatePaginationControls();
    }

    renderGigBatch() {
        const container = document.getElementById('gigs-container');
        const gigsToShow = Math.min(
            this.displayedGigsCount + this.GIGS_PER_PAGE, 
            this.allGigs.length
        );

        for (let i = this.displayedGigsCount; i < gigsToShow; i++) {
            const gigCard = this.createGigCard(this.allGigs[i]);
            container.appendChild(gigCard);
        }

        this.displayedGigsCount = gigsToShow;
    }

    createGigCard(gig) {
        const card = createElement('div', 'gig-card');
        card.dataset.gigId = gig.id;

        const piecesHtml = this.generatePiecesHtml(gig.gig_pieces || []);
        
        card.innerHTML = `
            <div class="gig-header">
                <div>
                    <div class="gig-date">${this.formatDate(gig.date)}</div>
                    <div class="gig-church">${gig.church.name}</div>
                </div>
                <div class="gig-right-info">
                    <button class="btn btn--primary btn--sm" data-action="edit" data-gig-id="${gig.id}">
                        Edit
                    </button>
                    ${gig.fee ? `<div class="gig-fee">$${gig.fee}</div>` : ''}
                </div>
            </div>
            ${piecesHtml}
        `;

        return card;
    }

    generatePiecesHtml(gigPieces) {
        if (!gigPieces.length) return '';

        const piecesHtml = gigPieces.map(gigPiece => `
            <li class="piece-item">
                <span class="piece-role">${this.roleEnumToDisplayString(gigPiece.role)}</span>
                <div class="piece-details">
                    <span class="piece-composer">${gigPiece.piece.composer}</span>
                    <span class="piece-title">${gigPiece.piece.title}</span>
                </div>
            </li>
        `).join('');

        return `
            <div class="gig-pieces">
                <ul class="pieces-list">${piecesHtml}</ul>
            </div>
        `;
    }

    updatePaginationControls() {
        const paginationContainer = document.getElementById('gigs-pagination');
        const gigsCountInfo = document.getElementById('gigs-count-info');
        const loadMoreButton = document.getElementById('load-more-gigs');
        const showAllButton = document.getElementById('show-all-gigs-btn');

        if (!paginationContainer) return;

        gigsCountInfo.textContent = `Showing ${this.displayedGigsCount} of ${this.allGigs.length} gigs`;

        if (this.allGigs.length > this.GIGS_PER_PAGE) {
            paginationContainer.style.display = 'block';
            showAllButton.style.display = 'inline-block';

            if (this.displayedGigsCount < this.allGigs.length) {
                loadMoreButton.style.display = 'inline-block';
                const remaining = Math.min(this.GIGS_PER_PAGE, this.allGigs.length - this.displayedGigsCount);
                loadMoreButton.textContent = `Load More Gigs (${remaining} more)`;
            } else {
                loadMoreButton.style.display = 'none';
            }
        } else {
            this.hidePaginationControls();
        }
    }

    hidePaginationControls() {
        const paginationContainer = document.getElementById('gigs-pagination');
        const showAllButton = document.getElementById('show-all-gigs-btn');
        
        if (paginationContainer) paginationContainer.style.display = 'none';
        if (showAllButton) showAllButton.style.display = 'none';
    }

    setupEventListeners() {
        // Gig container click delegation
        const gigsContainer = document.getElementById('gigs-container');
        if (gigsContainer) {
            gigsContainer.addEventListener('click', this.handleGigAction.bind(this));
        }

        // Pagination controls
        const loadMoreButton = document.getElementById('load-more-gigs');
        if (loadMoreButton) {
            loadMoreButton.addEventListener('click', () => this.loadMoreGigs());
        }

        const showAllButton = document.getElementById('show-all-gigs-btn');
        if (showAllButton) {
            showAllButton.addEventListener('click', () => this.toggleShowAllGigs());
        }

        // Add gig form
        const addGigForm = document.getElementById('add-gig-form');
        if (addGigForm) {
            addGigForm.addEventListener('submit', this.handleAddGig.bind(this));
        }
    }

    setupChurchSelection() {
        this.churchManager.onChurchSelected((churchId) => {
            this.loadGigs(churchId);
        });
    }

    handleGigAction(event) {
        const action = event.target.dataset.action;
        const gigId = event.target.dataset.gigId;

        if (action === 'edit' && gigId) {
            this.editGig(parseInt(gigId));
        }
    }

    async editGig(gigId) {
        try {
            const gig = await ApiService.get(`/gigs/${gigId}`);
            const gigCard = document.querySelector(`[data-gig-id="${gigId}"]`);
            
            if (gigCard) {
                await this.replaceWithEditForm(gigCard, gig);
            }
        } catch (error) {
            console.error('Error loading gig for edit:', error);
            showNotification('Failed to load gig data', 'error');
        }
    }

    loadMoreGigs() {
        this.renderGigs(this.allGigs, false);
    }

    toggleShowAllGigs() {
        const showAllButton = document.getElementById('show-all-gigs-btn');
        
        if (showAllButton.textContent === 'Show All Gigs') {
            this.displayedGigsCount = 0;
            this.renderGigs(this.allGigs, false);
            this.displayedGigsCount = this.allGigs.length;
            showAllButton.textContent = 'Show Paginated';
            this.hidePaginationControls();
        } else {
            this.renderGigs(this.allGigs, true);
            showAllButton.textContent = 'Show All Gigs';
        }
    }

    // Utility methods
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    roleEnumToDisplayString(roleEnum) {
        const roleMap = {
            'PRELUDE': 'Prelude',
            'OFFERTORY': 'Offertory',
            'POSTLUDE': 'Postlude',
            'OTHER': 'Other'
        };
        return roleMap[roleEnum] || roleEnum;
    }
}

export default GigManager;

// UI Helper Functions and Utilities
export function createElement(tag, className = '', content = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.innerHTML = content;
    return element;
}

export function showNotification(message, type = 'info', duration = 5000) {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = createElement('div', 'notification-container');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    const notification = createElement('div', `notification notification--${type}`);
    notification.innerHTML = `
        <span class="notification__message">${message}</span>
        <button class="notification__close" aria-label="Close">&times;</button>
    `;

    // Add close functionality
    notification.querySelector('.notification__close').addEventListener('click', () => {
        removeNotification(notification);
    });

    container.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
        removeNotification(notification);
    }, duration);
}

function removeNotification(notification) {
    notification.classList.add('notification--removing');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

export function scrollToElement(element, options = {}) {
    const defaultOptions = {
        behavior: 'smooth',
        block: 'start',
        ...options
    };
    
    element.scrollIntoView(defaultOptions);
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Form validation helpers
export function validateForm(form) {
    const errors = [];
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            errors.push(`${field.name || field.id} is required`);
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

export function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        // Handle multiple values (checkboxes, multi-select)
        if (data[key]) {
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

// Dropdown population helpers
export async function populateSelect(selectElement, options, config = {}) {
    const {
        valueKey = 'id',
        textKey = 'name',
        placeholder = 'Select an option',
        selectedValue = null
    } = config;

    selectElement.innerHTML = `<option value="" disabled ${!selectedValue ? 'selected' : ''}>${placeholder}</option>`;
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option[valueKey];
        optionElement.textContent = option[textKey];
        
        if (selectedValue && option[valueKey] == selectedValue) {
            optionElement.selected = true;
        }
        
        selectElement.appendChild(optionElement);
    });
}

// Modal helpers
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('modal--active');
        document.body.classList.add('modal-open');
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('modal--active');
        document.body.classList.remove('modal-open');
    }
}

// Loading state helpers
export function showLoading(element, message = 'Loading...') {
    element.classList.add('loading');
    element.setAttribute('data-loading-text', message);
}

export function hideLoading(element) {
    element.classList.remove('loading');
    element.removeAttribute('data-loading-text');
}

// Keyboard navigation helper
export class KeyboardNavigator {
    constructor(container, itemSelector, options = {}) {
        this.container = container;
        this.itemSelector = itemSelector;
        this.currentIndex = -1;
        this.options = {
            loop: true,
            activeClass: 'selected',
            ...options
        };
        
        this.init();
    }

    init() {
        this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleKeyDown(event) {
        const items = this.getItems();
        if (items.length === 0) return;

        let newIndex = this.currentIndex;

        switch (event.key) {
            case 'ArrowDown':
                newIndex = this.options.loop 
                    ? (this.currentIndex + 1) % items.length
                    : Math.min(this.currentIndex + 1, items.length - 1);
                event.preventDefault();
                break;
                
            case 'ArrowUp':
                newIndex = this.options.loop
                    ? (this.currentIndex - 1 + items.length) % items.length
                    : Math.max(this.currentIndex - 1, 0);
                event.preventDefault();
                break;
                
            case 'Enter':
                if (this.currentIndex >= 0) {
                    this.selectItem(items[this.currentIndex]);
                    event.preventDefault();
                }
                return;
                
            default:
                return;
        }

        this.setActiveItem(newIndex);
    }

    getItems() {
        return Array.from(this.container.querySelectorAll(this.itemSelector));
    }

    setActiveItem(index) {
        const items = this.getItems();
        
        // Remove previous selection
        if (this.currentIndex >= 0 && items[this.currentIndex]) {
            items[this.currentIndex].classList.remove(this.options.activeClass);
        }
        
        // Set new selection
        this.currentIndex = index;
        if (items[index]) {
            items[index].classList.add(this.options.activeClass);
            items[index].focus();
        }
    }

    selectItem(item) {
        // Override this method or provide callback
        if (this.options.onSelect) {
            this.options.onSelect(item);
        }
    }
}

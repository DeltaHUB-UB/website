/**
 * Delta-Hub Admin Panel JavaScript
 * Handles content management functionality
 */

// Admin panel state
let adminData = {
    news: [],
    workshops: [],
    research: [],
    partners: []
};

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

/**
 * Initialize admin panel functionality
 */
function initializeAdmin() {
    console.log('Initializing admin panel...');
    
    // Load existing data
    loadAllData();
    
    // Initialize forms
    initializeForms();
    
    // Update counters
    updateCounters();
    
    console.log('Admin panel initialized successfully');
}

/**
 * Load all data from APIs
 */
async function loadAllData() {
    try {
        await Promise.all([
            loadNews(),
            loadWorkshops()
            // Add other data loading functions as needed
        ]);
        
        updateCounters();
        displayRecentItems();
    } catch (error) {
        console.error('Error loading admin data:', error);
        showAdminMessage('Error loading data. Some features may not work properly.', 'error');
    }
}

/**
 * Load news data
 */
async function loadNews() {
    try {
        const response = await fetch('/api/news');
        if (response.ok) {
            adminData.news = await response.json();
        } else {
            throw new Error('Failed to load news');
        }
    } catch (error) {
        console.error('Error loading news:', error);
        adminData.news = [];
    }
}

/**
 * Load workshops data
 */
async function loadWorkshops() {
    try {
        const response = await fetch('/api/workshops');
        if (response.ok) {
            adminData.workshops = await response.json();
        } else {
            throw new Error('Failed to load workshops');
        }
    } catch (error) {
        console.error('Error loading workshops:', error);
        adminData.workshops = [];
    }
}

/**
 * Initialize all forms in the admin panel
 */
function initializeForms() {
    // News form
    const newsForm = document.getElementById('newsForm');
    if (newsForm) {
        newsForm.addEventListener('submit', handleNewsSubmission);
    }
    
    // Workshop form
    const workshopForm = document.getElementById('workshopForm');
    if (workshopForm) {
        workshopForm.addEventListener('submit', handleWorkshopSubmission);
    }
    
    console.log('Admin forms initialized');
}

/**
 * Handle news form submission
 */
async function handleNewsSubmission(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const newsData = {
        title: formData.get('title') || document.getElementById('newsTitle').value,
        content: formData.get('content') || document.getElementById('newsContent').value,
        author: formData.get('author') || document.getElementById('newsAuthor').value || 'Admin'
    };
    
    // Validation
    if (!newsData.title || !newsData.content) {
        showAdminMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Adding...';
    
    try {
        const response = await fetch('/api/news', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newsData)
        });
        
        if (response.ok) {
            const newItem = await response.json();
            adminData.news.unshift(newItem);
            
            // Reset form
            form.reset();
            document.getElementById('newsAuthor').value = 'Admin';
            
            // Update UI
            updateCounters();
            displayRecentItems();
            
            showAdminMessage('News item added successfully!', 'success');
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add news item');
        }
    } catch (error) {
        console.error('Error adding news:', error);
        showAdminMessage(`Error: ${error.message}`, 'error');
    } finally {
        // Restore button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Handle workshop form submission
 */
async function handleWorkshopSubmission(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const workshopData = {
        title: formData.get('title') || document.getElementById('workshopTitle').value,
        date: formData.get('date') || document.getElementById('workshopDate').value,
        location: formData.get('location') || document.getElementById('workshopLocation').value,
        description: formData.get('description') || document.getElementById('workshopDescription').value,
        registration_link: formData.get('registration_link') || document.getElementById('workshopRegLink').value
    };
    
    // Validation
    if (!workshopData.title || !workshopData.date) {
        showAdminMessage('Please fill in title and date.', 'error');
        return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Adding...';
    
    try {
        const response = await fetch('/api/workshops', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(workshopData)
        });
        
        if (response.ok) {
            const newWorkshop = await response.json();
            adminData.workshops.push(newWorkshop);
            
            // Reset form
            form.reset();
            
            // Update UI
            updateCounters();
            displayRecentItems();
            
            showAdminMessage('Workshop added successfully!', 'success');
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add workshop');
        }
    } catch (error) {
        console.error('Error adding workshop:', error);
        showAdminMessage(`Error: ${error.message}`, 'error');
    } finally {
        // Restore button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Update counter displays
 */
function updateCounters() {
    const newsCount = document.getElementById('newsCount');
    const workshopCount = document.getElementById('workshopCount');
    const researchCount = document.getElementById('researchCount');
    const partnerCount = document.getElementById('partnerCount');
    
    if (newsCount) newsCount.textContent = adminData.news.length;
    if (workshopCount) workshopCount.textContent = adminData.workshops.length;
    if (researchCount) researchCount.textContent = adminData.research.length;
    if (partnerCount) partnerCount.textContent = adminData.partners.length;
}

/**
 * Display recent items
 */
function displayRecentItems() {
    displayRecentNews();
    displayRecentWorkshops();
}

/**
 * Display recent news items
 */
function displayRecentNews() {
    const container = document.getElementById('recentNews');
    if (!container) return;
    
    const recentNews = adminData.news.slice(0, 3);
    
    if (recentNews.length === 0) {
        container.innerHTML = '<p class="text-muted small">No news items yet.</p>';
        return;
    }
    
    const newsHtml = recentNews.map(item => `
        <div class="border-start border-3 border-primary ps-3 mb-3">
            <h6 class="mb-1">${escapeHtml(item.title)}</h6>
            <small class="text-muted d-block">
                <i class="fas fa-calendar me-1"></i>${item.date}
                <i class="fas fa-user ms-2 me-1"></i>${escapeHtml(item.author)}
            </small>
        </div>
    `).join('');
    
    container.innerHTML = newsHtml;
}

/**
 * Display recent workshops
 */
function displayRecentWorkshops() {
    const container = document.getElementById('recentWorkshops');
    if (!container) return;
    
    const recentWorkshops = adminData.workshops.slice(-3).reverse();
    
    if (recentWorkshops.length === 0) {
        container.innerHTML = '<p class="text-muted small">No workshops scheduled yet.</p>';
        return;
    }
    
    const workshopsHtml = recentWorkshops.map(workshop => {
        const currentDate = new Date().toISOString().split('T')[0];
        const isUpcoming = workshop.date >= currentDate;
        const badgeClass = isUpcoming ? 'bg-success' : 'bg-secondary';
        const badgeText = isUpcoming ? 'Upcoming' : 'Past';
        
        return `
            <div class="border-start border-3 border-success ps-3 mb-3">
                <div class="d-flex justify-content-between align-items-start">
                    <h6 class="mb-1">${escapeHtml(workshop.title)}</h6>
                    <span class="badge ${badgeClass} small">${badgeText}</span>
                </div>
                <small class="text-muted d-block">
                    <i class="fas fa-calendar me-1"></i>${workshop.date}
                    ${workshop.location ? `<br><i class="fas fa-map-marker-alt me-1"></i>${escapeHtml(workshop.location)}` : ''}
                </small>
            </div>
        `;
    }).join('');
    
    container.innerHTML = workshopsHtml;
}

/**
 * Show admin message
 */
function showAdminMessage(message, type = 'info') {
    const container = document.getElementById('adminMessages');
    if (!container) {
        console.log(`Admin message (${type}): ${message}`);
        return;
    }
    
    // Remove existing messages
    container.innerHTML = '';
    
    const alertClass = type === 'error' ? 'alert-danger' : 
                      type === 'success' ? 'alert-success' : 
                      type === 'warning' ? 'alert-warning' :
                      'alert-info';
    
    const messageEl = document.createElement('div');
    messageEl.className = `alert ${alertClass} alert-dismissible fade show`;
    messageEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    container.appendChild(messageEl);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.remove();
        }
    }, 5000);
    
    // Scroll to message
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Format date for display
 */
function formatDateForDisplay(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Validate URL
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Handle form validation
 */
function validateForm(form, requiredFields) {
    const errors = [];
    
    requiredFields.forEach(fieldName => {
        const field = form.querySelector(`#${fieldName}, [name="${fieldName}"]`);
        if (!field || !field.value.trim()) {
            errors.push(`${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`);
        }
    });
    
    return errors;
}

/**
 * Clear form data
 */
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        
        // Reset any custom default values
        const authorField = form.querySelector('#newsAuthor');
        if (authorField) {
            authorField.value = 'Admin';
        }
    }
}

/**
 * Export data for backup
 */
function exportData() {
    const dataToExport = {
        news: adminData.news,
        workshops: adminData.workshops,
        research: adminData.research,
        partners: adminData.partners,
        exported_at: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `delta-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showAdminMessage('Data exported successfully!', 'success');
}

/**
 * Refresh data from server
 */
async function refreshData() {
    showAdminMessage('Refreshing data...', 'info');
    
    try {
        await loadAllData();
        showAdminMessage('Data refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showAdminMessage('Error refreshing data. Please try again.', 'error');
    }
}

// Add keyboard shortcuts for admin panel
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + R to refresh data
    if ((event.ctrlKey || event.metaKey) && event.key === 'r' && event.shiftKey) {
        event.preventDefault();
        refreshData();
    }
    
    // Ctrl/Cmd + E to export data
    if ((event.ctrlKey || event.metaKey) && event.key === 'e' && event.shiftKey) {
        event.preventDefault();
        exportData();
    }
});

// Make functions available globally for debugging
window.AdminPanel = {
    refreshData,
    exportData,
    clearForm,
    showAdminMessage,
    adminData
};

console.log('Admin panel JavaScript loaded successfully');

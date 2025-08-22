/**
 * Static Admin Panel for GitHub Pages
 * Client-side content management using localStorage
 */

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeStaticAdmin();
});

/**
 * Initialize static admin panel
 */
function initializeStaticAdmin() {
    console.log('Initializing static admin panel...');
    
    // Wait for static data to load
    setTimeout(() => {
        updateCounters();
        displayRecentItems();
        initializeForms();
        initializeImportExport();
    }, 500);
    
    console.log('Static admin panel initialized successfully');
}

/**
 * Initialize forms
 */
function initializeForms() {
    const newsForm = document.getElementById('newsForm');
    const workshopForm = document.getElementById('workshopForm');
    
    if (newsForm) {
        newsForm.addEventListener('submit', handleNewsSubmission);
    }
    
    if (workshopForm) {
        workshopForm.addEventListener('submit', handleWorkshopSubmission);
    }
}

/**
 * Handle news form submission
 */
function handleNewsSubmission(event) {
    event.preventDefault();
    
    const title = document.getElementById('newsTitle').value.trim();
    const content = document.getElementById('newsContent').value.trim();
    const author = document.getElementById('newsAuthor').value.trim() || 'Admin';
    
    if (!title || !content) {
        showAdminMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Adding...';
    
    try {
        // Add news item using StaticData
        const newItem = window.StaticData.addNewsItem(title, content, author);
        
        // Reset form
        event.target.reset();
        document.getElementById('newsAuthor').value = 'Admin';
        
        // Update UI
        updateCounters();
        displayRecentItems();
        
        showAdminMessage('News item added successfully!', 'success');
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
function handleWorkshopSubmission(event) {
    event.preventDefault();
    
    const workshopData = {
        title: document.getElementById('workshopTitle').value.trim(),
        date: document.getElementById('workshopDate').value,
        location: document.getElementById('workshopLocation').value.trim(),
        description: document.getElementById('workshopDescription').value.trim(),
        registration_link: document.getElementById('workshopRegLink').value.trim()
    };
    
    if (!workshopData.title || !workshopData.date) {
        showAdminMessage('Please fill in title and date.', 'error');
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Adding...';
    
    try {
        // Add workshop using StaticData
        const newWorkshop = window.StaticData.addWorkshop(workshopData);
        
        // Reset form
        event.target.reset();
        
        // Update UI
        updateCounters();
        displayRecentItems();
        
        showAdminMessage('Workshop added successfully!', 'success');
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
    const data = window.StaticData?.staticData;
    if (!data) return;
    
    const newsCount = document.getElementById('newsCount');
    const workshopCount = document.getElementById('workshopCount');
    const researchCount = document.getElementById('researchCount');
    
    if (newsCount) newsCount.textContent = data.news.length;
    if (workshopCount) workshopCount.textContent = data.workshops.length;
    if (researchCount) researchCount.textContent = data.research.length;
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
    
    const data = window.StaticData?.staticData;
    if (!data) return;
    
    const recentNews = data.news.slice(0, 3);
    
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
    
    const data = window.StaticData?.staticData;
    if (!data) return;
    
    const recentWorkshops = data.workshops.slice(-3).reverse();
    
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
 * Initialize import/export functionality
 */
function initializeImportExport() {
    const exportBtn = document.getElementById('exportAllBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportAllData);
    }
    
    if (importFile) {
        importFile.addEventListener('change', function() {
            importBtn.disabled = this.files.length === 0;
        });
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', importData);
    }
}

/**
 * Export all data as JSON files
 */
function exportAllData() {
    const data = window.StaticData?.getAllData();
    if (!data) {
        showAdminMessage('No data available to export.', 'error');
        return;
    }
    
    // Create individual JSON files
    const files = [
        { name: 'news.json', content: data.news },
        { name: 'workshops.json', content: data.workshops },
        { name: 'research.json', content: data.research },
        { name: 'consortium.json', content: data.consortium }
    ];
    
    files.forEach(file => {
        const dataStr = JSON.stringify(file.content, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = file.name;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(link.href);
    });
    
    showAdminMessage('Data exported successfully! Save these files to your repository\'s data/ directory.', 'success');
}

/**
 * Import data from JSON files
 */
function importData() {
    const fileInput = document.getElementById('importFile');
    const files = fileInput.files;
    
    if (files.length === 0) {
        showAdminMessage('Please select files to import.', 'error');
        return;
    }
    
    let loadedData = {};
    let filesProcessed = 0;
    
    Array.from(files).forEach(file => {
        if (!file.name.endsWith('.json')) {
            filesProcessed++;
            if (filesProcessed === files.length) {
                processImportedData(loadedData);
            }
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                const fileName = file.name.replace('.json', '');
                
                if (['news', 'workshops', 'research', 'consortium'].includes(fileName)) {
                    loadedData[fileName] = data;
                }
            } catch (error) {
                console.error('Error parsing file:', file.name, error);
                showAdminMessage(`Error parsing ${file.name}: ${error.message}`, 'error');
            }
            
            filesProcessed++;
            if (filesProcessed === files.length) {
                processImportedData(loadedData);
            }
        };
        
        reader.readAsText(file);
    });
}

/**
 * Process imported data
 */
function processImportedData(loadedData) {
    if (Object.keys(loadedData).length === 0) {
        showAdminMessage('No valid data found in the selected files.', 'error');
        return;
    }
    
    try {
        window.StaticData.importData(loadedData);
        updateCounters();
        displayRecentItems();
        
        const fileNames = Object.keys(loadedData).join(', ');
        showAdminMessage(`Successfully imported: ${fileNames}`, 'success');
        
        // Clear file input
        document.getElementById('importFile').value = '';
        document.getElementById('importBtn').disabled = true;
    } catch (error) {
        console.error('Error importing data:', error);
        showAdminMessage(`Error importing data: ${error.message}`, 'error');
    }
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

// Make functions available globally for debugging
window.StaticAdmin = {
    exportAllData,
    importData,
    showAdminMessage,
    updateCounters,
    displayRecentItems
};
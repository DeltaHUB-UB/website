/**
 * Static Data Management for GitHub Pages
 * Handles loading and managing JSON data without server-side API
 */

// Data cache
const staticData = {
    news: [],
    workshops: [],
    research: [],
    consortium: []
};

// Storage keys for localStorage
const STORAGE_KEYS = {
    news: 'deltahub_news',
    workshops: 'deltahub_workshops',
    research: 'deltahub_research',
    consortium: 'deltahub_consortium'
};

/**
 * Initialize static data management
 */
document.addEventListener('DOMContentLoaded', function () {
    loadAllStaticData();
});

/**
 * Load data from localStorage or initialize with default values
 */
async function loadAllStaticData() {
    try {
        // Try to load from localStorage first
        loadFromLocalStorage();

        // If no data in localStorage, try to load from JSON files
        if (isDataEmpty()) {
            await loadFromJsonFiles();
        }

        // Resolve any markdown file references to content strings
        await resolveMarkdownReferences();

        // Populate the page based on current page
        populateCurrentPage();

    } catch (error) {
        console.error('Error loading static data:', error);
        // Initialize with empty arrays if all else fails
        initializeEmptyData();
    }
}

/**
 * If any objects have *_file properties (e.g., content_file, description_file),
 * fetch the Markdown, render to HTML, and set corresponding HTML field
 */
async function resolveMarkdownReferences() {
    const fetchMd = async (path) => {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return await res.text();
    };

    // Helper to process an array of items
    const processArray = async (arr, mappings) => {
        if (!Array.isArray(arr)) return;
        for (const item of arr) {
            for (const [fileKey, htmlKey] of mappings) {
                if (item && typeof item[fileKey] === 'string' && item[fileKey].endsWith('.md')) {
                    try {
                        const md = await fetchMd(item[fileKey]);
                        const html = (window.Markdown?.renderMarkdown(md)) || '';
                        item[htmlKey] = html;
                    } catch (e) {
                        console.warn('Markdown load failed:', item[fileKey], e);
                    }
                }
            }
        }
    };

    await processArray(staticData.news, [['content_file', 'content_html']]);
    await processArray(staticData.research, [['description_file', 'description_html']]);
    await processArray(staticData.workshops, [['description_file', 'description_html']]);
    await processArray(staticData.consortium, [['description_file', 'description_html']]);
}

/**
 * Load data from localStorage
 */
function loadFromLocalStorage() {
    staticData.news = JSON.parse(localStorage.getItem(STORAGE_KEYS.news) || '[]');
    staticData.workshops = JSON.parse(localStorage.getItem(STORAGE_KEYS.workshops) || '[]');
    staticData.research = JSON.parse(localStorage.getItem(STORAGE_KEYS.research) || '[]');
    staticData.consortium = JSON.parse(localStorage.getItem(STORAGE_KEYS.consortium) || '[]');
}

/**
 * Check if all data arrays are empty
 */
function isDataEmpty() {
    return staticData.news.length === 0 &&
        staticData.workshops.length === 0 &&
        staticData.research.length === 0 &&
        staticData.consortium.length === 0;
}

/**
 * Try to load data from JSON files
 */
async function loadFromJsonFiles() {
    const dataFiles = [
        { key: 'news', file: 'data/news.json' },
        { key: 'workshops', file: 'data/workshops.json' },
        { key: 'research', file: 'data/research.json' },
        { key: 'consortium', file: 'data/consortium.json' }
    ];

    for (const { key, file } of dataFiles) {
        try {
            const response = await fetch(file);
            if (response.ok) {
                staticData[key] = await response.json();
                localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(staticData[key]));
            }
        } catch (error) {
            console.log(`Could not load ${file}, using empty array`);
            staticData[key] = [];
        }
    }
}

/**
 * Initialize with empty data
 */
function initializeEmptyData() {
    staticData.news = [];
    staticData.workshops = [];
    staticData.research = [];
    staticData.consortium = [];
}

/**
 * Save data to localStorage
 */
function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEYS.news, JSON.stringify(staticData.news));
    localStorage.setItem(STORAGE_KEYS.workshops, JSON.stringify(staticData.workshops));
    localStorage.setItem(STORAGE_KEYS.research, JSON.stringify(staticData.research));
    localStorage.setItem(STORAGE_KEYS.consortium, JSON.stringify(staticData.consortium));
}

/**
 * Populate current page with data
 */
function populateCurrentPage() {
    const currentPage = getCurrentPageName();

    switch (currentPage) {
        case 'index.html':
        case '':
        case '/':
            populateHomePage();
            break;
        case 'news.html':
            populateNewsPage();
            break;
        case 'workshops.html':
            populateWorkshopsPage();
            break;
        case 'research.html':
            populateResearchPage();
            break;
        case 'consortium.html':
            populateConsortiumPage();
            break;
        case 'admin.html':
            // Admin page is handled by static-admin.js
            break;
    }
}

/**
 * Get current page name
 */
function getCurrentPageName() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    return filename || 'index.html';
}

/**
 * Populate homepage with latest news and upcoming workshops
 */
function populateHomePage() {
    populateLatestNews();
    populateUpcomingWorkshops();
}

/**
 * Populate latest news section on homepage
 */
function populateLatestNews() {
    const container = document.getElementById('latestNews');
    if (!container) return;

    const latestNews = staticData.news
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

    if (latestNews.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-newspaper fa-3x text-muted mb-3"></i>
                <p class="text-muted">No news items available yet. Check back soon for updates!</p>
            </div>
        `;
        return;
    }

    const toExcerpt = (item) => {
        if (item.content_html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = item.content_html;
            const txt = tmp.textContent || '';
            const slice = txt.trim().substring(0, 200);
            return `${escapeHtml(slice)}${txt.length > 200 ? '...' : ''}`;
        }
        const raw = (item.content || '').trim();
        const slice = raw.substring(0, 200);
        return `${escapeHtml(slice)}${raw.length > 200 ? '...' : ''}`;
    };

    const newsHtml = latestNews.map(item => `
        <div class="card mb-3 shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title">${escapeHtml(item.title)}</h5>
                        <p class="card-text">${toExcerpt(item)}</p>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>${item.date}
                            <i class="fas fa-user ms-3 me-1"></i>${escapeHtml(item.author)}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = newsHtml;
}

/**
 * Populate upcoming workshops on homepage
 */
function populateUpcomingWorkshops() {
    const container = document.getElementById('upcomingWorkshops');
    if (!container) return;

    const currentDate = new Date().toISOString().split('T')[0];
    const upcomingWorkshops = staticData.workshops
        .filter(w => w.date >= currentDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 2);

    if (upcomingWorkshops.length === 0) {
        container.innerHTML = `
            <div class="text-center py-3">
                <i class="fas fa-calendar fa-2x text-muted mb-2"></i>
                <p class="text-muted small">No upcoming workshops scheduled.</p>
            </div>
        `;
        return;
    }

    const workshopsHtml = upcomingWorkshops.map(workshop => `
        <div class="card mb-3 border-start border-4 border-eu-blue">
            <div class="card-body">
                <h6 class="card-title">${escapeHtml(workshop.title)}</h6>
                <p class="card-text small">
                    <i class="fas fa-calendar me-1"></i>${workshop.date}
                    ${workshop.location ? `<br><i class="fas fa-map-marker-alt me-1"></i>${escapeHtml(workshop.location)}` : ''}
                </p>
                ${workshop.registration_link ? `
                    <a href="${escapeHtml(workshop.registration_link)}" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-external-link-alt me-1"></i>Register
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');

    container.innerHTML = workshopsHtml;
}

/**
 * Populate news page
 */
function populateNewsPage() {
    const container = document.getElementById('newsItemsContainer');
    if (!container) return;

    const sortedNews = staticData.news
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedNews.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-newspaper fa-5x text-muted mb-4"></i>
                <h3>No News Available</h3>
                <p class="text-muted lead">
                    News updates and announcements will be posted here as they become available.
                </p>
                <p class="text-muted">
                    Check back regularly for the latest information about the Delta-Hub project, 
                    research developments, and upcoming events.
                </p>
                <div class="mt-4">
                    <a href="contact.html" class="btn btn-eu-blue">
                        <i class="fas fa-envelope me-2"></i>Contact Us for Updates
                    </a>
                </div>
            </div>
        `;
        return;
    }

    const newsHtml = sortedNews.map(item => `
        <article class="card mb-4 shadow-sm">
            <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="badge bg-eu-blue">News Update</span>
                    <small class="text-muted">
                        <i class="fas fa-calendar me-1"></i>${item.date}
                    </small>
                </div>
                <h2 class="h4 card-title mb-3">${escapeHtml(item.title)}</h2>
                <div class="card-text">${item.content_html ? item.content_html : escapeHtml(item.content || '')}</div>
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <small class="text-muted">
                        <i class="fas fa-user me-1"></i>${escapeHtml(item.author)}
                    </small>
                    <div class="social-share">
                        <small class="text-muted me-2">Share:</small>
                        <a href="#" class="text-muted me-2" onclick="shareOnTwitter('${escapeHtml(item.title)}')">
                            <i class="fab fa-x-twitter"></i>
                        </a>
                        <a href="#" class="text-muted" onclick="shareOnLinkedIn('${escapeHtml(item.title)}')">
                            <i class="fab fa-linkedin"></i>
                        </a>
                    </div>
                </div>
            </div>
        </article>
    `).join('');

    container.innerHTML = newsHtml;
}

/**
 * Populate workshops page
 */
function populateWorkshopsPage() {
    const upcomingContainer = document.getElementById('upcomingWorkshopsContainer');
    const pastContainer = document.getElementById('pastWorkshopsContainer');

    const currentDate = new Date().toISOString().split('T')[0];

    const upcoming = staticData.workshops
        .filter(w => w.date >= currentDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const past = staticData.workshops
        .filter(w => w.date < currentDate)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Populate upcoming workshops
    if (upcomingContainer) {
        if (upcoming.length === 0) {
            upcomingContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-calendar-plus fa-4x text-muted mb-3"></i>
                    <h4>No Upcoming Workshops</h4>
                    <p class="text-muted">
                        Workshop schedules are currently being finalized. Check back soon for updates 
                        on our upcoming events and training opportunities.
                    </p>
                    <p class="text-muted">
                        <i class="fas fa-envelope me-1"></i>
                        Sign up for our newsletter to be notified of new workshop announcements.
                    </p>
                </div>
            `;
        } else {
            const upcomingHtml = upcoming.map(workshop => `
                <div class="col-lg-6">
                    <div class="card h-100 shadow-sm border-start border-4 border-success">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <span class="badge bg-success">Upcoming</span>
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-1"></i>${workshop.date}
                                </small>
                            </div>
                            <h5 class="card-title">${escapeHtml(workshop.title)}</h5>
                            ${workshop.location ? `
                                <p class="text-muted">
                                    <i class="fas fa-map-marker-alt me-1"></i>${escapeHtml(workshop.location)}
                                </p>
                            ` : ''}
                            ${workshop.description_html ? `<div class="card-text">${workshop.description_html}</div>` : (workshop.description ? `<p class="card-text">${escapeHtml(workshop.description)}</p>` : '')}
                            ${workshop.registration_link ? `
                                <div class="mt-3">
                                    <a href="${escapeHtml(workshop.registration_link)}" class="btn btn-success" target="_blank">
                                        <i class="fas fa-user-plus me-2"></i>Register Now
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            upcomingContainer.innerHTML = `<div class="row g-4">${upcomingHtml}</div>`;
        }
    }

    // Populate past workshops
    if (pastContainer) {
        if (past.length === 0) {
            pastContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-calendar-check fa-4x text-muted mb-3"></i>
                    <h4>No Past Workshops Yet</h4>
                    <p class="text-muted">
                        As workshops are completed, materials including presentations, recordings, 
                        and summary reports will be made available here.
                    </p>
                </div>
            `;
        } else {
            const pastHtml = past.map(workshop => `
                <div class="col-lg-6">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <span class="badge bg-secondary">Completed</span>
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-1"></i>${workshop.date}
                                </small>
                            </div>
                            <h5 class="card-title">${escapeHtml(workshop.title)}</h5>
                            ${workshop.location ? `
                                <p class="text-muted">
                                    <i class="fas fa-map-marker-alt me-1"></i>${escapeHtml(workshop.location)}
                                </p>
                            ` : ''}
                            ${workshop.description_html ? `<div class="card-text">${workshop.description_html}</div>` : (workshop.description ? `<p class="card-text">${escapeHtml(workshop.description)}</p>` : '')}
                            ${workshop.materials_link ? `
                                <div class="mt-3">
                                    <a href="${escapeHtml(workshop.materials_link)}" class="btn btn-outline-primary btn-sm" target="_blank">
                                        <i class="fas fa-download me-2"></i>Materials & Recordings
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            pastContainer.innerHTML = `<div class="row g-4">${pastHtml}</div>`;
        }
    }
}

/**
 * Populate research page
 */
function populateResearchPage() {
    const container = document.getElementById('researchItemsContainer');
    if (!container) return;

    if (staticData.research.length === 0) {
        // Keep the default content that's already in the HTML
        return;
    }

    const researchHtml = staticData.research.map(item => {
        const badgeClass = item.type === 'publication' ? 'primary' :
            item.type === 'report' ? 'success' : 'warning';

        return `
            <div class="col-lg-6 mb-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-${badgeClass}">
                                ${escapeHtml(item.type.charAt(0).toUpperCase() + item.type.slice(1))}
                            </span>
                            <small class="text-muted">${item.date}</small>
                        </div>
                        <h5 class="card-title">${escapeHtml(item.title)}</h5>
                        ${item.description_html ? `<div class="card-text">${item.description_html}</div>` : (item.description ? `<p class="card-text">${escapeHtml(item.description)}</p>` : '')}
                        ${item.authors ? `
                            <p class="text-muted small">
                                <i class="fas fa-users me-1"></i>${escapeHtml(item.authors)}
                            </p>
                        ` : ''}
                        <div class="d-flex gap-2 mt-3">
                            ${item.url ? `
                                <a href="${escapeHtml(item.url)}" class="btn btn-sm btn-primary" target="_blank">
                                    <i class="fas fa-external-link-alt me-1"></i>View
                                </a>
                            ` : ''}
                            ${item.download_url ? `
                                <a href="${escapeHtml(item.download_url)}" class="btn btn-sm btn-outline-primary" target="_blank">
                                    <i class="fas fa-download me-1"></i>Download
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="row">${researchHtml}</div>`;
}

/**
 * Populate consortium page
 */
function populateConsortiumPage() {
    const container = document.getElementById('partnersContainer');
    if (!container) return;

    if (staticData.consortium.length === 0) {
        // Keep the default content that's already in the HTML
        return;
    }

    const partnersHtml = staticData.consortium.map(partner => `
        <div class="col-lg-4 col-md-6">
            <div class="card h-100 shadow-sm hover-card">
                <div class="card-body text-center p-4">
                    <div class="partner-logo-container mb-3">
                        <i class="fas fa-university fa-4x text-eu-blue"></i>
                    </div>
                    <h5 class="card-title">${escapeHtml(partner.name)}</h5>
                    <p class="text-muted small">${escapeHtml(partner.country)}</p>
                    <p class="card-text">${escapeHtml(partner.role)}</p>
                    ${partner.description ? `<p class="small text-muted">${escapeHtml(partner.description)}</p>` : ''}
                    ${partner.website ? `
                        <a href="${escapeHtml(partner.website)}" class="btn btn-sm btn-outline-primary" target="_blank">
                            <i class="fas fa-external-link-alt me-1"></i>Visit Website
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="row g-4">${partnersHtml}</div>`;
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
 * Add new news item
 */
function addNewsItem(title, content, author = 'Admin') {
    const newItem = {
        id: Date.now(),
        title: title,
        content: content,
        author: author,
        date: new Date().toISOString().split('T')[0]
    };

    staticData.news.unshift(newItem);
    saveToLocalStorage();

    // Refresh current page if needed
    if (getCurrentPageName() === 'index.html' || getCurrentPageName() === '' || getCurrentPageName() === '/') {
        populateLatestNews();
    } else if (getCurrentPageName() === 'news.html') {
        populateNewsPage();
    }

    return newItem;
}

/**
 * Add new workshop
 */
function addWorkshop(workshopData) {
    const newWorkshop = {
        id: Date.now(),
        title: workshopData.title,
        date: workshopData.date,
        location: workshopData.location || '',
        description: workshopData.description || '',
        registration_link: workshopData.registration_link || '',
        materials_link: workshopData.materials_link || ''
    };

    staticData.workshops.push(newWorkshop);
    saveToLocalStorage();

    // Refresh current page if needed
    if (getCurrentPageName() === 'index.html' || getCurrentPageName() === '' || getCurrentPageName() === '/') {
        populateUpcomingWorkshops();
    } else if (getCurrentPageName() === 'workshops.html') {
        populateWorkshopsPage();
    }

    return newWorkshop;
}

/**
 * Get all data for export
 */
function getAllData() {
    return {
        news: staticData.news,
        workshops: staticData.workshops,
        research: staticData.research,
        consortium: staticData.consortium
    };
}

/**
 * Import data
 */
function importData(data) {
    if (data.news) staticData.news = data.news;
    if (data.workshops) staticData.workshops = data.workshops;
    if (data.research) staticData.research = data.research;
    if (data.consortium) staticData.consortium = data.consortium;

    saveToLocalStorage();
    populateCurrentPage();
}

// Make functions available globally
window.StaticData = {
    addNewsItem,
    addWorkshop,
    getAllData,
    importData,
    staticData,
    saveToLocalStorage,
    populateCurrentPage
};
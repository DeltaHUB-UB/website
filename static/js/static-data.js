/**
 * Static Data Management for GitHub Pages
 * Handles loading and managing JSON data without server-side API
 */

// Data cache
const staticData = {
    news: [],
    workshops: [],
    research: [],
    consortium: [],
    measurements: { stations: [] }
};

// Storage keys for localStorage
const STORAGE_KEYS = {
    news: 'deltahub_news',
    workshops: 'deltahub_workshops',
    research: 'deltahub_research',
    consortium: 'deltahub_consortium',
    measurements: 'deltahub_measurements'
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

        // Refresh from JSON: if empty, fully load; otherwise, merge in any new items from JSON
        if (isDataEmpty()) {
            await loadFromJsonFiles();
        } else {
            await mergeWithJsonFiles();
        }

        // Always attempt to overlay team.json (preferred for Our Team page)
        await attemptLoadTeamJsonOverlay();

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
 * Merge remote JSON data into existing cached arrays (by id), preferring local items on conflict
 */
async function mergeWithJsonFiles() {
    const datasets = [
        { key: 'news', file: 'data/news.json' },
        { key: 'workshops', file: 'data/workshops.json' },
        { key: 'research', file: 'data/research.json' },
        { key: 'consortium', file: 'data/consortium.json' }
    ];

    const mergeById = (localArr, remoteArr) => {
        const map = new Map();
        (Array.isArray(localArr) ? localArr : []).forEach(item => map.set(item.id, item));
        (Array.isArray(remoteArr) ? remoteArr : []).forEach(item => {
            if (!map.has(item.id)) {
                map.set(item.id, item);
            }
        });
        return Array.from(map.values());
    };

    for (const { key, file } of datasets) {
        try {
            const res = await fetch(file);
            if (res.ok) {
                const remote = await res.json();
                const merged = mergeById(staticData[key], remote);
                staticData[key] = merged;
                localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(staticData[key]));
            }
        } catch (e) {
            // Ignore merge errors and keep local cache
        }
    }
}

/**
 * Try to load team.json and use it for consortium data if present
 */
async function attemptLoadTeamJsonOverlay() {
    try {
        const res = await fetch('data/team.json');
        if (res.ok) {
            const payload = await res.json();
            const team = Array.isArray(payload) ? payload : (Array.isArray(payload.team) ? payload.team : []);
            if (Array.isArray(team) && team.length) {
                staticData.consortium = team;
                localStorage.setItem(STORAGE_KEYS.consortium, JSON.stringify(staticData.consortium));
            }
        }
    } catch (e) {
        // ignore
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
    staticData.measurements = JSON.parse(localStorage.getItem(STORAGE_KEYS.measurements) || '{"stations": []}');
}

/**
 * Check if all data arrays are empty
 */
function isDataEmpty() {
    return staticData.news.length === 0 &&
        staticData.workshops.length === 0 &&
        staticData.research.length === 0 &&
        staticData.consortium.length === 0 &&
        (!staticData.measurements || !Array.isArray(staticData.measurements.stations) || staticData.measurements.stations.length === 0);
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

    // Optionally load team.json and map to consortium structure if present
    try {
        const res = await fetch('data/team.json');
        if (res.ok) {
            const teamPayload = await res.json();
            const team = Array.isArray(teamPayload) ? teamPayload : (Array.isArray(teamPayload.team) ? teamPayload.team : []);
            if (Array.isArray(team) && team.length) {
                // Prefer team members over consortium orgs for Our Team page
                staticData.consortium = team;
                localStorage.setItem(STORAGE_KEYS.consortium, JSON.stringify(staticData.consortium));
            }
        }
    } catch (e) {
        // ignore
    }

    // Load measurements if present
    try {
        const res = await fetch('data/measurements.json');
        if (res.ok) {
            const payload = await res.json();
            if (payload && Array.isArray(payload.stations)) {
                staticData.measurements = payload;
                localStorage.setItem(STORAGE_KEYS.measurements, JSON.stringify(staticData.measurements));
            }
        }
    } catch (e) {
        // ignore
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
    staticData.measurements = { stations: [] };
}

/**
 * Save data to localStorage
 */
function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEYS.news, JSON.stringify(staticData.news));
    localStorage.setItem(STORAGE_KEYS.workshops, JSON.stringify(staticData.workshops));
    localStorage.setItem(STORAGE_KEYS.research, JSON.stringify(staticData.research));
    localStorage.setItem(STORAGE_KEYS.consortium, JSON.stringify(staticData.consortium));
    localStorage.setItem(STORAGE_KEYS.measurements, JSON.stringify(staticData.measurements));
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
        case 'team.html':
        case 'consortium.html':
            populateConsortiumPage();
            break;
        case 'dashboard.html':
            populateDashboardPage();
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
 * NOTE: Disabled - now using markdown-based news system (homepage-news.js)
 */
function populateLatestNews() {
    // Disabled - news now loaded from markdown files via homepage-news.js
    return;

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

    const isAdmin = (localStorage.getItem('dh_is_admin') === '1');
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
                ${renderMedia(item)}
                <div class="card-text">${item.content_html ? item.content_html : escapeHtml(item.content || '')}</div>
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <small class="text-muted">
                        <i class="fas fa-user me-1"></i>${escapeHtml(item.author)}
                    </small>
                    <div class="d-flex align-items-center">
                        ${isAdmin ? `<button class="btn btn-sm btn-outline-danger me-3" title="Delete" onclick="window.StaticData.deleteNewsItem(${item.id})"><i class=\"fas fa-trash-alt\"></i></button>` : ''}
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
            </div>
        </article>
    `).join('');

    container.innerHTML = newsHtml;
}

function renderMedia(item) {
    const m = item.media;
    if (!m || !m.url || !m.type) return '';
    if (m.type === 'image') {
        return `<div class="mb-3"><img src="${escapeHtml(m.url)}" alt="${escapeHtml(item.title)}" class="img-fluid rounded"></div>`;
    }
    if (m.type === 'video') {
        const isYouTube = /youtube\.com|youtu\.be/.test(m.url);
        if (isYouTube) {
            // naive embed replacement
            return `<div class="ratio ratio-16x9 mb-3"><iframe src="${escapeHtml(m.url)}" title="Video" allowfullscreen loading="lazy"></iframe></div>`;
        }
        return `<div class="mb-3"><video controls preload="metadata" class="w-100 rounded"><source src="${escapeHtml(m.url)}"></video></div>`;
    }
    return '';
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
 * Populate dashboard page
 */
function populateDashboardPage() {
    const statsContainer = document.getElementById('dashboardStats');
    const newsContainer = document.getElementById('dashboardLatestNews');
    const workshopContainer = document.getElementById('dashboardUpcomingWorkshop');
    const researchContainer = document.getElementById('dashboardResearch');
    const teamContainer = document.getElementById('dashboardTeam');
    const measSelect = document.getElementById('measurementStation');
    const measStatus = document.getElementById('measurementsStatus');

    // Stats
    if (statsContainer) {
        const newsCount = staticData.news.length;
        const today = new Date().toISOString().split('T')[0];
        const upcomingCount = staticData.workshops.filter(w => w.date >= today).length;
        const researchCount = staticData.research.length;
        const teamCount = staticData.consortium.length;

        statsContainer.innerHTML = `
            <div class="row g-4">
                <div class="col-md-3">
                    <div class="card shadow-sm h-100 border-start border-4 border-primary">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-newspaper fa-2x text-primary me-3"></i>
                                <div>
                                    <div class="h4 mb-0">${newsCount}</div>
                                    <small class="text-muted">News</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card shadow-sm h-100 border-start border-4 border-success">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-calendar-check fa-2x text-success me-3"></i>
                                <div>
                                    <div class="h4 mb-0">${upcomingCount}</div>
                                    <small class="text-muted">Upcoming Workshops</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card shadow-sm h-100 border-start border-4 border-warning">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-microscope fa-2x text-warning me-3"></i>
                                <div>
                                    <div class="h4 mb-0">${researchCount}</div>
                                    <small class="text-muted">Research Items</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card shadow-sm h-100 border-start border-4 border-info">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-users fa-2x text-info me-3"></i>
                                <div>
                                    <div class="h4 mb-0">${teamCount}</div>
                                    <small class="text-muted">Team Members</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // Latest News
    if (newsContainer) {
        const latest = [...staticData.news].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
        if (latest.length === 0) {
            newsContainer.innerHTML = `<p class="text-muted">No news yet. <a href="news.html">View News</a></p>`;
        } else {
            newsContainer.innerHTML = latest.map(n => `
                <div class="mb-3 pb-3 border-bottom">
                    <div class="d-flex justify-content-between">
                        <strong>${escapeHtml(n.title)}</strong>
                        <small class="text-muted">${n.date}</small>
                    </div>
                    <small class="text-muted">by ${escapeHtml(n.author)}</small>
                </div>`).join('') + `<div><a href="news.html" class="btn btn-sm btn-outline-primary"><i class="fas fa-newspaper me-1"></i>All News</a></div>`;
        }
    }

    // Upcoming Workshop
    if (workshopContainer) {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = staticData.workshops.filter(w => w.date >= today).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
        if (!upcoming) {
            workshopContainer.innerHTML = `<p class="text-muted">No upcoming workshops. <a href="workshops.html">View Workshops</a></p>`;
        } else {
            workshopContainer.innerHTML = `
                <div class="d-flex align-items-start mb-2">
                    <i class="fas fa-calendar me-2 text-success"></i>
                    <div>
                        <strong>${escapeHtml(upcoming.title)}</strong><br>
                        <small class="text-muted">${upcoming.date}${upcoming.location ? ' • ' + escapeHtml(upcoming.location) : ''}</small>
                    </div>
                </div>
                <a href="workshops.html" class="btn btn-sm btn-outline-success"><i class="fas fa-calendar-alt me-1"></i>All Workshops</a>`;
        }
    }

    // Research
    if (researchContainer) {
        const recent = staticData.research.slice(0, 3);
        if (recent.length === 0) {
            researchContainer.innerHTML = `<p class="text-muted">No research items yet. <a href="research.html">View Research</a></p>`;
        } else {
            researchContainer.innerHTML = recent.map(r => `
                <div class="mb-3 pb-3 border-bottom">
                    <div class="d-flex justify-content-between">
                        <strong>${escapeHtml(r.title)}</strong>
                        <small class="text-muted">${r.date || ''}</small>
                    </div>
                    <small class="text-muted">${escapeHtml(r.type || '')}</small>
                </div>`).join('') + `<div><a href="research.html" class="btn btn-sm btn-outline-warning"><i class="fas fa-microscope me-1"></i>All Research</a></div>`;
        }
    }

    // Team
    if (teamContainer) {
        const sample = staticData.consortium.slice(0, 3);
        if (sample.length === 0) {
            teamContainer.innerHTML = `<p class="text-muted">No team members yet. <a href="team.html">Meet Our Team</a></p>`;
        } else {
            teamContainer.innerHTML = sample.map(m => `
                <div class="d-flex align-items-center mb-3">
                    <div class="me-3 team-photo-container" style="width:48px;height:48px;border-radius:50%;overflow:hidden;">
                        ${m.photo ? `<img src="${escapeHtml(m.photo)}" alt="${escapeHtml(m.name)}" style="width:100%;height:100%;object-fit:cover;">` : `<i class=\"fas fa-user-circle fa-2x text-eu-blue\"></i>`}
                    </div>
                    <div>
                        <div><strong>${escapeHtml(m.name)}</strong></div>
                        <small class="text-muted">${escapeHtml(m.position || m.role || '')}</small>
                    </div>
                </div>`).join('') + `<div><a href="team.html" class="btn btn-sm btn-outline-info"><i class="fas fa-users me-1"></i>Full Team</a></div>`;
        }
    }

    // Measurements: setup map and chart if containers exist
    const mapEl = document.getElementById('measurementsMap');
    const chartEl = document.getElementById('measurementsChart');
    if (mapEl) {
        // If Leaflet isn't loaded yet, retry a few times before giving up
        let attempts = 0;
        const tryInit = () => {
            if (window.L) {
                setupMeasurementsDashboard(measSelect, measStatus, mapEl, chartEl || null);
            } else if (attempts < 10) {
                attempts++;
                setTimeout(tryInit, 300);
            } else if (measStatus) {
                measStatus.innerHTML = '<span class="text-warning">Map library not loaded.</span>';
            }
        };
        tryInit();
    }
}

function setupMeasurementsDashboard(selectEl, statusEl, mapEl, chartCanvas) {
    const stations = staticData.measurements?.stations || [];
    if (!stations.length) {
        if (statusEl) statusEl.innerHTML = '<span class="text-muted">No measurement data available.</span>';
        return;
    }

    // Populate station selector
    if (selectEl) {
        selectEl.innerHTML = stations.map((s, i) => `<option value="${s.id || i}">${escapeHtml(s.name || s.id || 'Station')}</option>`).join('');
    }

    // Initialize Leaflet map
    let map;
    if (window.L && mapEl) {
        map = L.map(mapEl).setView([stations[0].lat, stations[0].lon], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        const markers = [];
        const bounds = [];
        stations.forEach((s, idx) => {
            if (typeof s.lat === 'number' && typeof s.lon === 'number') {
                const m = L.marker([s.lat, s.lon]).addTo(map);
                const latest = (s.timeseries || []).slice(-1)[0];
                const lvl = latest ? latest.level : '—';
                m.bindPopup(`<strong>${escapeHtml(s.name || s.id || 'Station')}</strong><br>Latest level: ${lvl} ${escapeHtml(s.unit || '')}`);
                m.on('click', () => {
                    if (selectEl) selectEl.value = s.id || idx;
                    if (chartCanvas) drawMeasurementChart(chartCanvas, s);
                });
                markers.push(m);
                bounds.push([s.lat, s.lon]);
            }
        });
        if (bounds.length) {
            try { map.fitBounds(bounds, { padding: [20, 20] }); } catch { }
        }
        window._dhMap = map;
    } else if (statusEl) {
        statusEl.innerHTML = '<span class="text-warning">Map library not loaded.</span>';
    }

    // Chart.js plot
    if (stations[0] && chartCanvas) drawMeasurementChart(chartCanvas, stations[0]);

    if (selectEl) {
        selectEl.addEventListener('change', (e) => {
            const value = e.target.value;
            const found = stations.find((s, i) => (s.id || i.toString()) === value);
            if (found && chartCanvas) drawMeasurementChart(chartCanvas, found);
        });
    }
}

function drawMeasurementChart(canvas, station) {
    if (!window.Chart || !canvas) return;
    const ctx = canvas.getContext('2d');
    const data = (station.timeseries || []).map(p => ({ x: new Date(p.t), y: p.level }));
    const label = `${station.name || station.id || 'Station'} (${station.unit || ''})`;

    if (window._dhChart) {
        window._dhChart.data.datasets[0].label = label;
        window._dhChart.data.datasets[0].data = data;
        window._dhChart.update();
        return;
    }

    window._dhChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label,
                data,
                borderColor: '#003399',
                backgroundColor: 'rgba(0,51,153,0.1)',
                pointRadius: 0,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            parsing: false,
            scales: {
                x: { type: 'time', time: { unit: 'day' }, title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: station.unit || '' } }
            },
            plugins: {
                legend: { display: true },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
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

    const partnersHtml = staticData.consortium.map(partner => {
        const name = escapeHtml(partner.name || '');
        const position = escapeHtml(partner.position || partner.role || '');
        const desc = partner.description_html || (partner.description ? `<p class="small text-muted">${escapeHtml(partner.description)}</p>` : '');
        const photo = partner.photo ? `<div class="team-photo-container mb-3"><img class="team-photo" src="${escapeHtml(partner.photo)}" alt="${name} photo"></div>`
            : `<div class="team-photo-container mb-3 placeholder"><i class="fas fa-user-circle fa-5x text-eu-blue"></i></div>`;
        const socialLinks = [
            partner.linkedin ? `<a href="${escapeHtml(partner.linkedin)}" class="me-2" target="_blank" rel="noopener"><i class="fab fa-linkedin fa-lg"></i></a>` : '',
            partner.researchgate ? `<a href="${escapeHtml(partner.researchgate)}" class="me-2" target="_blank" rel="noopener"><i class="fab fa-researchgate fa-lg"></i></a>` : '',
            partner.website ? `<a href="${escapeHtml(partner.website)}" target="_blank" rel="noopener"><i class="fas fa-globe fa-lg"></i></a>` : ''
        ].join('');

        return `
        <div class="col-lg-4 col-md-6">
            <div class="card h-100 shadow-sm hover-card">
                <div class="card-body text-center p-4">
                    ${photo}
                    <h5 class="card-title mb-1">${name}</h5>
                    ${position ? `<p class="text-muted small mb-2">${position}</p>` : ''}
                    ${desc || ''}
                    ${socialLinks ? `<div class="social-links mt-2">${socialLinks}</div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

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
function addNewsItem(title, content, author = 'Admin', extra = {}) {
    const newItem = {
        id: Date.now(),
        title: title,
        content: content,
        author: author,
        date: new Date().toISOString().split('T')[0]
    };

    if (extra && extra.media) {
        newItem.media = extra.media;
    }

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
 * Delete a news item locally by id, refresh UI, and notify for optional repo sync
 */
function deleteNewsItem(id) {
    const idx = staticData.news.findIndex(n => n.id === id);
    if (idx === -1) return false;
    const item = staticData.news[idx];
    const ok = window.confirm(`Delete this news item: "${item.title}"?`);
    if (!ok) return false;
    staticData.news.splice(idx, 1);
    saveToLocalStorage();

    // Refresh UI where applicable
    const page = getCurrentPageName();
    if (page === 'index.html' || page === '' || page === '/') {
        populateLatestNews();
    }
    if (page === 'news.html') {
        populateNewsPage();
    }

    // Broadcast an event so pages like news.html can attempt repo deletion
    try {
        window.dispatchEvent(new CustomEvent('dh:news-deleted', { detail: { id: item.id, title: item.title, content_file: item.content_file || '' } }));
    } catch { }
    return true;
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
    deleteNewsItem,
    addWorkshop,
    getAllData,
    importData,
    staticData,
    saveToLocalStorage,
    populateCurrentPage
};
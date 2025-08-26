// news.js
// Loads news items from data/news.json and renders them as blocks, supporting markdown content.


// List of markdown files to use as news posts

const NEWS_MARKDOWN_FILES = [
    'content/news/intro.md',
    'content/news/first-workshop.md',
    'content/news/placeholder.md'
];

// Supported media extensions
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const VIDEO_EXTS = ['mp4', 'webm', 'ogg'];

function getMediaElement(baseName) {
    // Try to find a media file in content/news/media/ with the same base name
    for (const ext of IMAGE_EXTS) {
        const imgPath = `content/news/media/${baseName}.${ext}`;
        if (window.NEWS_MEDIA_FILES && window.NEWS_MEDIA_FILES.includes(imgPath)) {
            return `<img src="${imgPath}" alt="${baseName}" class="img-fluid rounded mb-3">`;
        }
    }
    for (const ext of VIDEO_EXTS) {
        const vidPath = `content/news/media/${baseName}.${ext}`;
        if (window.NEWS_MEDIA_FILES && window.NEWS_MEDIA_FILES.includes(vidPath)) {
            return `<video src="${vidPath}" controls style="max-width:100%;border-radius:8px;margin-bottom:1rem;"></video>`;
        }
    }
    return '';
}

async function fetchMarkdown(path) {
    const response = await fetch(path);
    if (!response.ok) return '';
    return await response.text();
}

function extractTitleAndDate(md, fallbackTitle) {
    // Extract first H1 or H2 as title, and try to find a date (YYYY-MM-DD)
    let title = fallbackTitle;
    let date = '';
    const lines = md.split('\n');
    for (const line of lines) {
        const h = line.match(/^#\s+(.+)/) || line.match(/^##\s+(.+)/);
        if (h) {
            title = h[1].trim();
            break;
        }
    }
    const dateMatch = md.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (dateMatch) date = dateMatch[1];
    return { title, date };
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

async function renderNews() {
    const container = document.getElementById('news-container');
    container.innerHTML = '';
    if (!NEWS_MARKDOWN_FILES.length) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info text-center">No news available.</div></div>';
        return;
    }
    for (const file of NEWS_MARKDOWN_FILES) {
        const md = await fetchMarkdown(file);
        if (!md.trim()) continue;
        const baseName = file.split('/').pop().replace(/\.md$/, '');
        const { title, date } = extractTitleAndDate(md, baseName);
        let htmlContent = (window.Markdown && typeof window.Markdown.renderMarkdown === 'function')
            ? window.Markdown.renderMarkdown(md)
            : md;
        // Insert media at the top if available
        const mediaElem = getMediaElement(baseName);
        const col = document.createElement('div');
        col.className = 'col-12 col-md-10 col-lg-8';
        col.innerHTML = `
            <article class="card news-elegant fade-in">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-2 news-meta">
                        ${date ? `<span class="badge bg-eu-blue me-2"><i class="fas fa-calendar-alt me-1"></i> ${formatDate(date)}</span>` : ''}
                    </div>
                    <h2 class="h4 card-title">${title}</h2>
                    <div class="news-content card-text">${mediaElem}${htmlContent}</div>
                </div>
            </article>
        `;
        container.appendChild(col);
    }
}

document.addEventListener('DOMContentLoaded', renderNews);

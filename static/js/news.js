// news.js
// Loads news items from markdown files with frontmatter (DecapCMS compatible)

// List of markdown files to use as news posts
const NEWS_MARKDOWN_FILES = [
    'content/news/2025-12-01-new-publication-7000-year-human-legacy.md',
    'content/news/2025-08-01-welcome-to-delta-hub.md'
    // Add new news files here (or they will be auto-added by DecapCMS)
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

function parseFrontmatter(content) {
    // Parse YAML frontmatter from markdown
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return { metadata: {}, content: content };
    }

    const frontmatter = match[1];
    const body = match[2];
    const metadata = {};

    frontmatter.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            metadata[key] = value;
        }
    });

    return { metadata, content: body };
}

function extractTitleAndDate(md, fallbackTitle) {
    // Try to parse frontmatter first
    const { metadata, content } = parseFrontmatter(md);

    if (metadata.title && metadata.date) {
        return {
            title: metadata.title,
            date: metadata.date,
            image: metadata.image,
            summary: metadata.summary,
            body: content
        };
    }

    // Fallback: Extract first H1 or H2 as title, and try to find a date (YYYY-MM-DD)
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
    return { title, date, body: md };
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
        container.innerHTML = '<div class="col-12"><div class="alert alert-info text-center">News will return soon.</div></div>';
        return;
    }

    // Collect all articles with parsed data
    const articles = [];
    for (const file of NEWS_MARKDOWN_FILES) {
        const md = await fetchMarkdown(file);
        if (!md.trim()) continue;
        const baseName = file.split('/').pop().replace(/\.md$/, '');
        const articleData = extractTitleAndDate(md, baseName);
        articles.push({ ...articleData, baseName });
    }

    // Sort by date (newest first)
    articles.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });

    // Render articles
    for (const article of articles) {
        const { title, date, image, body, baseName } = article;

        let htmlContent = (window.Markdown && typeof window.Markdown.renderMarkdown === 'function')
            ? window.Markdown.renderMarkdown(body || '')
            : body;

        // Use frontmatter image or fallback to media element
        let mediaElem = '';
        if (image) {
            mediaElem = `<img src="${image}" alt="${title}" class="img-fluid rounded mb-3">`;
        } else {
            mediaElem = getMediaElement(baseName);
        }

        const col = document.createElement('div');
        col.className = 'col-12 col-md-10 col-lg-8';
        // Add ID to the article for anchor linking
        col.id = baseName;
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

document.addEventListener('DOMContentLoaded', () => {
    // Only run renderNews if we're on the news page
    const newsContainer = document.getElementById('news-container');
    if (newsContainer) {
        renderNews().then(() => {
            // If there's a hash in the URL, scroll to that article
            if (window.location.hash) {
                const targetId = window.location.hash.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    setTimeout(() => {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Add a highlight effect
                        targetElement.classList.add('highlight-article');
                        setTimeout(() => {
                            targetElement.classList.remove('highlight-article');
                        }, 2000);
                    }, 300);
                }
            }
        });
    }
});

// Homepage news loader - shows recent news items with summaries
// Reuses functions from news.js

async function loadHomePageNews() {
    const container = document.getElementById('latestNews');
    if (!container) return;

    try {
        // Wait for news.js to load
        if (typeof NEWS_MARKDOWN_FILES === 'undefined') {
            console.error('NEWS_MARKDOWN_FILES not defined - news.js may not be loaded');
            container.innerHTML = '<div class="alert alert-warning">Unable to load news. Please refresh the page.</div>';
            return;
        }

        if (!NEWS_MARKDOWN_FILES.length) {
            container.innerHTML = '<div class="alert alert-info">News coming soon!</div>';
            return;
        }

        // Check if required functions exist
        if (typeof extractTitleAndDate === 'undefined' || typeof formatDate === 'undefined') {
            console.error('Required functions not available from news.js');
            container.innerHTML = '<div class="alert alert-warning">Unable to load news. Please refresh the page.</div>';
            return;
        }

        // Collect all articles
        const articles = [];
        for (const file of NEWS_MARKDOWN_FILES) {
            try {
                const response = await fetch(file);
                if (!response.ok) continue;
                const md = await response.text();
                const baseName = file.split('/').pop().replace(/\.md$/, '');
                const articleData = extractTitleAndDate(md, baseName);
                // Create a slug from the basename for linking
                const slug = baseName;
                articles.push({ ...articleData, baseName, slug });
            } catch (err) {
                console.warn(`Failed to load ${file}:`, err);
            }
        }

        // Sort by date (newest first)
        articles.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Show only the 3 most recent
        const recentArticles = articles.slice(0, 3);

        if (recentArticles.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No news articles available yet.</div>';
            return;
        }

        // Render articles
        container.innerHTML = '';
        recentArticles.forEach(article => {
            const card = createHomeNewsCard(article);
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading homepage news:', error);
        container.innerHTML = '<div class="alert alert-danger">Failed to load news.</div>';
    }
}

function createHomeNewsCard(article) {
    const card = document.createElement('div');
    card.className = 'card mb-3 shadow-sm';

    const { title, date, image, summary, slug } = article;

    let imageHtml = '';
    if (image) {
        imageHtml = `
            <div class="row g-0">
                <div class="col-md-4">
                    <img src="${image}" class="img-fluid rounded-start" alt="${title}"
                         style="height: 100%; object-fit: cover; max-height: 200px;">
                </div>
                <div class="col-md-8">
        `;
    } else {
        imageHtml = '<div class="row g-0"><div class="col-12">';
    }

    const closeDiv = image ? '</div></div>' : '</div>';

    card.innerHTML = `
        ${imageHtml}
            <div class="card-body">
                <h5 class="card-title text-eu-blue">${title}</h5>
                ${date ? `<p class="text-muted small mb-2">
                    <i class="fas fa-calendar me-1"></i>${formatDate(date)}
                </p>` : ''}
                <p class="card-text">${summary || ''}</p>
                <a href="news.html#${slug}" class="btn btn-sm btn-outline-primary">
                    Read more <i class="fas fa-arrow-right ms-1"></i>
                </a>
            </div>
        ${closeDiv}
    `;

    return card;
}

// Load news when page loads
document.addEventListener('DOMContentLoaded', loadHomePageNews);

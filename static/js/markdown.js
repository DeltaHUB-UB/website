/* Minimal Markdown rendering using marked CDN fallback if needed.
   This module exposes a single function: renderMarkdown(md) -> HTML string.
   If a global marked is present, it will use it; otherwise, a very small
   fallback renderer handles basic paragraphs and line breaks. */
(function (global) {
    function basicRender(md) {
        if (!md) return '';
        // Very basic fallback: escape and convert double newlines to paragraphs
        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return esc(md)
            .split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n');
    }
    function renderMarkdown(md) {
        let html;
        if (global.marked && typeof global.marked.parse === 'function') {
            html = global.marked.parse(md || '');
        } else {
            html = basicRender(md);
        }
        if (global.DOMPurify && typeof global.DOMPurify.sanitize === 'function') {
            return global.DOMPurify.sanitize(html);
        }
        return html;
    }
    global.Markdown = { renderMarkdown };

    // Auto-include: fetch and render Markdown into any element with [data-markdown]
    async function loadMarkdownIncludes() {
        const nodes = document.querySelectorAll('[data-markdown]');
        const fetchMd = async (path) => {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`Failed to load ${path}`);
            return await res.text();
        };
        for (const el of nodes) {
            const src = el.getAttribute('data-markdown');
            if (!src) continue;
            try {
                const md = await fetchMd(src);
                el.innerHTML = renderMarkdown(md);
            } catch (e) {
                console.warn('Markdown include failed:', src, e);
            }
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadMarkdownIncludes);
    } else {
        loadMarkdownIncludes();
    }
})(window);

# News Management System Setup

This website uses DecapCMS for easy news management. You can create and edit news posts through a web interface.

## How to Add News Posts

### Option 1: Using DecapCMS (Recommended)

1. **First-time Setup** (one-time only):
   - Go to your site's admin page: `https://yourdomain.com/admin`
   - You'll need to set up authentication with GitHub
   - Follow DecapCMS documentation for GitHub backend setup: https://decapcms.org/docs/github-backend/

2. **Adding a News Post**:
   - Navigate to `/admin` on your website
   - Click "New News"
   - Fill in the fields:
     - **Title**: News article title
     - **Publish Date**: When the article was published
     - **Featured Image**: Upload an image (optional)
     - **Summary**: Short summary for homepage preview
     - **Body**: Full article content (supports markdown)
   - Click "Save" and then "Publish"
   - The news will automatically appear on your website!

### Option 2: Manual Method

1. **Create a Markdown File**:
   - Navigate to `content/news/`
   - Create a new file with format: `YYYY-MM-DD-title.md` (e.g., `2025-01-15-workshop-announcement.md`)

2. **Add Frontmatter and Content**:
   ```markdown
   ---
   title: "Workshop on Delta Modeling"
   date: 2025-01-15T10:00:00.000Z
   image: "content/images/news/workshop-2025.jpg"
   summary: "Join us for an exciting workshop on advanced delta modeling techniques."
   ---

   ## Full Article Content

   Your full article text goes here...

   You can use **markdown** formatting, add images, links, etc.
   ```

3. **Add Images** (optional):
   - Upload images to `content/images/news/`
   - Reference them in your markdown using the path shown above

4. **Register the File**:
   - Open `static/js/news.js`
   - Add your new file to the `NEWS_MARKDOWN_FILES` array:
     ```javascript
     const NEWS_MARKDOWN_FILES = [
         'content/news/2024-12-01-welcome-to-delta-hub.md',
         'content/news/2025-01-15-workshop-announcement.md'  // Add your new file
     ];
     ```

5. **Commit and Push**:
   ```bash
   git add content/news/YYYY-MM-DD-your-news.md content/images/news/your-image.jpg static/js/news.js
   git commit -m "Add news: Your News Title"
   git push
   ```

## Where News Appears

- **Homepage** (`index.html`): Shows 3 most recent news items with summaries
- **News Page** (`news.html`): Shows all news articles with full content, sorted by date (newest first)

## File Structure

```
website/
├── admin/
│   ├── index.html          # DecapCMS admin interface
│   └── config.yml          # DecapCMS configuration
├── content/
│   ├── news/               # News markdown files
│   │   └── YYYY-MM-DD-title.md
│   └── images/
│       └── news/           # News images
├── static/
│   └── js/
│       ├── news.js         # News loader script
│       └── homepage-news.js # Homepage news preview
└── NEWS_SETUP.md          # This file
```

## Troubleshooting

**News not showing up?**
1. Check that the markdown file has proper frontmatter (between `---`)
2. Make sure the file is added to `NEWS_MARKDOWN_FILES` in `static/js/news.js`
3. Clear browser cache and refresh

**Images not loading?**
1. Verify image path is correct in frontmatter
2. Ensure image is uploaded to `content/images/news/`
3. Check file extension matches (jpg, png, etc.)

## Next Steps

For production use with DecapCMS:
1. Set up GitHub backend authentication
2. Configure Netlify Identity or GitHub OAuth
3. See DecapCMS docs: https://decapcms.org/docs/intro/

For questions, contact the web development team.

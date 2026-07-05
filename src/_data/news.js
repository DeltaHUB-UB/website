import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true });

const NEWS_DIR = path.join(process.cwd(), "content", "news");
const MEDIA_DIR = path.join(NEWS_DIR, "media");

const HIDDEN = new Set([
  "2025-08-22-masuratori-baliza.md",
  "2025-08-23-infoclima-delta-hub.md",
]);

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp"];
const VIDEO_EXTS = ["mp4", "webm", "ogg"];

function parseFrontmatter(raw) {
  try {
    return matter(raw);
  } catch {
    const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!m) return { data: {}, content: raw };
    const data = {};
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) {
        const key = line.slice(0, i).trim();
        let value = line.slice(i + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        data[key] = value;
      }
    }
    return { data, content: m[2] };
  }
}

function fallbackTitleAndDate(content, slug) {
  let title = slug;
  for (const line of content.split("\n")) {
    const h = line.match(/^#\s+(.+)/) || line.match(/^##\s+(.+)/);
    if (h) { title = h[1].trim(); break; }
  }
  const dateMatch = content.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return { title, date: dateMatch ? dateMatch[1] : "" };
}

function findMedia(slug) {
  for (const ext of IMAGE_EXTS) {
    if (fs.existsSync(path.join(MEDIA_DIR, `${slug}.${ext}`)))
      return { type: "image", url: `content/news/media/${slug}.${ext}` };
  }
  for (const ext of VIDEO_EXTS) {
    if (fs.existsSync(path.join(MEDIA_DIR, `${slug}.${ext}`)))
      return { type: "video", url: `content/news/media/${slug}.${ext}` };
  }
  return null;
}

export default function () {
  const files = fs
    .readdirSync(NEWS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f) && !HIDDEN.has(f));

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(NEWS_DIR, file), "utf8");
    const { data, content } = parseFrontmatter(raw);
    const slug = file.replace(/\.md$/, "");

    let title = data.title;
    let date = data.date;
    if (!title || !date) {
      const fb = fallbackTitleAndDate(content, slug);
      title = title || fb.title;
      date = date || fb.date;
    }
    const dateObj = date instanceof Date ? date : new Date(date);
    const html = md.render(content);

    let excerpt = data.summary || "";
    if (!excerpt) {
      const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      excerpt = plain.length > 180 ? plain.slice(0, 180).replace(/\s\S*$/, "") + "\u2026" : plain;
    }

    return {
      slug,
      title,
      date: dateObj,
      image: data.image || null,
      media: data.image ? null : findMedia(slug),
      summary: data.summary || "",
      excerpt,
      html,
    };
  });

  posts.sort((a, b) => b.date - a.date);
  return posts;
}

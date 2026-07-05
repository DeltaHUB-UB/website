# Decap CMS — how to use and finish setup

The CMS lives at `/admin` and edits: **News**, **Page texts** (hero, about,
intros), **Team members**, and **Workshops**. Every save is a git commit, and
every commit triggers the GitHub Actions build — changes go live in ~2 minutes.

## Editing locally (works right now, no setup)

```bash
npm run dev          # terminal 1 — site at http://localhost:8080
npx decap-server     # terminal 2 — local CMS backend
```

Open <http://localhost:8080/admin/> — no login needed. Edits write directly to
the files in this folder; review with `git diff`, then commit and push.

## Editing in the browser on the live site (one-time setup)

GitHub Pages can't run the OAuth handshake itself, so you need a tiny free
proxy. Recommended: a Cloudflare Worker.

1. **Create a GitHub OAuth App** (GitHub → Settings → Developer settings →
   OAuth Apps → New):
   - Homepage URL: `https://delta-hub.unibuc.ro`
   - Authorization callback URL: `https://<your-worker>.workers.dev/callback`
   - Note the Client ID and generate a Client Secret.

2. **Deploy the OAuth proxy** (free Cloudflare account):
   - Use <https://github.com/sveltia/sveltia-cms-auth> (compatible with Decap)
     — "Deploy to Cloudflare Workers" button, then set the environment
     variables `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
   - Other options: <https://decapcms.org/docs/external-oauth-clients/>

3. **Point the CMS at the proxy**: in `admin/config.yml`, uncomment and set

   ```yaml
   base_url: https://<your-worker>.workers.dev
   ```

4. Push. Anyone with write access to the `DeltaHUB-UB/website` repo can now
   log in at `https://delta-hub.unibuc.ro/admin/` with GitHub.

## Notes

- New news posts created in the CMS are named `YYYY-MM-DD-title.md`
  automatically and appear on the site after the next build — nothing else to do.
- Uploaded news images go to `content/images/News/`; team photos to
  `content/images/Photos_people/`; workshop posters to `content/workshops/`.
- The "description file" field on workshops is advanced/optional — prefer the
  plain Description field for new workshops.

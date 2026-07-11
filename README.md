# Grabit — multi-platform downloader

## Deploy (Android, no PC)
1. Push this folder to a GitHub repo (GitHub mobile app or `git` via Termux).
2. In Vercel: **New Project → Import** that repo. No env vars needed to start.
3. Vercel auto-detects `/api/*.js` as serverless functions and serves `index.html` at the root.

## Adding Adsterra
- Open `index.html`, find the `#adBannerTop` div — paste your Banner ad script tag there.
- For a Social Bar / Popunder, paste that script tag right before `</body>`.
- Get the exact script + zone key from your Adsterra dashboard → **Websites → your domain → ad unit**.

## Endpoints
- `GET /api/instagram?url=...`
- `GET /api/tiktok?url=...`
- `GET /api/facebook?url=...`
- `GET /api/youtube?url=...`
- `GET /api/download?url=...&platform=...&filename=...` — proxies the actual file so the browser downloads it instead of playing it inline, and fixes CORS/Referer issues.
- `GET /api/preview?url=...&platform=...` — same idea but streams inline (no forced download) and forwards Range requests, so the result card can show a real playable/scrubbable video instead of just a thumbnail.

All four return the same shape:
```json
{ "success": true, "title": "...", "thumbnail": "...", "downloads": [{ "type": "video", "quality": "HD", "url": "..." }] }
```

## Reliability — read this before you're confused why something "stopped working"
These are scrapers, not official APIs. Each platform can change its page structure at any time:
- **TikTok**: usually the most stable of the four; breaks if TikTok renames the `__UNIVERSAL_DATA_FOR_REHYDRATION__` script or restructures `itemStruct`.
- **Instagram**: breaks if Meta changes the embed page markup or starts requiring login for embeds (has happened before).
- **Facebook**: least reliable. Some videos only expose `hd_src`/`sd_src` on the *old* facebook.com markup, not the current one — you may need to swap the embed URL scraped in `api/facebook.js` if extraction rate drops.
- **YouTube**: technically breaks YouTube's Terms of Service. It's also the one most likely to get your Vercel deployment's outbound IP throttled — if it starts failing broadly, that's usually why.

When any of these breaks, the fix is always the same shape: fetch the page fresh, view-source it, find where the new JSON/meta tag lives, and update the regex/selector in that one file.

## Legal note
This only works on **public** posts/videos. It doesn't bypass login walls or private content. Downloading copyrighted content still isn't authorized by the copyright holder just because a tool exists to do it — that's on however the shop's users end up using it, same as any other downloader site.

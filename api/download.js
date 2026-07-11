const axios = require("axios");

// Frontend points its "Download" button here instead of the raw CDN url.
// This fixes two things at once: (1) CORS — the browser is downloading
// from your own domain, not TikTok/FB's CDN, and (2) some CDNs (TikTok
// especially) reject requests without a matching Referer header, which
// we can set here but a browser fetch from a different origin can't.

const REFERERS = {
  tiktok: "https://www.tiktok.com/",
  facebook: "https://www.facebook.com/",
  instagram: "https://www.instagram.com/",
  youtube: "https://www.youtube.com/",
};

module.exports = async (req, res) => {
  const { url, platform = "", filename = "download" } = req.query;
  if (!url) return res.status(400).send("Missing url parameter");

  try {
    const upstream = await axios.get(url, {
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36",
        Referer: REFERERS[platform] || "",
      },
      timeout: 25000,
    });

    const ext = (upstream.headers["content-type"] || "").includes("audio") ? "mp3" : "mp4";
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.${ext}"`);
    res.setHeader("Content-Type", upstream.headers["content-type"] || "video/mp4");
    upstream.data.pipe(res);
  } catch (err) {
    res.status(500).send("Download proxy failed: " + err.message);
  }
};

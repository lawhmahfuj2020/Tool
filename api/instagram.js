const axios = require("axios");

// Instagram has no public download API. This scrapes the embed page,
// which exposes media without login for PUBLIC posts/reels only.
// It WILL break whenever Instagram changes its embed markup — that's
// the nature of every IG downloader, not a bug specific to this code.

function extractShortcode(url) {
  const match = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: "Missing url parameter" });

  const shortcode = extractShortcode(url);
  if (!shortcode) {
    return res.status(400).json({ success: false, error: "Not a valid Instagram post/reel link" });
  }

  try {
    const embedUrl = `https://www.instagram.com/${shortcode}/embed/captioned/`;
    const { data: html } = await axios.get(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      },
      timeout: 15000,
    });

    const videoMatch = html.match(/"video_url":"([^"]+)"/);
    const imageMatch = html.match(/"display_url":"([^"]+)"/);
    const captionMatch = html.match(/"caption":"([^"]*)"/);

    if (!videoMatch && !imageMatch) {
      return res.status(422).json({
        success: false,
        error: "Could not extract media. Post may be private, age-restricted, or IG changed its markup.",
      });
    }

    const clean = (s) => s ? s.replace(/\\u0026/g, "&").replace(/\\\//g, "/") : null;

    return res.status(200).json({
      success: true,
      platform: "instagram",
      title: clean(captionMatch && captionMatch[1]) || "Instagram media",
      thumbnail: clean(imageMatch && imageMatch[1]),
      downloads: [
        videoMatch && { type: "video", quality: "original", url: clean(videoMatch[1]) },
        imageMatch && { type: "image", quality: "original", url: clean(imageMatch[1]) },
      ].filter(Boolean),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Fetch failed: " + err.message });
  }
};

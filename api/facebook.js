const axios = require("axios");

// Facebook is the least reliable of the four — most success comes from
// requesting the mbasic (lite) version of the page, which still ships
// plain <video> source URLs for PUBLIC videos/reels/watch links.

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: "Missing url parameter" });

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36",
      },
      timeout: 15000,
    });

    const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/);
    const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/);
    const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/);
    const thumbMatch = html.match(/<meta property="og:image" content="([^"]*)"/);

    const clean = (s) => s ? s.replace(/\\u0026/g, "&").replace(/\\\//g, "/") : null;

    if (!hdMatch && !sdMatch) {
      return res.status(422).json({
        success: false,
        error: "Could not extract video. Facebook link may be private, or FB changed its markup — try the mbasic.facebook.com version of the link.",
      });
    }

    return res.status(200).json({
      success: true,
      platform: "facebook",
      title: clean(titleMatch && titleMatch[1]) || "Facebook video",
      thumbnail: clean(thumbMatch && thumbMatch[1]),
      downloads: [
        hdMatch && { type: "video", quality: "HD", url: clean(hdMatch[1]) },
        sdMatch && { type: "video", quality: "SD", url: clean(sdMatch[1]) },
      ].filter(Boolean),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Fetch failed: " + err.message });
  }
};

const axios = require("axios");

// Same idea as download.js, but no Content-Disposition — this streams
// inline so a <video> tag can play/scrub it, and it forwards Range
// requests so seeking works instead of reloading the whole file.

const REFERERS = {
  tiktok: "https://www.tiktok.com/",
  facebook: "https://www.facebook.com/",
  instagram: "https://www.instagram.com/",
  youtube: "https://www.youtube.com/",
};

module.exports = async (req, res) => {
  const { url, platform = "" } = req.query;
  if (!url) return res.status(400).send("Missing url parameter");

  try {
    const upstream = await axios.get(url, {
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36",
        Referer: REFERERS[platform] || "",
        Range: req.headers.range || "",
      },
      validateStatus: () => true,
      timeout: 25000,
    });

    res.status(upstream.status);
    ["content-type", "content-length", "content-range", "accept-ranges"].forEach((h) => {
      if (upstream.headers[h]) res.setHeader(h, upstream.headers[h]);
    });
    res.setHeader("Accept-Ranges", "bytes");
    upstream.data.pipe(res);
  } catch (err) {
    res.status(500).send("Preview proxy failed: " + err.message);
  }
};

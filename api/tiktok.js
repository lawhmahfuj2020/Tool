const axios = require("axios");

// Pulls the embedded __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON that TikTok
// ships on every video page (no login needed for public videos).

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: "Missing url parameter" });

  try {
    // Resolve short links (vm.tiktok.com / vt.tiktok.com) to the full video URL first.
    const resolved = await axios.get(url, {
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36" },
      timeout: 15000,
    });

    const html = resolved.data;
    const scriptMatch = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );

    if (!scriptMatch) {
      return res.status(422).json({
        success: false,
        error: "Could not extract video data. TikTok may have changed its page structure.",
      });
    }

    const json = JSON.parse(scriptMatch[1]);
    const detail =
      json?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;

    if (!detail) {
      return res.status(422).json({ success: false, error: "Video data not found (private or removed video)." });
    }

    const noWatermark = detail.video?.playAddr;
    const withWatermark = detail.video?.downloadAddr;
    const cover = detail.video?.cover || detail.video?.originCover;

    return res.status(200).json({
      success: true,
      platform: "tiktok",
      title: detail.desc || "TikTok video",
      author: detail.author?.uniqueId,
      thumbnail: cover,
      downloads: [
        noWatermark && { type: "video", quality: "no watermark", url: noWatermark },
        withWatermark && { type: "video", quality: "watermarked", url: withWatermark },
      ].filter(Boolean),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Fetch failed: " + err.message });
  }
};

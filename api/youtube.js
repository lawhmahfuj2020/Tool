const ytdl = require("@distube/ytdl-core");

// Note: this is the one most likely to get your Vercel deployment's
// outbound IP rate-limited or blocked by YouTube, since it hits their
// player endpoints directly. Expect it to be the flakiest of the four.

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ success: false, error: "Not a valid YouTube URL" });
  }

  try {
    const info = await ytdl.getInfo(url);
    const details = info.videoDetails;

    const formats = ytdl
      .filterFormats(info.formats, "videoandaudio")
      .concat(ytdl.filterFormats(info.formats, "audioonly"))
      .filter((f) => f.url);

    const downloads = formats.slice(0, 8).map((f) => ({
      type: f.hasVideo ? "video" : "audio",
      quality: f.qualityLabel || f.audioBitrate + "kbps",
      container: f.container,
      url: f.url,
    }));

    return res.status(200).json({
      success: true,
      platform: "youtube",
      title: details.title,
      thumbnail: details.thumbnails?.pop()?.url,
      duration: details.lengthSeconds,
      downloads,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Fetch failed: " + err.message });
  }
};

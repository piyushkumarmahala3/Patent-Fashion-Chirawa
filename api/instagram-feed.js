const INSTAGRAM_HOST = "https://graph.instagram.com";
const MAX_PAGES = 4;
const PAGE_SIZE = 50;
const MAX_VIDEOS = 5;

function isInstagramPermalink(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (url.hostname === "www.instagram.com" || url.hostname === "instagram.com") &&
      /^\/(reel|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
  } catch (_) {
    return false;
  }
}

module.exports = async function instagramFeed(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.setHeader("Cache-Control", "no-store");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramUserId = process.env.INSTAGRAM_USER_ID;
  const graphVersion = process.env.INSTAGRAM_API_VERSION || "v26.0";

  if (!accessToken || !instagramUserId) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "Instagram feed is not connected yet" });
  }

  if (!/^\d+$/.test(instagramUserId) || !/^v\d+\.\d+$/.test(graphVersion)) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ error: "Instagram feed configuration is invalid" });
  }

  try {
    const videos = [];
    const seenIds = new Set();
    let after = null;

    for (let page = 0; page < MAX_PAGES && videos.length < MAX_VIDEOS; page += 1) {
      const url = new URL(
        INSTAGRAM_HOST + "/" + graphVersion + "/" +
        encodeURIComponent(instagramUserId) + "/media"
      );
      url.searchParams.set("fields", "id,media_type,permalink,timestamp");
      url.searchParams.set("limit", String(PAGE_SIZE));
      if (after) url.searchParams.set("after", after);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + accessToken
        }
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload || !Array.isArray(payload.data)) {
        console.warn("Instagram feed request failed", {
          status: response.status,
          errorCode: payload && payload.error && payload.error.code
        });
        res.setHeader("Cache-Control", "no-store");
        return res.status(502).json({ error: "Instagram feed is temporarily unavailable" });
      }

      for (const media of payload.data) {
        if (
          media &&
          media.media_type === "VIDEO" &&
          isInstagramPermalink(media.permalink) &&
          !seenIds.has(media.id)
        ) {
          seenIds.add(media.id);
          videos.push({
            id: String(media.id),
            permalink: media.permalink,
            timestamp: media.timestamp || null
          });
        }
      }

      const nextCursor = payload.paging && payload.paging.cursors && payload.paging.cursors.after;
      if (!nextCursor || !payload.paging || !payload.paging.next) break;
      after = nextCursor;
    }

    videos.sort((a, b) => Date.parse(b.timestamp || "") - Date.parse(a.timestamp || ""));
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).json({
      videos: videos.slice(0, MAX_VIDEOS),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn("Instagram feed service error", error && error.name);
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Instagram feed is temporarily unavailable" });
  }
};

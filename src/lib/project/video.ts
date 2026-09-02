const BILIBILI_VIDEO_HOSTS = new Set([
  "bilibili.com",
  "www.bilibili.com",
  "m.bilibili.com",
]);

const BILIBILI_PLAYER_HOST = "player.bilibili.com";
const BILIBILI_BVID_PATTERN = /^BV[0-9A-Za-z]{8,20}$/u;
const BILIBILI_AID_PATTERN = /^av([1-9]\d*)$/iu;

export interface BilibiliProjectVideo {
  provider: "bilibili";
  sourceUrl: string;
  embedUrl: string;
  videoKey: string;
}

function getPartNumber(url: URL): number {
  const value = url.searchParams.get("p");
  if (!value || !/^\d+$/u.test(value)) return 1;

  const partNumber = Number(value);
  return Number.isSafeInteger(partNumber) && partNumber > 0 ? partNumber : 1;
}

function getVideoIdentity(url: URL): { parameter: "bvid" | "aid"; value: string } | null {
  if (BILIBILI_VIDEO_HOSTS.has(url.hostname)) {
    const match = /^\/video\/([^/?#]+)(?:\/|$)/u.exec(url.pathname);
    const id = match?.[1];
    if (!id) return null;

    if (BILIBILI_BVID_PATTERN.test(id)) {
      return { parameter: "bvid", value: id };
    }

    const aidMatch = BILIBILI_AID_PATTERN.exec(id);
    return aidMatch ? { parameter: "aid", value: aidMatch[1] } : null;
  }

  if (url.hostname === BILIBILI_PLAYER_HOST && url.pathname === "/player.html") {
    const bvid = url.searchParams.get("bvid");
    if (bvid && BILIBILI_BVID_PATTERN.test(bvid)) {
      return { parameter: "bvid", value: bvid };
    }

    const aid = url.searchParams.get("aid");
    if (aid && /^[1-9]\d*$/u.test(aid)) {
      return { parameter: "aid", value: aid };
    }
  }

  return null;
}

/** Converts a full Bilibili watch/player URL into the official external player URL. */
export function parseProjectVideoUrl(value: string): BilibiliProjectVideo | null {
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(value);
  } catch {
    return null;
  }

  if (sourceUrl.protocol !== "https:") return null;

  const identity = getVideoIdentity(sourceUrl);
  if (!identity) return null;

  const partNumber = getPartNumber(sourceUrl);
  const embedUrl = new URL("https://player.bilibili.com/player.html");
  embedUrl.searchParams.set(identity.parameter, identity.value);
  embedUrl.searchParams.set("p", String(partNumber));
  embedUrl.searchParams.set("autoplay", "0");
  embedUrl.searchParams.set("poster", "1");
  embedUrl.searchParams.set("danmaku", "0");

  return {
    provider: "bilibili",
    sourceUrl: sourceUrl.toString(),
    embedUrl: embedUrl.toString(),
    videoKey: `${identity.parameter}:${identity.value}:p${partNumber}`,
  };
}

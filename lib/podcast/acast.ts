import { XMLParser } from "fast-xml-parser";

const I_HATE_MUSIC_ACAST_EPISODES_URL =
  "https://shows.acast.com/i-hate-music/episodes";

const I_HATE_MUSIC_ACAST_FEED_URL =
  "https://feeds.acast.com/public/shows/i-hate-music";

export const PODCAST_FEED_REVALIDATE_SECONDS = 3600;

type OptionalArray<T> = T | T[] | undefined;

interface AcastRssChannel {
  title?: string;
  link?: OptionalArray<string>;
  description?: string;
  copyright?: string;
  language?: string;
  image?: {
    url?: string;
    title?: string;
    link?: string;
  };
  item?: OptionalArray<AcastRssEpisode>;
  "itunes:author"?: string;
  "itunes:keywords"?: string;
  "itunes:subtitle"?: string;
  "itunes:summary"?: string;
}

interface AcastRssEpisode {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  enclosure?: {
    "@_url"?: string;
    "@_type"?: string;
    "@_length"?: string;
  };
  "itunes:duration"?: string;
  "itunes:episode"?: number | string;
  "itunes:summary"?: string;
}

interface AcastRssFeed {
  rss?: {
    channel?: AcastRssChannel;
  };
}

export interface PodcastEpisode {
  id: string;
  title: string;
  episodeNumber: string | null;
  publishedAt: string;
  duration: string | null;
  description: string;
  episodeUrl: string | null;
  audioUrl: string | null;
  audioMimeType: string | null;
}

export interface PodcastShow {
  title: string;
  subtitle: string;
  summary: string;
  author: string;
  copyright: string;
  language: string;
  keywords: string[];
  imageUrl: string | null;
  acastEpisodesUrl: string;
  feedUrl: string;
  episodes: PodcastEpisode[];
}

/**
 * Fetches the public Acast RSS feed and converts it into page-ready objects.
 * This stays server-side so the browser never has to parse XML.
 */
export async function getIHateMusicShow(): Promise<PodcastShow> {
  const response = await fetch(I_HATE_MUSIC_ACAST_FEED_URL, {
    next: { revalidate: PODCAST_FEED_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error("Unable to load the I Hate Music Acast feed.");
  }

  const xml = await response.text();
  const parser = new XMLParser({
    attributeNamePrefix: "@_",
    ignoreAttributes: false,
    textNodeName: "#text",
  });
  const feed = parser.parse(xml) as AcastRssFeed;
  const channel = feed.rss?.channel;

  if (!channel) {
    throw new Error("The I Hate Music Acast feed is missing its channel.");
  }

  const episodes = asArray(channel.item).map(mapEpisode);

  return {
    title: channel.title ?? "I Hate Music",
    subtitle: channel["itunes:subtitle"] ?? "",
    summary: cleanAcastText(
      channel["itunes:summary"] ?? channel.description ?? "",
    ),
    author: channel["itunes:author"] ?? "",
    copyright: channel.copyright ?? "",
    language: channel.language ?? "",
    keywords: splitKeywords(channel["itunes:keywords"]),
    imageUrl: cleanTextOrNull(channel.image?.url),
    acastEpisodesUrl: I_HATE_MUSIC_ACAST_EPISODES_URL,
    feedUrl: I_HATE_MUSIC_ACAST_FEED_URL,
    episodes,
  };
}

function mapEpisode(
  episode: AcastRssEpisode,
  fallbackEpisodeIndex: number,
): PodcastEpisode {
  const title = cleanAcastText(
    episode.title ?? `Episode ${fallbackEpisodeIndex + 1}`,
  );
  const episodeNumber =
    episode["itunes:episode"] === undefined
      ? null
      : String(episode["itunes:episode"]);

  return {
    id: episode.link ?? `${title}-${fallbackEpisodeIndex}`,
    title,
    episodeNumber,
    publishedAt: episode.pubDate ?? "",
    duration: episode["itunes:duration"] ?? null,
    description: cleanAcastText(
      episode["itunes:summary"] ?? episode.description ?? "",
    ),
    episodeUrl: cleanTextOrNull(episode.link),
    audioUrl: cleanTextOrNull(episode.enclosure?.["@_url"]),
    audioMimeType: cleanTextOrNull(episode.enclosure?.["@_type"]),
  };
}

function asArray<T>(maybeArrayValue: OptionalArray<T>): T[] {
  if (maybeArrayValue === undefined) return [];
  return Array.isArray(maybeArrayValue) ? maybeArrayValue : [maybeArrayValue];
}

function splitKeywords(rawKeywords: string | undefined): string[] {
  if (!rawKeywords) return [];
  return rawKeywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function cleanTextOrNull(rawText: string | undefined): string | null {
  const cleanedValue = cleanAcastText(rawText ?? "");
  return cleanedValue.length > 0 ? cleanedValue : null;
}

/**
 * RSS descriptions arrive as HTML with Acast's hosted footer attached.
 * The page currently renders safe text previews, not raw external HTML.
 */
function cleanAcastText(rawAcastHtmlText: string): string {
  return decodeHtmlEntities(rawAcastHtmlText)
    .replace(/<hr\s*\/?>[\s\S]*?Hosted on Acast[\s\S]*$/i, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\u2060/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(rawTextWithEntities: string): string {
  return rawTextWithEntities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, codePoint: string) =>
      String.fromCodePoint(Number(codePoint)),
    );
}

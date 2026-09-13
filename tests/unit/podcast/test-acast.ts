import assert from "node:assert/strict";

import {
  getIHateMusicShow,
  PODCAST_FEED_REVALIDATE_SECONDS,
} from "../../../backend/podcast/acast";

async function withMockedFetch<T>(
  response: Pick<Response, "ok" | "text">,
  action: () => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => response as Response) as typeof fetch;

  try {
    return await action();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

/**
 * Verifies the boundary that converts external Acast XML into project-owned
 * podcast data, including defaults and failure messages.
 */
export async function runAcastTests(): Promise<void> {
  const feedXml = `
    <rss>
      <channel>
        <title>I Hate Music Test</title>
        <description><![CDATA[<p>Show &amp; summary</p>]]></description>
        <copyright>Earth In Sound</copyright>
        <language>en</language>
        <itunes:author>Test Host</itunes:author>
        <itunes:keywords>music, production, , metal</itunes:keywords>
        <itunes:subtitle>Test subtitle</itunes:subtitle>
        <image><url>https://example.com/cover.jpg</url></image>
        <item>
          <title>Episode &amp; One</title>
          <link>https://example.com/episode-one</link>
          <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
          <itunes:episode>7</itunes:episode>
          <itunes:duration>01:02:03</itunes:duration>
          <itunes:summary><![CDATA[<p>Episode details</p><hr/>Hosted on Acast. See acast.com/privacy]]></itunes:summary>
          <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" length="123" />
        </item>
      </channel>
    </rss>
  `;

  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;
    return {
      ok: true,
      text: async () => feedXml,
    } as Response;
  }) as typeof fetch;

  try {
    const show = await getIHateMusicShow();

    assert.equal(
      requestedUrl,
      "https://feeds.acast.com/public/shows/i-hate-music",
    );
    assert.equal(
      (requestedInit as RequestInit & { next?: { revalidate?: number } })?.next
        ?.revalidate,
      PODCAST_FEED_REVALIDATE_SECONDS,
    );
    assert.equal(show.title, "I Hate Music Test");
    assert.equal(show.summary, "Show & summary");
    assert.deepEqual(show.keywords, ["music", "production", "metal"]);
    assert.equal(show.imageUrl, "https://example.com/cover.jpg");
    assert.equal(show.episodes.length, 1, "one RSS item should become an array");
    assert.deepEqual(show.episodes[0], {
      id: "https://example.com/episode-one",
      title: "Episode & One",
      episodeNumber: "7",
      publishedAt: "Mon, 01 Jan 2024 12:00:00 GMT",
      duration: "01:02:03",
      description: "Episode details",
      episodeUrl: "https://example.com/episode-one",
      audioUrl: "https://example.com/audio.mp3",
      audioMimeType: "audio/mpeg",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const sparseShow = await withMockedFetch(
    {
      ok: true,
      text: async () => `
        <rss>
          <channel>
            <item><description>Description only</description></item>
            <item><title>Second episode</title></item>
          </channel>
        </rss>
      `,
    },
    () => getIHateMusicShow(),
  );

  assert.equal(sparseShow.title, "I Hate Music");
  assert.equal(sparseShow.subtitle, "");
  assert.equal(sparseShow.imageUrl, null);
  assert.deepEqual(sparseShow.keywords, []);
  assert.equal(sparseShow.episodes.length, 2);
  assert.deepEqual(sparseShow.episodes[0], {
    id: "Episode 1-0",
    title: "Episode 1",
    episodeNumber: null,
    publishedAt: "",
    duration: null,
    description: "Description only",
    episodeUrl: null,
    audioUrl: null,
    audioMimeType: null,
  });

  await assert.rejects(
    () =>
      withMockedFetch(
        { ok: false, text: async () => "" },
        async () => getIHateMusicShow(),
      ),
    /Unable to load the I Hate Music Acast feed/,
  );

  await assert.rejects(
    () =>
      withMockedFetch(
        { ok: true, text: async () => "<rss />" },
        async () => getIHateMusicShow(),
      ),
    /missing its channel/,
  );
}

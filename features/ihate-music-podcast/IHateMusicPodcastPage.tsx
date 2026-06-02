import type { PodcastEpisode, PodcastShow } from "@/lib/podcast/acast";
import EpisodeMediaTabs from "./EpisodeMediaTabs";
import styles from "./IHateMusicPodcastPage.module.css";

/**
 * Page-level podcast feature.
 * Receives normalized Acast RSS data and renders the public podcast route.
 */
interface IHateMusicPodcastPageProps {
  show: PodcastShow | null;
}

/*
 * Episode cards use the same component for latest and archive entries.
 */
interface EpisodeCardProps {
  episode: PodcastEpisode;
  featured?: boolean;
}

/**
 * Page-level renderer for the I Hate Music podcast route.
 * The route fetches data; this component owns the visual page structure.
 *
 * show is either a normalized PodcastShow object or null. null means the route
 * could not load Acast data, so the component renders a fallback instead of
 * crashing the page.
 */
export default function IHateMusicPodcastPage({
  show,
}: IHateMusicPodcastPageProps) {
  return (
    <main className={styles.page}>
      {show ? <PodcastContent show={show} /> : <PodcastUnavailable />}
    </main>
  );
}

function PodcastContent({ show }: { show: PodcastShow }) {
  /*
   * The first RSS item is treated as the latest episode.
   * Acast returns newest-first, so array destructuring gives one featured item
   * and leaves the rest for the archive grid.
   */
  const [latestEpisode, ...archiveEpisodes] = show.episodes;
  const hostLabel = show.author ? `Hosted by ${show.author}` : "Podcast";
  const languageLabel = show.language ? show.language.toUpperCase() : "N/A";

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{hostLabel}</p>
          <h1>{show.title}</h1>
          {show.subtitle && <p className={styles.subtitle}>{show.subtitle}</p>}
          {show.summary && <p className={styles.summary}>{show.summary}</p>}

          <dl className={styles.showMeta}>
            <div>
              <dt>Episodes</dt>
              <dd>{show.episodes.length}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{languageLabel}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                <a href={show.acastEpisodesUrl} target="_blank" rel="noreferrer">
                  Acast RSS
                </a>
              </dd>
            </div>
          </dl>
        </div>

        {show.imageUrl && (
          <div className={styles.coverFrame}>
            {/* Public RSS artwork image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={show.imageUrl} alt={`${show.title} cover art`} />
          </div>
        )}
      </section>

      {latestEpisode && (
        <section className={styles.latestPanel} aria-labelledby="latest-title">
          <div className={styles.panelLabel}>Latest Transmission</div>
          <EpisodeCard episode={latestEpisode} featured />
        </section>
      )}

      <section className={styles.archive} aria-labelledby="archive-title">
        <div className={styles.archiveHeader}>
          <div>
            <p className={styles.kicker}>Episode Archive</p>
            <h2 id="archive-title">All Episodes</h2>
          </div>

          <div className={styles.keywordRail} aria-label="Podcast keywords">
            {show.keywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        </div>

        <div className={styles.episodeGrid}>
          {archiveEpisodes.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))}
        </div>
      </section>
    </>
  );
}

function EpisodeCard({ episode, featured = false }: EpisodeCardProps) {
  /*
   * Dates are prepared here so the JSX stays focused on structure.
   * EpisodeCard receives already-normalized data and does not know how RSS was
   * fetched or parsed.
   */
  const publishedDateLabel = formatEpisodeDate(episode.publishedAt);
  const publishedDateTime = getEpisodeDateTime(episode.publishedAt);

  return (
    <article
      className={`${styles.episodeCard} ${
        featured ? styles.episodeCardFeatured : ""
      }`}
    >
      <div className={styles.episodeHeader}>
        <div className={styles.episodeNumber}>
          {episode.episodeNumber ? `EP ${episode.episodeNumber}` : "EP"}
        </div>
        <div className={styles.episodeTiming}>
          <time dateTime={publishedDateTime}>{publishedDateLabel}</time>
          {episode.duration && <span>{episode.duration}</span>}
        </div>
      </div>

      <h2>{episode.title}</h2>
      <p>{episode.description}</p>

      <EpisodeMediaTabs
        episodeId={episode.id}
        audioMimeType={episode.audioMimeType}
        audioUrl={episode.audioUrl}
      />

      {episode.episodeUrl && (
        <a
          className={styles.acastLink}
          href={episode.episodeUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open on Acast
        </a>
      )}
    </article>
  );
}

function PodcastUnavailable() {
  return (
    <section className={styles.unavailable}>
      <p className={styles.kicker}>Acast RSS</p>
      <h1>I Hate Music</h1>
      <p>
        The podcast feed could not be loaded right now. The page is ready, and
        it will render episodes as soon as Acast responds again.
      </p>
    </section>
  );
}

/**
 * Returns machine-readable date text for the <time> element.
 */
function getEpisodeDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/**
 * Returns the visible short date label used by episode cards.
 */
function formatEpisodeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

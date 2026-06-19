"use client";

import { useId, useState, type SubmitEvent } from "react";
import styles from "./EpisodeMediaTabs.module.css";
import { useEpisodeMediaController } from "./useEpisodeMediaController";

interface EpisodeMediaTabsProps {
  episodeId: string;
  audioMimeType: string | null;
  audioUrl: string | null;
}

/**
 * Renders one episode's media controls.
 * Playback state and provider handoffs belong to the feature-local controller;
 * this component owns only form input, accessible tabs, and status rendering.
 */
export default function EpisodeMediaTabs({
  episodeId,
  audioMimeType,
  audioUrl,
}: EpisodeMediaTabsProps) {
  const audioPanelId = useId();
  const videoPanelId = useId();
  const videoInputId = useId();
  const backgroundAudioConsentId = useId();
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");

  const {
    audioRef,
    audioTabIsActive,
    backgroundAudioConsentGiven,
    backgroundAudioError,
    changeBackgroundAudioConsent,
    hasVideo,
    loadVideoUrl,
    selectAudio,
    selectVideo,
    stopHiddenHandoffIfUserPausedAudio,
    videoError,
    videoHostRef,
    videoTabIsActive,
  } = useEpisodeMediaController({ audioUrl, episodeId });

  const loadVideo = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    loadVideoUrl(youtubeUrlInput);
  };

  return (
    <section className={styles.mediaTabs} aria-label="Episode media">
      <div className={styles.tabList} role="tablist">
        <button
          type="button"
          className={`${styles.tabButton} ${
            audioTabIsActive ? styles.tabButtonActive : ""
          }`}
          role="tab"
          aria-controls={audioPanelId}
          aria-selected={audioTabIsActive}
          onClick={selectAudio}
        >
          Audio
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${
            videoTabIsActive ? styles.tabButtonActive : ""
          }`}
          role="tab"
          aria-controls={videoPanelId}
          aria-selected={videoTabIsActive}
          onClick={selectVideo}
        >
          Video
        </button>
      </div>

      <div
        id={audioPanelId}
        className={styles.mediaPanel}
        role="tabpanel"
        hidden={!audioTabIsActive}
      >
        {audioUrl ? (
          <audio
            ref={audioRef}
            className={styles.audioPlayer}
            controls
            preload={backgroundAudioConsentGiven ? "auto" : "none"}
            onPause={stopHiddenHandoffIfUserPausedAudio}
          >
            <source src={audioUrl} type={audioMimeType ?? undefined} />
          </audio>
        ) : (
          <p className={styles.audioUnavailableMessage}>
            This episode does not have an audio source.
          </p>
        )}
      </div>

      <div
        id={videoPanelId}
        className={styles.mediaPanel}
        role="tabpanel"
        hidden={!videoTabIsActive}
      >
        <form className={styles.videoSetup} onSubmit={loadVideo}>
          <input
            id={videoInputId}
            name="youtubeVideoUrl"
            className={styles.videoInput}
            value={youtubeUrlInput}
            onChange={(event) => setYoutubeUrlInput(event.target.value)}
            placeholder="Paste YouTube video link"
            aria-label="YouTube video link for this episode"
          />
          <button className={styles.videoLoadButton} type="submit">
            Load Video
          </button>
        </form>

        <label className={styles.backgroundAudioConsent}>
          <input
            id={backgroundAudioConsentId}
            name="allowBackgroundAudioHandoff"
            type="checkbox"
            checked={backgroundAudioConsentGiven}
            onChange={(event) => {
              void changeBackgroundAudioConsent(event.currentTarget.checked);
            }}
          />
          <span>
            I agree to let Acast audio continue in the background when video is
            interrupted.
          </span>
        </label>

        {backgroundAudioError && (
          <p className={styles.invalidVideoMessage}>
            {backgroundAudioError}
          </p>
        )}

        {videoError && (
          <p className={styles.invalidVideoMessage}>{videoError}</p>
        )}

        {!videoError && !hasVideo && (
          <p className={styles.emptyVideoMessage}>
            This episode doesn&apos;t have the video.
          </p>
        )}

        {hasVideo && (
          <div className={styles.videoFrame}>
            <div
              ref={videoHostRef}
              className={styles.videoHost}
              data-episode-id={episodeId}
            />
          </div>
        )}
      </div>
    </section>
  );
}

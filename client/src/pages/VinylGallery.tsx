import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import SwipePager from "@/components/SwipePager";
import IntroSlide from "@/components/IntroSlide";
import TrackSlide, { TrackSlideRef } from "@/components/TrackSlide";
import { ALBUM, TRACKS } from "@/tracks";
import styles from "@/styles/vinyl-gallery.module.css";

interface AlbumData {
  trial: {
    id: string;
    storytellerName: string;
    buyerName: string;
    selectedAlbum: string;
  };
  album: {
    description: string;
    coverImage: string;
  };
  tracks: Array<{
    questionIndex: number;
    questionText: string;
    mediaUrl: string | null;
  }>;
}

export default function VinylGallery() {
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const trackRefs = useRef<(TrackSlideRef | null)[]>([]);
  const autoplayTriggeredRef = useRef(false);
  const [, params] = useRoute("/vinyl-gallery/:trialId?");
  const trialId = params?.trialId;

  // Fetch trial data if trialId is provided
  const { data: albumData } = useQuery<AlbumData>({
    queryKey: [`/api/albums/${trialId}`],
    enabled: !!trialId,
  });

  // Determine cover image source
  const coverImageSrc = albumData?.album?.coverImage || ALBUM.coverSrc;

  // Auto-pause when tab loses visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackRefs.current.forEach((ref) => ref?.pause());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Pause audio when navigating away from a track
  // Auto-play next track if autoplay was triggered
  useEffect(() => {
    trackRefs.current.forEach((ref, i) => {
      if (i !== index - 1) {
        ref?.pause();
      } else if (i === index - 1 && autoplayTriggeredRef.current) {
        // Auto-play the next track if autoplay triggered the navigation
        setTimeout(() => {
          ref?.togglePlayPause();
          autoplayTriggeredRef.current = false;
        }, 100);
      }
    });
  }, [index]);

  // Keyboard handler for Space key (play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " && index > 0) {
        e.preventDefault();
        const trackRef = trackRefs.current[index - 1];
        if (trackRef && trackRef.togglePlayPause) {
          trackRef.togglePlayPause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index]);

  const handleIndexChange = (newIndex: number) => {
    // Prevent swiping left from intro slide
    if (index === 0 && newIndex < 0) {
      return;
    }
    setIndex(newIndex);
  };

  const handleNextTrack = (fromAutoplay = false) => {
    const totalTracks = TRACKS.length;
    const currentTrackIndex = index - 1; // index 0 is intro, tracks start at 1
    if (currentTrackIndex < totalTracks - 1) {
      // Mark that autoplay triggered this navigation (only if from autoplay)
      if (fromAutoplay) {
        autoplayTriggeredRef.current = true;
      }
      setIndex(index + 1);
    }
  };

  const handlePreviousTrack = () => {
    if (index > 1) {
      // Don't go back to intro slide (index 0)
      setIndex(index - 1);
    }
  };

  const handleAutoplayChange = (enabled: boolean) => {
    setAutoplay(enabled);
  };

  return (
    <div className={styles.vinylGalleryPage}>
      <SwipePager index={index} onIndexChange={handleIndexChange}>
        {/* Intro Slide */}
        <IntroSlide
          albumTitle={ALBUM.title}
          artist={ALBUM.artist}
          coverSrc={ALBUM.coverSrc}
          logoSrc={ALBUM.logoSrc}
        />

        {/* Track Slides */}
        {TRACKS.map((track, i) => {
          const isActive = index === i + 1; // index 0 is intro
          const hasNextTrack = i < TRACKS.length - 1;
          const hasPreviousTrack = i > 0;

          return (
            <TrackSlide
              key={track.id}
              ref={(el) => {
                trackRefs.current[i] = el;
              }}
              trackTitle={track.title}
              audioSrc={track.audioSrc}
              albumCoverSrc={coverImageSrc}
              onNextTrack={handleNextTrack}
              onPreviousTrack={handlePreviousTrack}
              hasNextTrack={hasNextTrack}
              hasPreviousTrack={hasPreviousTrack}
              autoplay={autoplay}
              onAutoplayChange={handleAutoplayChange}
            />
          );
        })}
      </SwipePager>
    </div>
  );
}

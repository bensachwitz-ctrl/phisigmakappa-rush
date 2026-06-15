"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

interface FadingVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Static poster shown before/instead of the video. REQUIRED for a good first
   * paint: the browser can render it immediately (no decode wait) and it is the
   * full fallback when the viewer prefers reduced motion. When omitted, the
   * reduced-motion path renders nothing (transparent) rather than an autoplaying
   * clip.
   */
  poster?: string;
}

export function FadingVideo({ src, className = "", style = {}, poster }: FadingVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const fadingOutRef = React.useRef<boolean>(false);
  // Respect the OS "reduce motion" setting: a looping autoplay background video
  // is exactly the kind of continuous motion that setting exists to suppress.
  // When reduced motion is requested we render the static poster (if any) and
  // never mount/autoplay the <video> at all.
  const reduce = useReducedMotion();

  const FADE_MS = 500;
  const FADE_OUT_LEAD = 0.55; // seconds before end of video to start fading out

  const fadeTo = (targetOpacity: number, duration: number = FADE_MS) => {
    if (!videoRef.current) return;
    const startOpacity = parseFloat(videoRef.current.style.opacity || "0");
    const startTime = performance.now();

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Eased interpolation
      const current = startOpacity + (targetOpacity - startOpacity) * progress;
      if (videoRef.current) {
        videoRef.current.style.opacity = current.toString();
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  const handleLoadedData = () => {
    if (!videoRef.current) return;
    videoRef.current.style.opacity = "0";
    videoRef.current.play().catch(() => {});
    fadeTo(1);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // Trigger fade out if we approach the end of the clip
    const timeRemaining = video.duration - video.currentTime;
    if (!fadingOutRef.current && timeRemaining <= FADE_OUT_LEAD && timeRemaining > 0) {
      fadingOutRef.current = true;
      fadeTo(0);
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;

    video.style.opacity = "0";
    // Short buffer before resetting clip to avoid flash/jump
    setTimeout(() => {
      video.currentTime = 0;
      video.play().catch(() => {});
      fadingOutRef.current = false;
      fadeTo(1);
    }, 100);
  };

  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Reduced-motion fallback: render the static poster as a plain image (no
  // autoplay, no decode-on-load video). If no poster is supplied, render
  // nothing so the background simply shows through.
  if (reduce) {
    if (!poster) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className={`select-none pointer-events-none ${className}`}
        style={{ ...style }}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      onLoadedData={handleLoadedData}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      muted
      playsInline
      // preload only metadata (dimensions/duration) up front — the multi-MB
      // clip body streams when playback actually starts, so it never blocks the
      // hero's first paint or competes with LCP image/font fetches.
      preload="metadata"
      // Static first frame the browser paints immediately while the clip loads
      // (and the full fallback under reduced motion above).
      poster={poster}
      className={`opacity-0 select-none pointer-events-none transition-none ${className}`}
      style={{ ...style }}
    />
  );
}

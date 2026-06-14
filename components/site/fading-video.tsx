import * as React from "react";

interface FadingVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}

export function FadingVideo({ src, className = "", style = {} }: FadingVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const fadingOutRef = React.useRef<boolean>(false);

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

  return (
    <video
      ref={videoRef}
      onLoadedData={handleLoadedData}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      muted
      playsInline
      preload="auto"
      className={`opacity-0 select-none pointer-events-none transition-none ${className}`}
      style={{ ...style }}
    />
  );
}

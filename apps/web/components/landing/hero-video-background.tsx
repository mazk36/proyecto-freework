"use client";

import { useState } from "react";

const heroVideoFiles = ["hero-1.mp4", "hero-2.mp4", "hero-3.mp4", "hero-4.mp4", "hero-5.mp4"];

export function HeroVideoBackground({ basePath = "" }: { basePath?: string }) {
  const [videoIndex, setVideoIndex] = useState(0);
  const normalizedBasePath = basePath.replace(/\/$/, "");
  const heroVideos = heroVideoFiles.map((fileName) => `${normalizedBasePath}/videos/hero/${fileName}`);
  const videoSrc = heroVideos[videoIndex];

  return (
    <div aria-hidden="true" className="hero-video-background absolute inset-0 -z-10 overflow-hidden">
      <video
        autoPlay
        className="absolute inset-0 size-full object-cover"
        key={videoSrc}
        muted
        onEnded={() => setVideoIndex((currentIndex) => (currentIndex + 1) % heroVideos.length)}
        playsInline
        preload="auto"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#0d1117]/72" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,17,23,0.94)_0%,rgba(13,17,23,0.76)_48%,rgba(13,17,23,0.38)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(13,17,23,0.78)_0%,transparent_42%,rgba(13,17,23,0.38)_100%)]" />
    </div>
  );
}

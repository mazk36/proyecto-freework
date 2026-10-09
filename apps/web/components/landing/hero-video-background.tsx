export function HeroVideoBackground({ basePath = "" }: { basePath?: string }) {
  const normalizedBasePath = basePath.replace(/\/$/, "");

  return (
    <div aria-hidden="true" className="hero-video-background absolute inset-0 -z-10 overflow-hidden">
      <video
        autoPlay
        className="absolute inset-0 size-full object-cover"
        loop
        muted
        playsInline
        poster={`${normalizedBasePath}/videos/hero/hero-poster.webp`}
        preload="auto"
      >
        <source src={`${normalizedBasePath}/videos/hero/hero-montage.mp4`} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,17,23,0.70)_0%,rgba(13,17,23,0.44)_55%,rgba(13,17,23,0.18)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(13,17,23,0.38)_0%,transparent_44%,rgba(13,17,23,0.16)_100%)]" />
    </div>
  );
}

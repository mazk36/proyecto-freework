import Image from "next/image";

export function HeroVideoBackground({ basePath = "" }: { basePath?: string }) {
  const normalizedBasePath = basePath.replace(/\/$/, "");
  const poster = `${normalizedBasePath}/videos/hero/hero-poster.webp`;

  return (
    <div aria-hidden="true" className="hero-video-background absolute inset-0 -z-10 overflow-hidden">
      <Image alt="" className="object-cover" fill preload sizes="100vw" src={poster} unoptimized />
      <video
        autoPlay
        className="absolute inset-0 size-full object-cover"
        loop
        muted
        playsInline
        poster={poster}
        preload="metadata"
      >
        <source src={`${normalizedBasePath}/videos/hero/hero-montage.mp4`} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,17,23,0.84)_0%,rgba(13,17,23,0.82)_55%,rgba(13,17,23,0.80)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(13,17,23,0.38)_0%,transparent_44%,rgba(13,17,23,0.16)_100%)]" />
    </div>
  );
}

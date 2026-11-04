import { LandingPage } from "@/components/landing/landing-page";
import { siteUrl } from "@/lib/site-metadata";

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteUrl()}#organization`, name: "MatchWork", url: siteUrl(), logo: siteUrl("brand/matchwork-mark.png") },
      { "@type": "WebSite", "@id": `${siteUrl()}#website`, name: "MatchWork", url: siteUrl(), publisher: { "@id": `${siteUrl()}#organization` }, inLanguage: "es" },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <LandingPage />
    </>
  );
}

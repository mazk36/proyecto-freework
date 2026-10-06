import { LandingPage } from "@/components/landing/landing-page";
import { PROBLEMS } from "@/data/problems";

export default function HomePage() {
  return <LandingPage recentProblems={PROBLEMS.slice(0, 3)} />;
}

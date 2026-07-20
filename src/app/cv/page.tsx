import {
  getJobMatchRecommendations,
  getOrCreateResume,
} from "@/app/actions/resume";
import { CvShell } from "@/components/cv/cv-shell";

export const dynamic = "force-dynamic";

export default async function CvPage() {
  const [resume, matches] = await Promise.all([
    getOrCreateResume(),
    getJobMatchRecommendations(),
  ]);

  return <CvShell initialResume={resume} initialMatches={matches} />;
}

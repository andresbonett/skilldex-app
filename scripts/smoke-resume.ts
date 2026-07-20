import { getJobMatchRecommendations, getOrCreateResume } from "../src/app/actions/resume";

async function main() {
  const r = await getOrCreateResume();
  console.log(
    "resume",
    r.id,
    r.title,
    r.data.basics.fullName,
    "versions",
    r.versions.length,
  );
  const m = await getJobMatchRecommendations();
  console.log(
    "matches",
    m.length,
    m.slice(0, 3).map((x) => ({ cargo: x.cargo, match: x.matchPercent })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

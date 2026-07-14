/**
 * Verifica normalización / dedupe de URLs de ofertas.
 * Uso: npx tsx scripts/smoke-job-url.ts
 */
import {
  extractLinkedInJobId,
  isSameJobUrl,
  normalizeJobUrl,
} from "../src/lib/job-url";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error("✗", msg);
    process.exit(1);
  }
}

const linkedInSearch =
  "https://www.linkedin.com/jobs/search-results/?currentJobId=4432033948&eBP=CwEAAAGfXuMMen9WV3PsnuWZTy9L_jEvyrAzK_ISSZPv1X80L4IVP9gA1nt-mAs3HCcMp5XMC5REQxqPeg46nqx1fAOIqgNhpAvd4qU_xX3dWJWmTOR72o6CtXKfjuMBGFtDfRsgQWN51eG3Ba4nnsMFjpsQ54q7tVOr39dYSV4kL55JsDtyPyKkt7iiE-VOzr58SyxThbbu1H5j-p6oL-xHlKZAAsz__fBwZ1MixziyasLf7O_fBlbyMiab_bwuEovuEc_XdR6rdxT4uAjBp0GDEfDJ7fmtxgPs3v_5H8qPjt7eYA6VMju3CWpNU_KZL6-PDy9glkJiI6xkvwNvUvva9ZoToHoLRLQn5ErdKBKKZu4GCdfZbtLQB9QmOSZSsd6QDTEncsc2Jg79WhWcQg_16oPVKucBsak8jN0wRWBazwoebNeG1M6fibZIxgywf_d-HNVQh0GmhdiZL3KSTTeHWWlTeZKKCWIaL14UkhILSnh7Ar0Qq6bafX-Y&refId=eY%2FVpNr2aTCXvHd%2FiieCyA%3D%3D&trackingId=V8bWDYb51SPwLSG1Ig01Pg%3D%3D&keywords=Web%20Developer&origin=PREFERENCES_LANDING&geoId=100876405";

const linkedInView = "https://www.linkedin.com/jobs/view/4432033948/";
const linkedInViewNoSlash = "https://www.linkedin.com/jobs/view/4432033948";
const linkedInSlug =
  "https://www.linkedin.com/jobs/view/frontend-developer-at-inetum-4432033948";
const linkedInWww =
  "https://linkedin.com/jobs/view/4432033948/?refId=abc&trackingId=xyz";

const canonical = "https://www.linkedin.com/jobs/view/4432033948";

assert(extractLinkedInJobId(linkedInSearch) === "4432033948", "id from search");
assert(extractLinkedInJobId(linkedInView) === "4432033948", "id from view");
assert(extractLinkedInJobId(linkedInSlug) === "4432033948", "id from slug");

assert(normalizeJobUrl(linkedInSearch) === canonical, "search → canonical");
assert(normalizeJobUrl(linkedInView) === canonical, "view/ → canonical");
assert(normalizeJobUrl(linkedInViewNoSlash) === canonical, "view → canonical");
assert(normalizeJobUrl(linkedInSlug) === canonical, "slug → canonical");
assert(normalizeJobUrl(linkedInWww) === canonical, "tracking → canonical");
assert(isSameJobUrl(linkedInSearch, linkedInView), "search ~ view");
assert(isSameJobUrl(linkedInSlug, linkedInWww), "slug ~ tracking");

const otherA = "https://www.elempleo.com/co/ofertas-empleo/oferta/12345/";
const otherB = "https://www.elempleo.com/co/ofertas-empleo/oferta/12345?utm_source=x";
assert(
  normalizeJobUrl(otherA) ===
    "https://www.elempleo.com/co/ofertas-empleo/oferta/12345",
  "elempleo strip slash",
);
assert(isSameJobUrl(otherA, otherB), "elempleo ignores utm");

const infoA =
  "https://www.infojobs.net/madrid/oferta.job?id=123&utm_campaign=test";
const infoB = "https://www.infojobs.net/madrid/oferta.job?id=123";
assert(isSameJobUrl(infoA, infoB), "infojobs ignores utm");

const indeedA =
  "https://co.indeed.com/viewjob?jk=abc123&from=serp&utm_source=x";
const indeedB = "https://co.indeed.com/viewjob?jk=abc123";
assert(
  normalizeJobUrl(indeedA) === "https://co.indeed.com/viewjob?jk=abc123",
  "indeed jk canonical",
);
assert(isSameJobUrl(indeedA, indeedB), "indeed same jk");

assert(
  !isSameJobUrl(linkedInView, "https://www.linkedin.com/jobs/view/9999999999"),
  "different linkedin ids",
);

assert(normalizeJobUrl("") === null, "empty → null");
assert(normalizeJobUrl("   ") === null, "blank → null");

console.log("✓ job-url normalization OK");

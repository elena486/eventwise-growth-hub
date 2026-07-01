// Bump this string each time you publish an update.
// Format: YYYY-MM-DD.N  (N = build number that day)
const APP_VERSION = "2026-07-01.1";

Deno.serve(async (req) => {
  return Response.json({ version: APP_VERSION });
});
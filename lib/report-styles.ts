// Moved out of app/api/settings/report-templates/route.ts — Next.js's App
// Router build type-checks route.ts files and only permits HTTP-handler
// exports (GET/POST/etc.) plus a small set of route config options; any
// other named export (this one included) fails the build. Anything a
// route.ts needs to share with other files belongs in a plain module like
// this one instead.
export const REPORT_STYLES = [
  "classic-navy", "modern-teal", "royal-purple", "crimson-gold", "corporate-slate",
  "elegant-serif", "sunburst-orange", "forest-green", "minimal-mono", "double-frame-formal",
] as const;

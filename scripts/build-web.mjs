import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const files = [
  "index.html",
  "styles.css",
  "stats-calculations.js",
  "app.js",
  "postgame-feedback.js",
  "monthly-recap.js",
  "player-insights.js",
  "month-review.js",
  "tracking-metrics.js",
  "notifications.js",
  "app-config.js",
  "manifest.webmanifest"
];

await rm("www", { recursive: true, force: true });
await mkdir("www", { recursive: true });

for (const file of files) {
  await cp(file, `www/${file}`, { recursive: true });
}

await cp("assets", "www/assets", { recursive: true, force: true }).catch(() => {});
await cp("data", "www/data", { recursive: true, force: true }).catch(() => {});

const generatedIndex = await readFile("www/index.html", "utf8");
const localScriptSources = [...generatedIndex.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1/gi)]
  .map((match) => match[2])
  .filter((source) => !/^https?:\/\//i.test(source))
  .map((source) => source.split("?")[0].replace(/^\/+/, ""));

for (const source of localScriptSources) {
  try {
    await access(resolve("www", source));
  } catch {
    throw new Error(`Missing local script in web bundle: ${source}`);
  }
}

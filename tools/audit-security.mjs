import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", "node_modules", "coverage", "dist", "build", ".cache", "__pycache__"]);
const ignoredFiles = new Set(["package-lock.json"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".py",
  ".svg",
  ".txt",
  ".webmanifest",
  ".yml",
  ".yaml",
]);

const allowlistedFindings = [
  { file: ".env.example", pattern: "CLOUD_AI_API_KEY" },
  { file: "README.md", pattern: "API keys" },
  { file: "README.md", pattern: "127.0.0.1" },
  { file: "serve.py", pattern: "127.0.0.1" },
  { file: "cahier_des_charges_chinese_app.md", pattern: "API" },
  { file: "cahier_des_charges_chinese_app.md", pattern: "localhost" },
  { file: "tools/audit-security.mjs", pattern: "google-analytics" },
  { file: "tools/audit-security.mjs", pattern: "gtag" },
  { file: "tools/audit-security.mjs", pattern: "segment" },
  { file: "tools/audit-security.mjs", pattern: "mixpanel" },
  { file: "tools/audit-security.mjs", pattern: "amplitude" },
  { file: "tools/audit-security.mjs", pattern: "posthog" },
  { file: "tools/audit-security.mjs", pattern: "sentry" },
];

const checks = [
  {
    name: "Likely API key or token",
    pattern:
      /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/g,
  },
  {
    name: "Secret assignment",
    pattern: /\b(?:api[_-]?key|secret|token|password|private[_-]?key)\b\s*[:=]\s*["']?[^"'\s]{8,}/gi,
  },
  {
    name: "Absolute local path",
    pattern: /(?:\/Users\/[A-Za-z0-9._-]+|\/home\/[A-Za-z0-9._-]+|C:\\Users\\[A-Za-z0-9._-]+)/g,
  },
  {
    name: "Personal email address",
    pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  },
  {
    name: "Telemetry or analytics dependency",
    pattern: /\b(?:google-analytics|gtag|segment|mixpanel|amplitude|posthog|sentry)\b/gi,
  },
  {
    name: "Remote script or stylesheet",
    pattern: /<(?:script|link)[^>]+https?:\/\//gi,
  },
];

const files = await listFiles(root);
const findings = [];

for (const file of files) {
  const relative = path.relative(root, file);
  const content = await readFile(file, "utf8");

  for (const check of checks) {
    const matches = content.matchAll(check.pattern);
    for (const match of matches) {
      const text = match[0];
      if (isAllowlisted(relative, text)) continue;
      findings.push({
        check: check.name,
        file: relative,
        line: lineForIndex(content, match.index ?? 0),
        text: redact(text),
      });
    }
  }
}

await assertServiceWorkerScope();

if (findings.length > 0) {
  console.error("Security audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.check}: ${finding.file}:${finding.line} (${finding.text})`);
  }
  process.exit(1);
}

console.log(`Security audit passed across ${files.length} files.`);

async function listFiles(dir) {
  const entries = await readdir(dir);
  const found = [];

  for (const entry of entries) {
    if (ignoredDirs.has(entry) || ignoredFiles.has(entry)) continue;
    const absolute = path.join(dir, entry);
    const info = await stat(absolute);
    if (info.isDirectory()) {
      found.push(...(await listFiles(absolute)));
      continue;
    }
    if (textExtensions.has(path.extname(entry)) || entry.startsWith(".")) found.push(absolute);
  }

  return found;
}

async function assertServiceWorkerScope() {
  const serviceWorker = await readFile(path.join(root, "service-worker.js"), "utf8");
  if (/cache\.addAll\([^)]*https?:\/\//s.test(serviceWorker)) {
    findings.push({
      check: "Remote asset cached by service worker",
      file: "service-worker.js",
      line: 1,
      text: "remote cache asset",
    });
  }
}

function isAllowlisted(file, text) {
  return allowlistedFindings.some((item) => item.file === file && text.includes(item.pattern));
}

function lineForIndex(content, index) {
  return content.slice(0, index).split("\n").length;
}

function redact(text) {
  if (text.length <= 18) return text;
  return `${text.slice(0, 8)}...${text.slice(-4)}`;
}

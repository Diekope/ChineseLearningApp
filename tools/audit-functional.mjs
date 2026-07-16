import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const failures = [];

await checkRequiredFiles();
await checkJson("manifest.webmanifest");
await checkHtmlWiring();
await checkJavaScriptSyntax("app.js");
await checkJavaScriptSyntax("service-worker.js");
await checkPythonSyntax();
await checkManifest();
await checkServiceWorker();
await checkAppContent();

if (failures.length > 0) {
  console.error("Functional audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Functional audit passed.");

async function checkRequiredFiles() {
  const required = [
    "index.html",
    "styles.css",
    "app.js",
    "manifest.webmanifest",
    "service-worker.js",
    "icon.svg",
    "serve.py",
    "cahier_des_charges_chinese_app.md",
  ];

  for (const file of required) {
    try {
      await readFile(path.join(root, file), "utf8");
    } catch {
      failures.push(`Missing required file: ${file}`);
    }
  }
}

async function checkJson(file) {
  try {
    JSON.parse(await readFile(path.join(root, file), "utf8"));
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error.message}`);
  }
}

async function checkHtmlWiring() {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const requiredSnippets = [
    'id="practiceView"',
    'id="reviewView"',
    'id="settingsView"',
    'href="manifest.webmanifest"',
    'src="app.js"',
    'rel="stylesheet"',
  ];

  for (const snippet of requiredSnippets) {
    if (!html.includes(snippet)) failures.push(`index.html missing ${snippet}`);
  }

  if (/<script[^>]+https?:\/\//i.test(html)) {
    failures.push("index.html loads a remote script");
  }
}

async function checkJavaScriptSyntax(file) {
  const result = spawnSync("node", ["--check", file], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) failures.push(`${file} has a syntax error: ${result.stderr.trim()}`);
}

async function checkPythonSyntax() {
  const result = spawnSync(
    "python3",
    ["-c", "import py_compile; py_compile.compile('serve.py', cfile='/tmp/chineselearn-serve.pyc', doraise=True)"],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) failures.push(`serve.py has a syntax error: ${result.stderr.trim()}`);
}

async function checkManifest() {
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));
  const requiredFields = ["name", "short_name", "start_url", "display", "icons"];
  for (const field of requiredFields) {
    if (!manifest[field]) failures.push(`manifest.webmanifest missing ${field}`);
  }
  if (manifest.display !== "standalone") failures.push("manifest display should be standalone");
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    failures.push("manifest needs at least one icon");
  }
}

async function checkServiceWorker() {
  const serviceWorker = await readFile(path.join(root, "service-worker.js"), "utf8");
  const expectedAssets = ["index.html", "styles.css", "app.js", "manifest.webmanifest", "icon.svg"];

  for (const asset of expectedAssets) {
    if (!serviceWorker.includes(asset)) failures.push(`service-worker.js does not cache ${asset}`);
  }

  if (!serviceWorker.includes("caches.match")) failures.push("service-worker.js should serve cached assets");
}

async function checkAppContent() {
  const app = await readFile(path.join(root, "app.js"), "utf8");
  const requiredConcepts = [
    "localStorage",
    "speechSynthesis",
    "SpeechRecognition",
    "showPinyin",
    "localAiMode",
    "localAiEndpoint",
    "pickNextItem",
    "completeItem",
    "continueButton",
    "getLearnerLevel",
  ];

  for (const concept of requiredConcepts) {
    if (!app.includes(concept)) failures.push(`app.js missing expected behavior: ${concept}`);
  }

  const itemCount = [...app.matchAll(/\bid:\s*"[^"]+"/g)].length;
  if (itemCount < 5) failures.push("app.js should include at least five starter learning items");
}

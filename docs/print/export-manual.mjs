import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sourceHtml = resolve(__dirname, "sim-card-user-manual.html");
const outputPdf = resolve(__dirname, "evairsim-sim-card-user-manual-12cm-reader.pdf");
const previewDir = resolve(__dirname, "preview");
const previewPrefix = resolve(previewDir, "page");
const userDataDir = resolve(__dirname, ".chrome-print-profile");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: __dirname,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return `${result.stdout || ""}${result.stderr || ""}`;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function printPdf() {
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${userDataDir}`,
    "--allow-file-access-from-files",
    "--print-to-pdf-no-header",
    `--print-to-pdf=${outputPdf}`,
    pathToFileURL(sourceHtml).href,
  ], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  chrome.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  let lastSize = 0;
  let stableChecks = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (existsSync(outputPdf)) {
      const size = statSync(outputPdf).size;
      if (size > 0 && size === lastSize) {
        stableChecks += 1;
      } else {
        stableChecks = 0;
        lastSize = size;
      }

      if (stableChecks >= 3) {
        chrome.kill("SIGTERM");
        return;
      }
    }

    if (chrome.exitCode !== null) {
      if (!existsSync(outputPdf)) {
        throw new Error(`Chrome exited before writing PDF.\n${stdout}\n${stderr}`);
      }
      return;
    }

    await sleep(500);
  }

  chrome.kill("SIGKILL");
  throw new Error(`Timed out waiting for Chrome to write PDF.\n${stdout}\n${stderr}`);
}

if (!existsSync(chromePath)) {
  throw new Error(`Chrome was not found at ${chromePath}`);
}

mkdirSync(previewDir, { recursive: true });
rmSync(userDataDir, { recursive: true, force: true });
rmSync(outputPdf, { force: true });
for (let index = 1; index <= 16; index += 1) {
  const page = String(index).padStart(2, "0");
  rmSync(resolve(previewDir, `page-${page}.png`), { force: true });
}

await printPdf();

const info = run("pdfinfo", [outputPdf]);
run("pdftoppm", ["-png", "-r", "180", outputPdf, previewPrefix]);
rmSync(userDataDir, { recursive: true, force: true });

console.log(`PDF written: ${outputPdf}`);
console.log(`Preview images written: ${previewDir}`);
console.log(info);

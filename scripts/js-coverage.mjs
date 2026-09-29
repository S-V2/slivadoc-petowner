// Reports the share of the web app's lines (app/) that the node:test run
// (`npm run test:coverage`) executed. A line counts once, as covered when any
// report hit it. Node lists only the files a test loaded, so --all adds every
// source file under a directory with each line unhit, and files no test loads
// stay in the denominator. Copied from slivadoc-frontend, which gets that
// denominator from vitest instead.
//
//   node scripts/js-coverage.mjs coverage/node.lcov --all app \
//     [--summary <file>] [--baseline <file> --key js_lines]
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// parseLcov returns file (relative to root) → line → hit count.
/** @param {string} text @param {string} root @returns {Map<string, Map<number, number>>} */
export function parseLcov(text, root) {
  const files = new Map();
  let lines;
  for (const entry of text.split("\n")) {
    if (entry.startsWith("SF:")) {
      const file = relative(root, entry.slice(3).trim());
      lines = files.get(file) ?? new Map();
      files.set(file, lines);
    } else if (entry.startsWith("DA:") && lines) {
      const [line, hits] = entry.slice(3).split(",").map(Number);
      lines.set(line, Math.max(lines.get(line) ?? 0, hits));
    }
  }
  return files;
}

// sourceLines counts lines as node's coverage does, every physical line, and
// marks them unhit.
/** @param {string} dir @param {string} root @returns {Map<string, Map<number, number>>} */
export function sourceLines(dir, root) {
  const files = new Map();
  for (const entry of readdirSync(dir, { recursive: true })) {
    if (!/\.(ts|tsx|js|mjs)$/.test(entry) || entry.endsWith(".d.ts")) continue;
    const path = join(dir, entry);
    const count = readFileSync(path, "utf8").replace(/\n$/, "").split("\n").length;
    files.set(relative(root, path), new Map(Array.from({ length: count }, (_, index) => [index + 1, 0])));
  }
  return files;
}

/**
 * @param {Map<string, Map<number, number>>[]} reports
 * @returns {{ files: number, total: number, covered: number, percent: number }}
 */
export function lineCoverage(reports, prefix = "app/") {
  const merged = new Map();
  for (const report of reports) {
    for (const [file, lines] of report) {
      if (!file.startsWith(prefix)) continue;
      const target = merged.get(file) ?? new Map();
      for (const [line, hits] of lines) target.set(line, Math.max(target.get(line) ?? 0, hits));
      merged.set(file, target);
    }
  }
  let total = 0;
  let covered = 0;
  for (const lines of merged.values()) {
    total += lines.size;
    for (const hits of lines.values()) if (hits > 0) covered += 1;
  }
  const percent = total ? Math.round((covered * 1000) / total) / 10 : 0;
  return { files: merged.size, total, covered, percent };
}

function main(args) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const option = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? "" : (args[index + 1] ?? "");
  };
  const flagged = new Set(["--summary", "--baseline", "--key", "--all"].flatMap((name) => [name, option(name)]));
  const reports = args.filter((arg) => !flagged.has(arg)).map((path) => parseLcov(readFileSync(path, "utf8"), root));
  const all = option("--all");
  if (all) reports.push(sourceLines(join(root, all), root));
  const { files, total, covered, percent } = lineCoverage(reports);
  console.log(`js line coverage: ${covered}/${total} (${percent.toFixed(1)}%) across ${files} app files`);

  const summary = option("--summary");
  if (summary) {
    appendFileSync(summary, `### JS line coverage\n\n**${percent.toFixed(1)}%** of ${total} app lines (${files} files)\n\n`);
  }
  const baseline = option("--baseline");
  if (baseline) {
    const key = option("--key");
    const want = JSON.parse(readFileSync(baseline, "utf8"))[key];
    if (typeof want !== "number") throw new Error(`${baseline} has no numeric "${key}" baseline`);
    if (percent < want) {
      console.error(`js line coverage ${percent.toFixed(1)}% fell below the ${key} baseline of ${want}%`);
      return 1;
    }
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}

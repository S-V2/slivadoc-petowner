import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { lineCoverage, parseLcov, sourceLines } from "../scripts/js-coverage.mjs";

const root = "/repo";
const node = parseLcov(
  ["SF:/repo/app/lib/catalog.ts", "DA:1,1", "DA:2,0", "DA:3,4", "end_of_record", "SF:/repo/tests/catalog.test.ts", "DA:1,1", "end_of_record"].join("\n"),
  root,
);

test("files outside app are left out of the share", () => {
  assert.deepEqual(lineCoverage([node]), { files: 1, total: 3, covered: 2, percent: 66.7 });
});

test("source files no test loaded stay in the denominator, loaded ones keep their hits", () => {
  const repo = mkdtempSync(join(tmpdir(), "js-coverage-"));
  mkdirSync(join(repo, "app", "lib"), { recursive: true });
  writeFileSync(join(repo, "app", "lib", "catalog.ts"), "a\nb\nc\n");
  writeFileSync(join(repo, "app", "page.tsx"), "x\n\ny\nz\n");
  writeFileSync(join(repo, "app", "types.d.ts"), "declare const t: 1;\n");
  writeFileSync(join(repo, "app", "styles.css"), "a {}\n");
  const loaded = parseLcov(["SF:" + join(repo, "app/lib/catalog.ts"), "DA:1,1", "DA:2,0", "DA:3,4", "end_of_record"].join("\n"), repo);
  // catalog.ts keeps 2 of 3 lines; page.tsx adds its 4 physical lines unhit.
  assert.deepEqual(lineCoverage([loaded, sourceLines(join(repo, "app"), repo)]), { files: 2, total: 7, covered: 2, percent: 28.6 });
});

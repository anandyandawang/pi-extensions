#!/usr/bin/env node
/**
 * Wrap `gondolin build` so the resulting `rootfs.sizeMb` is
 *   max(gondolin's auto-calc, MIN_SIZE_MB)
 *
 * gondolin's auto-calc is roughly `installed_content_size * 1.2 + 64 MB`,
 * which leaves no headroom for runtime caches like /root/.gradle/caches.
 * Pinning a fixed `rootfs.sizeMb` in build-config.json works until the
 * installed package set outgrows the pin — then it becomes a ceiling that
 * causes "No space left on device" at runtime.
 *
 * Strategy: two passes.
 *   1. Probe pass — build with build-config.json's sizeMb temporarily
 *      removed so gondolin auto-calcs. Read the produced rootfs.ext4 size.
 *   2. Final pass — rebuild with sizeMb = max(probe, MIN_SIZE_MB) into the
 *      real output dir. Skipped if the probe already met the floor.
 */
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const MIN_SIZE_MB = 4096;
const HERE = path.dirname(new URL(import.meta.url).pathname);
const CONFIG_PATH = path.join(HERE, "build-config.json");
const OUTPUT_DIR = path.join(HERE, "assets");

function runBuild(configPath, outputDir) {
  const r = spawnSync(
    "npx",
    ["gondolin", "build", "--config", configPath, "--output", outputDir],
    { stdio: "inherit", cwd: HERE },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function rootfsSizeMb(dir) {
  return Math.ceil(statSync(path.join(dir, "rootfs.ext4")).size / (1024 * 1024));
}

function withTmpConfig(mutate) {
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  mutate(cfg);
  const tmpDir = mkdtempSync(path.join(tmpdir(), "gondolin-cfg-"));
  const tmpPath = path.join(tmpDir, "build-config.json");
  writeFileSync(tmpPath, JSON.stringify(cfg, null, 2));
  return { path: tmpPath, cleanup: () => rmSync(tmpDir, { recursive: true, force: true }) };
}

// Probe pass: auto-size into the real output dir. If auto already meets
// the floor, this is also the final build and we exit.
{
  const probe = withTmpConfig((cfg) => {
    if (cfg.rootfs) delete cfg.rootfs.sizeMb;
  });
  console.log(`[probe] auto-sizing into ${OUTPUT_DIR}`);
  try {
    runBuild(probe.path, OUTPUT_DIR);
  } finally {
    probe.cleanup();
  }
  const autoMb = rootfsSizeMb(OUTPUT_DIR);
  console.log(`[probe] auto sizeMb = ${autoMb} MB`);
  if (autoMb >= MIN_SIZE_MB) {
    console.log(`[done] auto >= min ${MIN_SIZE_MB} MB; keeping probe build`);
    process.exit(0);
  }
  console.log(`[final] auto < min ${MIN_SIZE_MB} MB; rebuilding pinned`);
}

// Final pass: pin sizeMb to the floor and rebuild over the probe output.
{
  const final = withTmpConfig((cfg) => {
    cfg.rootfs = { ...(cfg.rootfs ?? {}), sizeMb: MIN_SIZE_MB };
  });
  try {
    runBuild(final.path, OUTPUT_DIR);
  } finally {
    final.cleanup();
  }
  console.log(`[done] sizeMb = ${MIN_SIZE_MB} MB`);
}

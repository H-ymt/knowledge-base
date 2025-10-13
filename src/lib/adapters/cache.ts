/**
 * 取得キャッシュ（ETag 永続化）。
 * - 目的: ETag / If-None-Match による差分取得のための保管。
 * - 保存先: `.cache/etag.json`
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type ETagMap = Record<string, string>;

function cacheFilePath(cwd: string): string {
  return resolve(cwd, ".cache/etag.json");
}

async function readJSON(path: string): Promise<ETagMap> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as ETagMap;
  } catch {
    return {};
  }
}

async function writeJSON(path: string, data: ETagMap): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function getETag(key: string, cwd = process.cwd()): Promise<string | undefined> {
  const store = await readJSON(cacheFilePath(cwd));
  return store[key];
}

export async function setETag(key: string, value: string, cwd = process.cwd()): Promise<void> {
  const fp = cacheFilePath(cwd);
  const store = await readJSON(fp);
  store[key] = value;
  await writeJSON(fp, store);
}

export async function dumpETags(cwd = process.cwd()): Promise<ETagMap> {
  return readJSON(cacheFilePath(cwd));
}

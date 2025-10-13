/**
 * 取得キャッシュ（スタブ）。
 * - 目的: ETag / If-None-Match による差分取得のための保管。
 * - 現状: プロセスメモリ上の簡易実装。Task 3 で永続化（例: `.cache/etag.json`）。
 */

const etagStore = new Map<string, string>();

export async function getETag(key: string): Promise<string | undefined> {
  return etagStore.get(key);
}

export async function setETag(key: string, value: string): Promise<void> {
  etagStore.set(key, value);
}


/**
 * 型ユーティリティ（ブランド型と正規化関数）
 * - 目的: スラッグ/ISO日付/タグの型安全な生成
 * - 方針: 失敗は null を返し、呼び出し側で明示的に扱う（Clarity over Cleverness）
 */

import type { Tag } from "@/lib/types";

// ---- Brand Types ----

export type Slug = string & { readonly __brand: "Slug" };
export type ISODateString = string & { readonly __brand: "ISODateString" };

// ---- Slug ----

/** タイトルなどから URL セーフなスラッグを生成（失敗時 null）。 */
export function tryCreateSlug(input: string): Slug | null {
  const base = input
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) return null;
  return base as Slug;
}

/** 必ずスラッグを返す。生成できない場合はエラー。 */
export function toSlug(input: string): Slug {
  const s = tryCreateSlug(input);
  if (s === null) throw new Error("toSlug: 空のスラッグは生成できません");
  return s;
}

/** スラッグを最大長までトリム（語境界としてハイフンを優先）。 */
export function truncateSlug(slug: Slug, maxLength: number): Slug {
  if (maxLength <= 0) throw new Error("truncateSlug: maxLength > 0 が必要です");
  if (slug.length <= maxLength) return slug;
  // 末尾側を優先的に切らず、語の途中で切れないように制御
  const cut = slug.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  const trimmed = (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
  return (trimmed || cut) as Slug;
}

/**
 * タイトルと一意ヒント（ID 等）からスラッグ生成。
 * - タイトル由来のスラッグを基準に、必要に応じて `-hint` を付与
 * - `maxLength` を超える場合は語境界でトリムして安定化
 */
export function toSlugWithHint(
  title: string,
  uniqueHint: string,
  options?: { readonly maxLength?: number; readonly delimiter?: string }
): Slug {
  const max = options?.maxLength ?? 80;
  const delimiter = options?.delimiter ?? "-";
  const t = tryCreateSlug(title);
  const h = tryCreateSlug(uniqueHint);
  if (!t && !h) throw new Error("toSlugWithHint: スラッグを生成できません");
  const base = t ?? (h as Slug);
  const suffix = h && (!t || !base.endsWith(h)) ? (delimiter + h) : "";
  const composed = (base + suffix) as Slug;
  return truncateSlug(composed, max);
}

// ---- ISO Date ----

/** ISO 8601 の厳格判定（YYYY-MM-DDTHH:mm:ss.sssZ 形式）。 */
export function isISODateString(value: string): value is ISODateString {
  // 受け入れ: 2023-08-01T12:34:56Z / 2023-08-01T12:34:56.789Z
  const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  return re.test(value);
}

/** 任意入力を ISO8601 (UTC) へ正規化。失敗時 null。 */
export function toISODateString(input: string | number | Date): ISODateString | null {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString() as ISODateString;
}

// ---- Tags ----

/** タグの正規化（小文字・全角半角統一・空白と区切りのハイフン化）。 */
export function normalizeTag(raw: string): string {
  // ラテン系の合成分解で付加記号を除去（日本語の濁点等は影響しない）
  const diacriticsRemoved = raw
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFKC");
  return diacriticsRemoved
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 単一タグの構築。 */
export function buildTag(raw: string): Tag {
  const norm = normalizeTag(raw);
  return { raw, norm } as const;
}

/** タグ配列の構築（重複除去: norm 基準）。 */
export function buildTags(inputs: ReadonlyArray<string>): ReadonlyArray<Tag> {
  const seen = new Set<string>();
  const out: Tag[] = [];
  for (const r of inputs) {
    const t = buildTag(r);
    if (t.norm && !seen.has(t.norm)) {
      seen.add(t.norm);
      out.push(t);
    }
  }
  return out;
}

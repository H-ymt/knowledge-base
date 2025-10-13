/**
 * 簡易クラス結合ユーティリティ（依存追加なし）
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}


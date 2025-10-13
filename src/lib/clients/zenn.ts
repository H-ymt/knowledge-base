/** Zenn RSS クライアント（スタブ）。 */
import type { ZennFeed } from "@/lib/types";

export interface ZennClientConfig {
  readonly user?: string;
}

export interface ZennClient {
  /** ユーザーの RSS フィードを取得する（未実装）。 */
  fetchFeed: () => Promise<ZennFeed>;
}

export function createZennClient(config: ZennClientConfig = {}): ZennClient {
  const { user } = config;
  return {
    async fetchFeed() {
      if (!user) throw new Error("ZennClient: user が未設定です");
      // スタブ: 後で実装
      return { items: [] } as ZennFeed;
    },
  };
}

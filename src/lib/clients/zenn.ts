/**
 * Zenn RSS クライアント（スタブ）。
 * TODO: Task 3 で RSS → 構造化型を定義し、実パース処理を実装する。
 */

export interface ZennClientConfig {
  readonly user?: string;
}

export interface ZennClient {
  /**
   * ユーザーの RSS フィードを取得する（未実装）。
   */
  fetchFeed: () => Promise<unknown>;
}

export function createZennClient(config: ZennClientConfig = {}): ZennClient {
  const { user } = config;
  return {
    async fetchFeed() {
      if (!user) throw new Error("ZennClient: user が未設定です");
      // スタブ: 後で実装
      return {} as unknown;
    },
  };
}


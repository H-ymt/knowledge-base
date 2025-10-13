/**
 * GitHub Gist API クライアント（スタブ）。
 * TODO: Task 3 で API レスポンス型を厳密化し、ETag を用いた差分取得を実装する。
 */

export interface GistClientConfig {
  readonly username?: string;
  readonly token?: string;
}

export interface GistClient {
  /**
   * ユーザーの Gists を取得する（未実装）。
   */
  fetchUserGists: (options?: { readonly since?: string }) => Promise<unknown[]>;
}

export function createGistClient(config: GistClientConfig = {}): GistClient {
  const { username, token } = config;
  void token; // 未使用抑制（実装時に利用）

  return {
    async fetchUserGists() {
      // スタブ: 後で実装
      if (!username) {
        throw new Error("GistClient: username が未設定です");
      }
      return [] as unknown[];
    },
  };
}


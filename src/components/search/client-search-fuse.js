import Fuse from "fuse.js";

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function renderList(root, items, page, pageSize) {
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  root.innerHTML = `
    <div class="space-y-4">
      <p class="text-sm text-main-body-lighter">${items.length} 件</p>
      <ul class="space-y-4" aria-label="検索結果">
        ${slice
          .map(
            (e) => `
            <li>
              <article class="border border-main-200 rounded-md p-4 hover:bg-main-25 transition">
                <a href="/knowledge/${e.slug}" class="block">
                  <h2 class="text-xl mb-1">${e.title}</h2>
                  <p class="text-sm mb-2 text-main-body-lighter">${new Date(e.publishedAt).toLocaleDateString("ja-JP")}</p>
                  <p class="text-sm line-clamp-2">${e.summary ?? ""}</p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    ${(e.tags || [])
                      .slice(0, 8)
                      .map((t) => `<span class="text-xs px-2 py-0.5 rounded-full bg-main-50 text-main-700">${t.norm}</span>`)
                      .join("")}
                  </div>
                </a>
                <p class="mt-2 text-xs">
                  <a class="text-link hover:underline" href="${e.url}" target="_blank" rel="noopener">ソースを開く ↗</a>
                </p>
              </article>
            </li>`,
          )
          .join("")}
      </ul>
      <nav class="flex items-center justify-between text-sm" aria-label="ページネーション">
        <button class="px-3 py-1 rounded border border-main-300 hover:bg-main-50" data-act="prev" ${page <= 1 ? "disabled" : ""}>← 前のページ</button>
        <span>${page} / ${totalPages}</span>
        <button class="px-3 py-1 rounded border border-main-300 hover:bg-main-50" data-act="next" ${page >= totalPages ? "disabled" : ""}>次のページ →</button>
      </nav>
    </div>`;

  const prev = root.querySelector('[data-act="prev"]');
  const next = root.querySelector('[data-act="next"]');
  if (prev) prev.addEventListener("click", () => root.dispatchEvent(new CustomEvent("kb:page", { detail: { page: page - 1 } })));
  if (next) next.addEventListener("click", () => root.dispatchEvent(new CustomEvent("kb:page", { detail: { page: page + 1 } })));
}

export function setupClientSearchFuse() {
  const jsonEl = document.getElementById("kb-entries");
  if (!jsonEl) return;
  const all = JSON.parse(jsonEl.textContent || "[]");
  const input = document.querySelector('form[aria-label="フィルタ"] input[name="q"]');
  const serverList = document.querySelector('ul[aria-label="記事一覧"]');
  const countLabel = serverList?.previousElementSibling; // p with counts
  const root = document.getElementById("client-search-root");
  if (!input || !root || !serverList) return;

  const fuse = new Fuse(all, {
    includeScore: true,
    shouldSort: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: "title", weight: 0.6 },
      { name: "summary", weight: 0.3 },
      { name: "tags.norm", weight: 0.1 },
    ],
  });

  const pageSize = 20;
  let currentPage = 1;
  let filtered = [];

  function apply(query) {
    const q = (query || "").trim();
    if (!q) {
      root.hidden = true;
      serverList.hidden = false;
      if (countLabel && countLabel.matches("p")) countLabel.textContent = `${serverList.querySelectorAll("li").length} 件`;
      return;
    }
    filtered = fuse
      .search(q)
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .map((x) => x.item);
    currentPage = 1;
    serverList.hidden = true;
    root.hidden = false;
    renderList(root, filtered, currentPage, pageSize);
  }

  const onInput = debounce(() => apply(input.value), 200);
  input.addEventListener("input", onInput);
  root.addEventListener("kb:page", (ev) => {
    currentPage = Math.max(1, ev.detail.page);
    renderList(root, filtered, currentPage, pageSize);
  });

  if (input.value) apply(input.value);
}

if (typeof window !== "undefined") {
  queueMicrotask(setupClientSearchFuse);
}

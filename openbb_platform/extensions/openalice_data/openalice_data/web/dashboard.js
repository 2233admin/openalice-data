const state = {
  datasets: [],
  selectedId: null,
};

const SOURCE_STATUS_META = {
  ready: { label: "可查询", message: "数据源已注册" },
  available: { label: "可查询", message: "数据源已注册" },
  catalog_only: { label: "仅目录", message: "通过对应 OpenBB Provider 请求" },
  unavailable: { label: "未配置", message: "需要挂载运行时数据源" },
};

const byId = (id) => document.getElementById(id);
const endpoint = (path) => new URL(path, window.location.href).toString();

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

async function requestJson(url, options) {
  const response = await fetch(url, options);
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.detail || payload?.error || `HTTP ${response.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return payload;
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

async function loadHealth() {
  const pill = byId("service-pill");
  try {
    const health = await requestJson(endpoint("health"));
    pill.classList.add("is-ok");
    byId("service-label").textContent = `${health.version} · 服务正常`;
  } catch {
    pill.classList.add("is-error");
    byId("service-label").textContent = "服务异常";
  }
}

function marketLabel(market) {
  return {
    CN: "中国",
    US: "美国",
    GLOBAL: "全球",
  }[market] || market || "其他";
}

function accessModeLabel(mode) {
  return mode === "dataset_query" ? "只读数据集" : "OpenBB 请求";
}

function datasetToken(dataset) {
  const market = dataset.market || "--";
  return market.slice(0, 2).toUpperCase();
}

function renderCatalog(datasets) {
  const list = byId("catalog-list");
  byId("catalog-count").textContent = `${datasets.length} 个结果`;
  if (!datasets.length) {
    list.innerHTML = '<div class="empty-state">没有找到匹配的数据，换个关键词试试。</div>';
    return;
  }
  list.innerHTML = datasets
    .map(
      (dataset) => `
        <button class="catalog-item ${dataset.dataset_id === state.selectedId ? "is-active" : ""}"
          type="button" data-dataset-id="${escapeHtml(dataset.dataset_id)}">
          <span class="dataset-token">${escapeHtml(datasetToken(dataset))}</span>
          <span class="catalog-name">
            <strong>${escapeHtml(dataset.name_zh || dataset.name)}</strong>
            <small>${escapeHtml(dataset.provider)} · ${escapeHtml(marketLabel(dataset.market))}</small>
          </span>
          <span class="catalog-arrow" aria-hidden="true">→</span>
        </button>`,
    )
    .join("");
  list.querySelectorAll("[data-dataset-id]").forEach((button) => {
    button.addEventListener("click", () => selectDataset(button.dataset.datasetId));
  });
}

function renderDatasetDetail(dataset) {
  const fields = (dataset.fields || [])
    .map((field) => `<span class="field-chip">${escapeHtml(field.name)}</span>`)
    .join("");
  byId("dataset-detail").innerHTML = `
    <div class="detail-header">
      <div>
        <span class="detail-id">${escapeHtml(dataset.dataset_id)}</span>
        <h3>${escapeHtml(dataset.name_zh || dataset.name)}</h3>
      </div>
      <span class="mode-badge">${escapeHtml(accessModeLabel(dataset.access_mode))}</span>
    </div>
    <p class="detail-description">${escapeHtml(dataset.description_zh || dataset.description || "暂无说明")}</p>
    <div class="detail-grid">
      <div><span>市场</span><strong>${escapeHtml(marketLabel(dataset.market))}</strong></div>
      <div><span>数据源</span><strong>${escapeHtml(dataset.provider)}</strong></div>
      <div><span>资产类型</span><strong>${escapeHtml(dataset.asset_type)}</strong></div>
      <div><span>查询入口</span><strong>${escapeHtml(dataset.query_entry)}</strong></div>
      <div><span>PIT</span><strong>${dataset.pit ? "是" : "否"}</strong></div>
      <div><span>授权标识</span><strong>${escapeHtml(dataset.license_id)}</strong></div>
    </div>
    <p class="eyebrow">FIELDS · ${(dataset.fields || []).length}</p>
    <div class="field-list">${fields || '<span class="field-chip">未声明字段</span>'}</div>
  `;
}

async function selectDataset(datasetId) {
  state.selectedId = datasetId;
  renderCatalog(state.datasets);
  byId("dataset-detail").innerHTML = '<div class="loading-card">正在读取数据集详情…</div>';
  try {
    const dataset = await requestJson(endpoint(`catalog/${encodeURIComponent(datasetId)}`));
    renderDatasetDetail(dataset);
  } catch (error) {
    byId("dataset-detail").innerHTML = `<div class="error-state">读取失败：${escapeHtml(error.message)}</div>`;
  }
}

async function loadCatalog(query = "") {
  try {
    const suffix = query ? `?query=${encodeURIComponent(query)}&limit=50` : "?query=&limit=50";
    const datasets = await requestJson(endpoint(`catalog/search${suffix}`));
    state.datasets = datasets;
    const markets = new Set(datasets.map((item) => item.market).filter(Boolean));
    byId("metric-datasets").textContent = datasets.length;
    byId("metric-markets").textContent = markets.size;
    renderCatalog(datasets);
  } catch (error) {
    byId("catalog-list").innerHTML = `<div class="error-state">目录加载失败：${escapeHtml(error.message)}</div>`;
  }
}

async function loadSources() {
  const list = byId("source-list");
  list.innerHTML = '<div class="loading-card">正在检查数据源…</div>';
  try {
    const sources = await requestJson(endpoint("sources/status"));
    byId("metric-sources").textContent = sources.length;
    list.innerHTML = sources
      .map((source) => {
        const meta = SOURCE_STATUS_META[source.status] || {
          label: source.status,
          message: "等待状态说明",
        };
        return `
          <div class="source-item is-${escapeHtml(source.status)}">
            <span class="source-state-dot"></span>
            <span class="source-name">
              <strong>${escapeHtml(source.provider)}</strong>
              <small>${escapeHtml(meta.message)} · ${source.datasets.length} 个数据集</small>
            </span>
            <span class="source-status">${escapeHtml(meta.label)}</span>
          </div>`;
      })
      .join("");
  } catch (error) {
    list.innerHTML = `<div class="error-state">状态检查失败：${escapeHtml(error.message)}</div>`;
  }
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(Number(value));
}

function renderQuote(payload, symbol) {
  const rows = (payload.results || []).slice(0, 8);
  if (!rows.length) {
    byId("quote-result").innerHTML = '<div class="empty-state">请求成功，但该区间没有数据。</div>';
    return;
  }
  byId("quote-result").innerHTML = `
    <div class="request-summary">
      <span>${escapeHtml(symbol)} · ${rows.length} 行预览</span>
      <span>来源：${escapeHtml(payload.provider || "yfinance")}</span>
    </div>
    <table>
      <thead><tr><th>日期</th><th>开盘</th><th>最高</th><th>最低</th><th>收盘</th><th>成交量</th></tr></thead>
      <tbody>${rows
        .map(
          (row) => `<tr>
            <td>${escapeHtml(row.date || row.datetime || "—")}</td>
            <td>${formatNumber(row.open)}</td>
            <td>${formatNumber(row.high)}</td>
            <td>${formatNumber(row.low)}</td>
            <td>${formatNumber(row.close)}</td>
            <td>${formatNumber(row.volume)}</td>
          </tr>`,
        )
        .join("")}</tbody>
    </table>`;
}

async function requestQuote(event) {
  event?.preventDefault();
  const result = byId("quote-result");
  const symbol = byId("quote-symbol").value.trim().toUpperCase();
  const startDate = byId("quote-start").value;
  const endDate = byId("quote-end").value;
  result.innerHTML = '<div class="loading-card">正在通过 OpenBB 请求真实行情…</div>';
  const params = new URLSearchParams({
    symbol,
    provider: "yfinance",
    start_date: startDate,
    end_date: endDate,
  });
  try {
    const payload = await requestJson(`/api/v1/equity/price/historical?${params}`);
    renderQuote(payload, symbol);
  } catch (error) {
    result.innerHTML = `<div class="error-state">真实行情请求失败：${escapeHtml(error.message)}<br />请检查网络和 Provider 状态。</div>`;
  }
}

function bindInteractions() {
  let searchTimer;
  byId("catalog-search").addEventListener("input", (event) => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => loadCatalog(event.target.value.trim()), 220);
  });
  byId("quote-form").addEventListener("submit", requestQuote);
  byId("refresh-sources").addEventListener("click", loadSources);
  byId("browse-data").addEventListener("click", () => byId("catalog-section").scrollIntoView());
  byId("verify-quote").addEventListener("click", () => {
    byId("quote-section").scrollIntoView();
    byId("quote-symbol").focus({ preventScroll: true });
  });
  byId("copy-config").addEventListener("click", async () => {
    const template = JSON.stringify(
      {
        datasets: {
          "your.market.dataset": {
            type: "parquet",
            versions: { "2026-01-01": "/data/your-market.parquet" },
          },
        },
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(template);
      showToast("配置模板已复制");
    } catch {
      showToast("浏览器未允许剪贴板，请从仓库示例文件复制");
    }
  });
}

async function start() {
  bindInteractions();
  await Promise.all([loadHealth(), loadCatalog(), loadSources()]);
}

start();

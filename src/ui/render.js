import { highlight } from '../parser/highlight.js';
import { summarize } from '../parser/analyzer.js';

export function renderEmpty() {
  return `<div class="empty-state"><p>EF Core logunu yapistir, Donustur'e bas</p></div>`;
}

export function renderError(msg) {
  return `<div class="empty-state error"><p>${msg}</p></div>`;
}

// ── SQL Tab ───────────────────────────────────────────────────────────────────

export function renderBlocks(blocks) {
  return blocks.map((b, i) => {
    const timing = b.timing ? `<span class="timing">${b.timing}</span>` : '';
    return `
      <div class="sql-block" data-index="${i}">
        <div class="block-header">
          <span class="block-num">Sorgu ${i + 1}</span>
          ${timing}
          <button class="btn-copy-block" data-index="${i}">Kopyala</button>
        </div>
        <pre class="block-body">${highlight(b.sql)}</pre>
      </div>`;
  }).join('');
}

// ── Analiz Tab ────────────────────────────────────────────────────────────────

export function renderAnalysis(blocks) {
  if (!blocks.length) return renderEmpty();

  const summary = summarize(blocks);

  const totalBar = summary.totalMs
    ? `<div class="an-summary">
        <div class="an-sum-item">
          <span class="an-sum-n">${blocks.length}</span>
          <span class="an-sum-l">sorgu</span>
        </div>
        <div class="an-sum-sep"></div>
        <div class="an-sum-item">
          <span class="an-sum-n">${summary.totalMs}ms</span>
          <span class="an-sum-l">toplam</span>
        </div>
        <div class="an-sum-sep"></div>
        <div class="an-sum-item">
          <span class="an-sum-n">${summary.tableCount}</span>
          <span class="an-sum-l">tablo</span>
        </div>
      </div>`
    : `<div class="an-summary">
        <div class="an-sum-item"><span class="an-sum-n">${blocks.length}</span><span class="an-sum-l">sorgu</span></div>
        <div class="an-sum-sep"></div>
        <div class="an-sum-item"><span class="an-sum-n">${summary.tableCount}</span><span class="an-sum-l">tablo</span></div>
      </div>`;

  const cards = blocks.map((b, i) => renderAnalysisCard(b, i)).join('');
  return totalBar + cards;
}

function renderAnalysisCard(b, i) {
  const a  = b.analysis;
  const cx = a.complexity;

  // Complexity bar (0-100 scale, cap at 100)
  const barPct = Math.min(100, Math.round((cx.score / 40) * 100));
  const barColor = { ok: '#22c55e', warn: '#fbbf24', err: '#ef4444' }[cx.tier];

  const timing = b.timing
    ? `<span class="ac-timing">${b.timing}</span>`
    : '';

  // Tables
  const tables = a.tables.length
    ? a.tables.map(t => `<span class="an-tag">${t}</span>`).join('')
    : `<span class="an-dim">—</span>`;

  // Metrics row
  const metrics = [
    a.joins.all    && `<div class="an-metric"><span class="an-metric-n">${a.joins.all}</span><span class="an-metric-l">JOIN</span></div>`,
    a.subqueries   && `<div class="an-metric"><span class="an-metric-n">${a.subqueries}</span><span class="an-metric-l">subquery</span></div>`,
    a.conditions.total && `<div class="an-metric"><span class="an-metric-n">${a.conditions.total}</span><span class="an-metric-l">kosul</span></div>`,
    a.conditions.whereCount > 1 && `<div class="an-metric"><span class="an-metric-n">${a.conditions.whereCount}</span><span class="an-metric-l">WHERE blok</span></div>`,
  ].filter(Boolean).join('');

  // Aggregates
  const aggs = a.aggregates.length
    ? a.aggregates.map(f => `<span class="an-tag an-tag-fn">${f}</span>`).join('')
    : '';

  // Feature flags
  const flags = [
    a.hasCase     && 'CASE WHEN',
    a.hasFilter   && 'FILTER',
    a.hasDistinct && 'DISTINCT',
    a.hasWindow   && 'WINDOW',
    a.groupBy     && 'GROUP BY',
    a.orderBy     && 'ORDER BY',
  ].filter(Boolean).map(f => `<span class="an-flag">${f}</span>`).join('');

  // JOIN detail
  const joinDetail = a.joins.all > 0 ? (() => {
    const parts = [];
    if (a.joins.inner) parts.push(`${a.joins.inner} INNER`);
    if (a.joins.left)  parts.push(`${a.joins.left} LEFT`);
    if (a.joins.right) parts.push(`${a.joins.right} RIGHT`);
    if (a.joins.cross) parts.push(`${a.joins.cross} CROSS`);
    return parts.join(' · ');
  })() : '';

  return `
    <div class="an-card">
      <div class="an-card-head">
        <span class="an-card-title">Sorgu ${i + 1}</span>
        ${timing}
        <span class="an-cx-label an-cx-${cx.tier}">${cx.label}</span>
        <div class="an-bar-wrap" title="Karmasiklik skoru: ${cx.score}">
          <div class="an-bar-fill" style="width:${barPct}%;background:${barColor}"></div>
        </div>
        <span class="an-cx-score">${cx.score}</span>
      </div>

      <div class="an-section">
        <span class="an-sec-lbl">Tablolar</span>
        <div class="an-sec-val">${tables}</div>
      </div>

      ${metrics ? `<div class="an-metrics">${metrics}</div>` : ''}

      ${joinDetail ? `<div class="an-section">
        <span class="an-sec-lbl">JOIN detay</span>
        <div class="an-sec-val an-dim-text">${joinDetail}</div>
      </div>` : ''}

      ${aggs ? `<div class="an-section">
        <span class="an-sec-lbl">Aggregate</span>
        <div class="an-sec-val">${aggs}</div>
      </div>` : ''}

      ${flags ? `<div class="an-section">
        <span class="an-sec-lbl">Ozellik</span>
        <div class="an-sec-val">${flags}</div>
      </div>` : ''}
    </div>`;
}

// ── History Tab ───────────────────────────────────────────────────────────────

export function renderHistory(entries) {
  if (!entries.length) {
    return `<div class="empty-state"><p>Henuz gecmis yok</p></div>`;
  }
  return entries.map(e => `
    <div class="hist-item" data-id="${e.id}">
      <div class="hist-main">
        <span class="hist-preview">${escHtml(e.preview || '—')}</span>
        <span class="hist-meta">${e.blockCount} sorgu</span>
      </div>
      <div class="hist-foot">
        <span class="hist-ts">${e.ts}</span>
        <button class="hist-load" data-id="${e.id}">Yukle</button>
        <button class="hist-del" data-id="${e.id}">Sil</button>
      </div>
    </div>`).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

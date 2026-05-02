import './styles/main.css';
import { parseEFLog }                              from './parser/log.js';
import { format }                                  from './parser/formatter.js';
import { analyze }                                 from './parser/analyzer.js';
import { convertDialect }                          from './parser/dialect.js';
import { renderEmpty, renderError,
         renderBlocks, renderAnalysis,
         renderHistory }                           from './ui/render.js';
import { copyText }                                from './ui/clipboard.js';
import { saveHistory, loadHistory,
         deleteHistory, clearHistory }             from './ui/history.js';

let blocks    = [];
let activeRightTab = 'sql';   // 'sql' | 'analiz'
let activeLeftTab  = 'log';   // 'log'  | 'gecmis'
let dialect   = 'pg';

const $ = id => document.getElementById(id);

// ── Mount ─────────────────────────────────────────────────────────────────────

function mount() {
  document.querySelector('#app').innerHTML = `
    <header class="app-header">
      <div>
        <h1>EF Core SQL Converter</h1>
        <div class="subtitle">Parametreleri SQL'e gom, hazir sorguyu al</div>
      </div>
      <a class="credit" href="https://github.com/mehmetaltunel" target="_blank" rel="noopener">created by mmT</a>
    </header>

    <div class="workspace">
      <div class="panels">

        <!-- Left: log input + history -->
        <div class="panel">
          <div class="panel-header output-header">
            <div class="tab-bar">
              <button class="tab active" data-side="left" data-tab="log">Log</button>
              <button class="tab" data-side="left" data-tab="gecmis">Gecmis</button>
            </div>
            <button class="btn-clear-hist" id="clearHistBtn" style="display:none">Temizle</button>
          </div>
          <textarea id="input" spellcheck="false" placeholder="EF Core logunu buraya yapistir..."></textarea>
          <div id="historyPanel" style="display:none"></div>
        </div>

        <!-- Right: sql output + analysis -->
        <div class="panel">
          <div class="panel-header output-header">
            <div class="tab-bar">
              <button class="tab active" data-side="right" data-tab="sql">SQL</button>
              <button class="tab" data-side="right" data-tab="analiz">Analiz</button>
            </div>
            <button class="btn-copy-all" id="copyAll">Tumunu Kopyala</button>
          </div>
          <div id="output">${renderEmpty()}</div>
        </div>

      </div>

      <div class="toolbar">
        <button class="btn-primary" id="convertBtn">Donustur</button>
        <button class="btn-ghost"   id="clearBtn">Temizle</button>

        <div class="dialect-select">
          <button class="dialect active" data-dialect="pg">PostgreSQL</button>
          <button class="dialect" data-dialect="mssql">MSSQL</button>
          <button class="dialect" data-dialect="mysql">MySQL</button>
        </div>

        <span class="status" id="status"></span>
      </div>
    </div>
  `;

  $('convertBtn').addEventListener('click', convert);
  $('clearBtn').addEventListener('click', clearInput);
  $('copyAll').addEventListener('click', copyAll);
  $('clearHistBtn').addEventListener('click', () => {
    clearHistory();
    renderHistoryPanel();
  });

  $('input').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') convert();
  });

  // Tab switching (both sides)
  document.querySelectorAll('.tab-bar').forEach(bar => {
    bar.addEventListener('click', e => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      const side = btn.dataset.side;
      const tab  = btn.dataset.tab;

      bar.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

      if (side === 'left') {
        activeLeftTab = tab;
        $('input').style.display         = tab === 'log'     ? 'block' : 'none';
        $('historyPanel').style.display   = tab === 'gecmis'  ? 'flex'  : 'none';
        $('clearHistBtn').style.display   = tab === 'gecmis'  ? 'block' : 'none';
        if (tab === 'gecmis') renderHistoryPanel();
      } else {
        activeRightTab = tab;
        renderOutput();
      }
    });
  });

  // Dialect switching
  document.querySelector('.dialect-select').addEventListener('click', e => {
    const btn = e.target.closest('.dialect');
    if (!btn) return;
    dialect = btn.dataset.dialect;
    document.querySelectorAll('.dialect').forEach(d => d.classList.toggle('active', d.dataset.dialect === dialect));
    if (blocks.length) renderOutput();
  });

  // Output event delegation
  $('output').addEventListener('click', e => {
    const btn = e.target.closest('.btn-copy-block');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index, 10);
    if (blocks[idx]) copyText(convertDialect(blocks[idx].sql, dialect), btn);
  });

  // History events (delegation)
  $('historyPanel').addEventListener('click', e => {
    const loadBtn = e.target.closest('.hist-load');
    const delBtn  = e.target.closest('.hist-del');

    if (loadBtn) {
      const id      = parseInt(loadBtn.dataset.id, 10);
      const entries = loadHistory();
      const entry   = entries.find(e => e.id === id);
      if (!entry) return;
      // Switch to log tab and restore
      $('input').value = entry.raw;
      document.querySelector('[data-side="left"][data-tab="log"]').click();
      convert();
    }

    if (delBtn) {
      const id = parseInt(delBtn.dataset.id, 10);
      deleteHistory(id);
      renderHistoryPanel();
    }
  });
}

// ── Core logic ────────────────────────────────────────────────────────────────

function convert() {
  const raw    = $('input').value.trim();
  const status = $('status');

  if (!raw) {
    status.textContent = 'Once bir seyler yaz';
    status.className = 'status err';
    return;
  }

  const parsed = parseEFLog(raw);

  if (!parsed.length) {
    $('output').innerHTML = renderError('Gecerli EF Core log formati bulunamadi');
    status.textContent = 'Hic blok bulunamadi';
    status.className = 'status err';
    blocks = [];
    return;
  }

  blocks = parsed.map(b => ({
    ...b,
    sql:      format(b.sql),
    analysis: analyze(b.sql),
  }));

  saveHistory(raw, blocks);

  status.textContent = `${blocks.length} sorgu donusturuldu`;
  status.className = 'status ok';
  renderOutput();
}

function renderOutput() {
  const out = $('output');
  if (!blocks.length) { out.innerHTML = renderEmpty(); return; }

  if (activeRightTab === 'sql') {
    const converted = blocks.map(b => ({ ...b, sql: convertDialect(b.sql, dialect) }));
    out.innerHTML = renderBlocks(converted);
  } else {
    out.innerHTML = renderAnalysis(blocks);
  }
}

function renderHistoryPanel() {
  const panel = $('historyPanel');
  panel.innerHTML = renderHistory(loadHistory());
}

function clearInput() {
  $('input').value = '';
  $('output').innerHTML = renderEmpty();
  $('status').textContent = '';
  $('status').className = 'status';
  blocks = [];
}

function copyAll() {
  if (!blocks.length) return;
  const all = blocks.map((b, i) => `-- Sorgu ${i + 1}\n${convertDialect(b.sql, dialect)}`).join('\n\n');
  copyText(all, $('copyAll'), 'Tumunu Kopyala');
}

mount();

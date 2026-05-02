const KEY     = 'ef-sql-history';
const MAX     = 30;

export function saveHistory(raw, blocks) {
  const entries = loadHistory();
  const entry = {
    id:         Date.now(),
    ts:         new Date().toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
    blockCount: blocks.length,
    preview:    blocks[0]?.sql?.split('\n').find(l => l.trim().startsWith('FROM'))?.trim() || blocks[0]?.sql?.slice(0, 60) || '',
    raw,
  };
  entries.unshift(entry);
  if (entries.length > MAX) entries.length = MAX;
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function deleteHistory(id) {
  const entries = loadHistory().filter(e => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}

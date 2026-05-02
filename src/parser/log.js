import { parseParams, resolveParams } from './params.js';

/**
 * Splits raw EF Core log text into resolved SQL blocks.
 * Each block: { sql: string, timing: string|null, rawParams: object }
 */
export function parseEFLog(raw) {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = [];

  // Matches: optional "[ts INF] Executed DbCommand (Xms)" + [Parameters=[...]] + SQL
  const blockRe = /(?:\[[^\]]*\]\s*Executed DbCommand\s*\((\d+)ms\)\s*)?\[Parameters=\[([^\]]*)\][^\]]*\]\s*\n([\s\S]*?)(?=(?:\[[^\]]*\]\s*Executed DbCommand|\[Parameters=\[)|$)/g;

  let match;
  while ((match = blockRe.exec(text)) !== null) {
    const timing    = match[1] ? `${match[1]}ms` : null;
    const paramStr  = match[2].trim();
    const sqlRaw    = match[3].trim();

    if (!sqlRaw) continue;

    const params = parseParams(paramStr);
    const sql    = resolveParams(sqlRaw, params);

    blocks.push({ timing, sql, rawParams: params });
  }

  // Fallback: single block without "Executed DbCommand" prefix
  if (blocks.length === 0) {
    const m = text.match(/\[Parameters=\[([^\]]*)\][^\]]*\]\s*\n([\s\S]+)/);
    if (m) {
      const params = parseParams(m[1].trim());
      const sql    = resolveParams(m[2].trim(), params);
      blocks.push({ timing: null, sql, rawParams: params });
    }
  }

  return blocks;
}

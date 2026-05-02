const IND = '    ';

export function format(sql) {
  const flat = collapse(sql);
  return formatBlock(flat, 0).trim();
}

// collapse all whitespace/newlines into single spaces
function collapse(sql) {
  return sql.replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n\s*/g, ' ').trim();
}

// ── Main recursive formatter ──────────────────────────────────────────────────

function formatBlock(sql, depth) {
  const ind  = IND.repeat(depth);
  const segs = splitClauses(sql);
  const out  = [];

  for (const seg of segs) {
    const kw   = seg.keyword;
    const body = seg.body.trim();

    if (!kw) { out.push(ind + body); continue; }

    // SELECT — one col per line
    if (kw === 'SELECT') {
      const cols = splitTopLevel(body, ',');
      if (cols.length <= 1) {
        out.push(`${ind}SELECT ${formatExpr(body, depth)}`);
      } else {
        out.push(`${ind}SELECT`);
        cols.forEach((c, i) => {
          const trail = i < cols.length - 1 ? ',' : '';
          out.push(`${ind}${IND}${formatExpr(c.trim(), depth + 1)}${trail}`);
        });
      }
      continue;
    }

    // FROM / JOIN — handle subqueries
    if (kw === 'FROM' || isJoin(kw)) {
      const formatted = formatFromBody(body, depth);
      out.push(`${ind}${kw} ${formatted}`);
      continue;
    }

    // WHERE / HAVING — split on AND/OR
    if (kw === 'WHERE' || kw === 'HAVING') {
      const conds = splitAndOr(body);
      if (conds.length <= 1) {
        out.push(`${ind}${kw} ${body}`);
      } else {
        out.push(`${ind}${kw}`);
        conds.forEach((c, i) => {
          const prefix = i === 0 ? '' : c.op + ' ';
          out.push(`${ind}${IND}${prefix}${c.expr}`);
        });
      }
      continue;
    }

    // Everything else: inline
    out.push(`${ind}${kw} ${body}`);
  }

  return out.join('\n');
}

// ── Clause splitter ───────────────────────────────────────────────────────────

const TOP_CLAUSES = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY',
  'LIMIT', 'OFFSET', 'UNION ALL', 'UNION', 'EXCEPT', 'INTERSECT',
];
const JOIN_CLAUSES = [
  'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
  'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'CROSS JOIN', 'FULL JOIN', 'JOIN',
];
const ALL_KW = [...JOIN_CLAUSES, ...TOP_CLAUSES];

function splitClauses(sql) {
  const segs = [];
  let kwStart = null;
  let kwWord  = null;
  let bodyStart = 0;
  let i = 0;

  while (i < sql.length) {
    i = skipToken(sql, i, (pos) => {
      if (kwWord !== null || pos > 0) {
        // try to match a clause keyword
        const matched = matchKeyword(sql, pos, ALL_KW);
        if (matched) {
          segs.push({ keyword: kwWord, body: sql.slice(bodyStart, pos).trim() });
          kwWord    = matched.toUpperCase().replace(/\s+/g, ' ');
          bodyStart = pos + matched.length;
          return matched.length; // skip over keyword
        }
      } else {
        const matched = matchKeyword(sql, pos, ALL_KW);
        if (matched) {
          kwWord    = matched.toUpperCase().replace(/\s+/g, ' ');
          bodyStart = pos + matched.length;
          return matched.length;
        }
      }
      return 1;
    });
  }

  if (kwWord !== null) {
    segs.push({ keyword: kwWord, body: sql.slice(bodyStart).trim() });
  } else if (sql.trim()) {
    segs.push({ keyword: null, body: sql.trim() });
  }

  return segs.filter(s => s.body || s.keyword);
}

// Walk one token, calling cb(pos) at each depth-0 non-string/paren position.
// cb returns how many extra chars to skip (0 = just advance 1).
function skipToken(sql, i, cb) {
  if (sql[i] === "'") return skipStr(sql, i);
  if (sql[i] === '"') return skipQI(sql, i);
  if (sql[i] === '(') return skipParen(sql, i);
  const skip = cb(i);
  return i + (skip || 1);
}

function skipStr(sql, i) {
  let j = i + 1;
  while (j < sql.length) {
    if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
    if (sql[j] === "'") return j + 1;
    j++;
  }
  return j;
}

function skipQI(sql, i) {
  let j = i + 1;
  while (j < sql.length && sql[j] !== '"') j++;
  return j + 1;
}

function skipParen(sql, i) {
  let depth = 1; let j = i + 1;
  while (j < sql.length && depth > 0) {
    if (sql[j] === "'") { j = skipStr(sql, j); continue; }
    if (sql[j] === '"') { j = skipQI(sql, j); continue; }
    if (sql[j] === '(') depth++;
    if (sql[j] === ')') depth--;
    j++;
  }
  return j;
}

function matchKeyword(sql, pos, kwList) {
  if (pos > 0 && !/[\s,]/.test(sql[pos - 1])) return null;
  for (const kw of kwList) {
    const re = new RegExp('^' + kw.replace(/ /g, '\\s+') + '(?=\\s|$)', 'i');
    if (re.test(sql.slice(pos))) return kw;
  }
  return null;
}

// ── FROM / JOIN body formatter ─────────────────────────────────────────────────

function formatFromBody(body, depth) {
  const ind = IND.repeat(depth);

  // subquery: starts with (
  if (body.trimStart().startsWith('(')) {
    const inner = extractParen(body.trimStart());
    const after = body.trimStart().slice(inner.length + 2).trim(); // alias + ON etc
    const formatted = formatBlock(inner, depth + 1);
    return `(\n${formatted}\n${ind}) ${after}`.trim();
  }

  return body;
}

function extractParen(s) {
  // s starts with '(', return content inside matching paren
  let depth = 1; let i = 1;
  while (i < s.length && depth > 0) {
    if (s[i] === "'") { i = skipStr(s, i); continue; }
    if (s[i] === '"') { i = skipQI(s, i); continue; }
    if (s[i] === '(') depth++;
    if (s[i] === ')') depth--;
    if (depth > 0) i++;
    else break;
  }
  return s.slice(1, i).trim();
}

// ── Expression formatter (handles CASE WHEN inline) ───────────────────────────

function formatExpr(expr, depth) {
  // Format CASE WHEN THEN ELSE END blocks inside an expression
  if (!/\bCASE\b/i.test(expr)) return expr;

  const ind  = IND.repeat(depth);
  const ind1 = IND.repeat(depth + 1);

  return expr.replace(/\bCASE\b([\s\S]*?)\bEND\b/gi, (match, body) => {
    const whenParts = body.split(/\b(WHEN|THEN|ELSE)\b/i).filter(Boolean);
    let out = 'CASE';
    let mode = null;
    for (const part of whenParts) {
      const up = part.trim().toUpperCase();
      if (up === 'WHEN' || up === 'THEN' || up === 'ELSE') { mode = up; continue; }
      if (mode === 'WHEN') out += `\n${ind1}WHEN ${part.trim()}`;
      else if (mode === 'THEN') out += ` THEN ${part.trim()}`;
      else if (mode === 'ELSE') out += `\n${ind1}ELSE ${part.trim()}`;
    }
    out += `\n${ind}END`;
    return out;
  });
}

// ── AND/OR splitter ───────────────────────────────────────────────────────────

function splitAndOr(sql) {
  const parts = [];
  let buf = '';
  let i   = 0;

  while (i < sql.length) {
    if (sql[i] === "'") {
      const end = skipStr(sql, i);
      buf += sql.slice(i, end); i = end; continue;
    }
    if (sql[i] === '"') {
      const end = skipQI(sql, i);
      buf += sql.slice(i, end); i = end; continue;
    }
    if (sql[i] === '(') {
      const end = skipParen(sql, i);
      buf += sql.slice(i, end); i = end; continue;
    }

    const rest = sql.slice(i);
    const andM = rest.match(/^AND\s+/i);
    const orM  = rest.match(/^OR\s+/i);

    if (andM && buf.trim()) { parts.push({ op: '', expr: buf.trim() }); buf = ''; i += andM[0].length; continue; }
    if (orM  && buf.trim()) { parts.push({ op: '', expr: buf.trim() }); buf = ''; i += orM[0].length; continue; }

    buf += sql[i++];
  }

  if (buf.trim()) parts.push({ op: '', expr: buf.trim() });

  // mark AND/OR prefixes for lines 2+
  return parts.map((p, idx) => {
    if (idx === 0) return { op: '', expr: p.expr };
    return { op: 'AND ', expr: p.expr };
  });
}

// ── Top-level comma splitter ──────────────────────────────────────────────────

function splitTopLevel(sql, delim) {
  const parts = [];
  let buf = '';
  let i   = 0;

  while (i < sql.length) {
    if (sql[i] === "'") { const e = skipStr(sql, i); buf += sql.slice(i, e); i = e; continue; }
    if (sql[i] === '"') { const e = skipQI(sql, i);  buf += sql.slice(i, e); i = e; continue; }
    if (sql[i] === '(') { const e = skipParen(sql, i); buf += sql.slice(i, e); i = e; continue; }
    if (sql[i] === delim) { parts.push(buf); buf = ''; i++; continue; }
    buf += sql[i++];
  }

  if (buf) parts.push(buf);
  return parts;
}

function isJoin(kw) {
  return JOIN_CLAUSES.some(j => j === kw);
}

/**
 * Converts a resolved PostgreSQL SQL string to MSSQL or MySQL syntax.
 */
export function convertDialect(sql, target) {
  if (target === 'pg')    return sql;
  if (target === 'mssql') return toMSSQL(sql);
  if (target === 'mysql') return toMySQL(sql);
  return sql;
}

// ── PostgreSQL → MSSQL ───────────────────────────────────────────────────────

function toMSSQL(sql) {
  let s = sql;

  // "Schema"."Table" -> [Schema].[Table]
  s = s.replace(/"(\w+)"\."(\w+)"/g, '[$1].[$2]');
  // remaining "Identifier" -> [Identifier]
  s = s.replace(/"(\w+)"/g, '[$1]');

  // ::int, ::bigint, ::numeric, ::text, ::varchar -> CAST(expr AS type)
  s = replaceCasts(s);

  // LIMIT n -> TOP n (move from end of SELECT to after SELECT keyword)
  s = limitToTop(s);

  // true/false literals
  s = s.replace(/\bTRUE\b/gi, '1').replace(/\bFALSE\b/gi, '0');

  // ILIKE -> LIKE (MSSQL is case-insensitive by default with most collations)
  s = s.replace(/\bILIKE\b/gi, 'LIKE');

  // coalesce stays, filter clause doesn't exist in MSSQL — note only, no auto-rewrite (too complex)

  return s;
}

// ── PostgreSQL → MySQL ────────────────────────────────────────────────────────

function toMySQL(sql) {
  let s = sql;

  // "Schema"."Table" -> `Schema`.`Table`
  s = s.replace(/"(\w+)"\."(\w+)"/g, '`$1`.`$2`');
  s = s.replace(/"(\w+)"/g, '`$1`');

  // :: casts
  s = replaceCasts(s);

  // true/false stay (MySQL supports them)
  // ILIKE -> LIKE (MySQL case-insensitive by default)
  s = s.replace(/\bILIKE\b/gi, 'LIKE');

  return s;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAST_TYPES = {
  int:     'INT',
  bigint:  'BIGINT',
  numeric: 'NUMERIC',
  float:   'FLOAT',
  text:    'NVARCHAR(MAX)',
  varchar: 'NVARCHAR(MAX)',
  bool:    'BIT',
  uuid:    'UNIQUEIDENTIFIER',
  date:    'DATE',
  timestamp: 'DATETIME',
};

function replaceCasts(s) {
  // expr::type  →  CAST(expr AS TYPE)
  // Work right-to-left to handle chained casts
  return s.replace(/(\([^()]*\)|[\w.']+)\s*::\s*(\w+)/g, (match, expr, type) => {
    const t = CAST_TYPES[type.toLowerCase()] || type.toUpperCase();
    return `CAST(${expr.trim()} AS ${t})`;
  });
}

function limitToTop(s) {
  // Find LIMIT n at top level and move to TOP n after SELECT
  const limitRe = /\bLIMIT\s+(\d+)\b/i;
  const m = s.match(limitRe);
  if (!m) return s;
  const n = m[1];
  s = s.replace(limitRe, '').trim();
  s = s.replace(/\bSELECT\b/i, `SELECT TOP ${n}`);
  return s;
}

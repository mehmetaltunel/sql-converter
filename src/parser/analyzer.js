export function analyze(sql) {
  return {
    tables:      extractTables(sql),
    joins:       extractJoins(sql),
    subqueries:  countSubqueries(sql),
    conditions:  extractConditions(sql),
    aggregates:  extractAggregates(sql),
    groupBy:     hasGroupBy(sql),
    orderBy:     hasOrderBy(sql),
    hasCase:     /\bCASE\b/i.test(sql),
    hasFilter:   /\bFILTER\s*\(/i.test(sql),
    hasDistinct: /\bDISTINCT\b/i.test(sql),
    hasWindow:   /\bOVER\s*\(/i.test(sql),
    complexity:  complexity(sql),
  };
}

function extractTables(sql) {
  const tables = new Set();
  const re = /(?:FROM|JOIN)\s+"?(\w+)"?\."?(\w+)"?(?:\s+AS\s+\w+)?(?!\s*\()|(?:FROM|JOIN)\s+"?(\w+)"?(?:\s+AS\s+\w+)?(?!\s*\()/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    if (m[1] && m[2]) tables.add(`${m[1]}.${m[2]}`);
    else if (m[3])     tables.add(m[3]);
  }
  return [...tables];
}

function extractJoins(sql) {
  const all    = (sql.match(/\bJOIN\b/gi)              || []).length;
  const left   = (sql.match(/\bLEFT\s+(OUTER\s+)?JOIN\b/gi)  || []).length;
  const inner  = (sql.match(/\bINNER\s+JOIN\b/gi)      || []).length;
  const right  = (sql.match(/\bRIGHT\s+(OUTER\s+)?JOIN\b/gi) || []).length;
  const cross  = (sql.match(/\bCROSS\s+JOIN\b/gi)      || []).length;
  return { all, left, inner, right, cross };
}

function countSubqueries(sql) {
  return (sql.match(/\(\s*SELECT\b/gi) || []).length;
}

function extractConditions(sql) {
  // Find WHERE clauses at any level
  const whereBlocks = [];
  const re = /\bWHERE\s+([\s\S]+?)(?=\bGROUP\s+BY\b|\bORDER\s+BY\b|\bHAVING\b|\bLIMIT\b|\bUNION\b|\)|\s*$)/gi;
  let m;
  while ((m = re.exec(sql)) !== null) whereBlocks.push(m[1].trim());

  const total = whereBlocks.reduce((acc, block) => {
    const ands = (block.match(/\bAND\b/gi) || []).length;
    const ors  = (block.match(/\bOR\b/gi)  || []).length;
    return acc + ands + ors + 1;
  }, 0);

  return { whereCount: whereBlocks.length, total };
}

function extractAggregates(sql) {
  const fns = [];
  const re = /\b(COUNT|SUM|AVG|MIN|MAX|ARRAY_AGG|STRING_AGG|JSON_AGG|COALESCE|NULLIF)\s*\(/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(sql)) !== null) {
    const fn = m[1].toUpperCase();
    if (!seen.has(fn)) { seen.add(fn); fns.push(fn); }
  }
  return fns;
}

function hasGroupBy(sql)  { return /\bGROUP\s+BY\b/i.test(sql); }
function hasOrderBy(sql)  { return /\bORDER\s+BY\b/i.test(sql); }

function complexity(sql) {
  const joins = (sql.match(/\bJOIN\b/gi)         || []).length;
  const subs  = (sql.match(/\(\s*SELECT\b/gi)    || []).length;
  const ands  = (sql.match(/\bAND\b/gi)          || []).length;
  const aggs  = (sql.match(/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/gi) || []).length;
  const cases = (sql.match(/\bCASE\b/gi)         || []).length;
  const score = joins * 3 + subs * 5 + ands + aggs * 2 + cases * 2;
  if (score <= 5)  return { label: 'Basit',   score, tier: 'ok'   };
  if (score <= 15) return { label: 'Orta',    score, tier: 'warn' };
  if (score <= 30) return { label: 'Kompleks',score, tier: 'err'  };
  return              { label: 'Cok Agir', score, tier: 'err'  };
}

export function summarize(blocks) {
  const timings    = blocks.map(b => b.timing ? parseInt(b.timing) : null).filter(n => n !== null);
  const totalMs    = timings.reduce((a, b) => a + b, 0);
  const allTables  = new Set();
  blocks.forEach(b => b.analysis.tables.forEach(t => allTables.add(t)));
  return { totalMs, tableCount: allTables.size, allTables: [...allTables] };
}

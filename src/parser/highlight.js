const KEYWORDS = new Set([
  'SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL','LIMIT','OFFSET',
  'ORDER','BY','GROUP','HAVING','JOIN','LEFT','RIGHT','INNER','OUTER','FULL',
  'ON','AS','CASE','WHEN','THEN','ELSE','END','DISTINCT','COUNT','SUM','AVG',
  'MIN','MAX','COALESCE','FILTER','INSERT','UPDATE','DELETE','SET','INTO',
  'VALUES','EXISTS','BETWEEN','LIKE','ILIKE','UNION','ALL','EXCEPT',
  'INTERSECT','CAST','OVER','PARTITION','WITH','TOP',
]);

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Returns HTML string with syntax-highlighted SQL.
 * Works on already-resolved SQL (no parameter placeholders).
 */
export function highlight(sql) {
  const tokens = tokenize(sql);
  return tokens.map(renderToken).join('');
}

function tokenize(sql) {
  const tokens = [];
  let i = 0;

  while (i < sql.length) {
    // Single-quoted string
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Identifier or keyword: "schema"."Table" or plain word
    if (sql[i] === '"') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '"') j++;
      tokens.push({ type: 'ident', value: sql.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Number
    if (/[0-9]/.test(sql[i]) || (sql[i] === '-' && /[0-9]/.test(sql[i + 1] || ''))) {
      let j = i + 1;
      while (j < sql.length && /[0-9.]/.test(sql[j])) j++;
      tokens.push({ type: 'number', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Word (keyword or identifier)
    if (/[A-Za-z_]/.test(sql[i])) {
      let j = i + 1;
      while (j < sql.length && /[\w]/.test(sql[j])) j++;
      const word = sql.slice(i, j);
      tokens.push({ type: KEYWORDS.has(word.toUpperCase()) ? 'keyword' : 'word', value: word });
      i = j;
      continue;
    }

    // Cast shorthand ::type
    if (sql[i] === ':' && sql[i + 1] === ':') {
      let j = i + 2;
      while (j < sql.length && /[\w]/.test(sql[j])) j++;
      tokens.push({ type: 'cast', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Whitespace / other — pass through
    tokens.push({ type: 'other', value: sql[i] });
    i++;
  }

  return tokens;
}

function renderToken(t) {
  const v = escapeHtml(t.value);
  switch (t.type) {
    case 'keyword': return `<span class="kw">${v.toUpperCase()}</span>`;
    case 'string':  return `<span class="str">${v}</span>`;
    case 'number':  return `<span class="num">${v}</span>`;
    case 'cast':    return `<span class="op">${v}</span>`;
    default:        return v;
  }
}

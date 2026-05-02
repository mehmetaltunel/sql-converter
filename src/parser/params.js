/**
 * Parses the Parameters=[...] section of an EF Core log line.
 * Returns a map of { '@paramName': { type: 'string'|'number'|'null', value: string } }
 */
export function parseParams(paramStr) {
  const params = {};

  const stringRe = /@([\w]+)='((?:[^']|'')*)'/g;
  const numberRe = /@([\w]+)=(-?[0-9]+(?:\.[0-9]+)?)/g;
  const nullRe   = /@([\w]+)=NULL/gi;

  let m;

  while ((m = stringRe.exec(paramStr)) !== null) {
    params['@' + m[1]] = { type: 'string', value: m[2].replace(/''/g, "'") };
  }
  while ((m = numberRe.exec(paramStr)) !== null) {
    if (!params['@' + m[1]]) {
      params['@' + m[1]] = { type: 'number', value: m[2] };
    }
  }
  while ((m = nullRe.exec(paramStr)) !== null) {
    params['@' + m[1]] = { type: 'null', value: 'NULL' };
  }

  return params;
}

/**
 * Replaces all parameter placeholders in sql with their resolved literal values.
 */
export function resolveParams(sql, params) {
  const sorted = Object.keys(params).sort((a, b) => b.length - a.length);
  let result = sql;

  for (const name of sorted) {
    const p = params[name];
    let replacement;

    if (p.type === 'null') {
      replacement = 'NULL';
    } else if (p.type === 'number') {
      replacement = p.value;
    } else {
      replacement = `'${p.value.replace(/'/g, "''")}'`;
    }

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped + '(?![\\w])', 'g'), replacement);
  }

  return result;
}

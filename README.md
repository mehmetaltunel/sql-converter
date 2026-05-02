# EF Core SQL Converter

> Paste your EF Core log. Get clean, executable SQL instantly.

[![Live Demo](https://img.shields.io/badge/live-efcore.xyzapps.net-3b82f6?style=flat-square)](https://efcore.xyzapps.net)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/mehmetaltunel?style=flat-square&color=ea4aaa)](https://github.com/sponsors/mehmetaltunel)

**[→ efcore.xyzapps.net](https://efcore.xyzapps.net)**

---

EF Core logs your queries like this:

```
[Parameters=[@__userId_0='a1b2c3d4-...' (DbType = Guid), @__isActive_1='True'], CommandType='Text', CommandTimeout='30']
SELECT u."Id", u."Email"
FROM "App"."Users" AS u
WHERE u."Id" = @__userId_0
  AND u."IsActive" = @__isActive_1
LIMIT 1
```

Paste it in, get this back:

```sql
SELECT
    u."Id",
    u."Email"
FROM
    "App"."Users" AS u
WHERE
    u."Id" = 'a1b2c3d4-...'
    AND u."IsActive" = TRUE
LIMIT 1
```

## Features

| | |
|---|---|
| **Parameter resolution** | Strings, numbers, GUIDs, datetimes, booleans, NULLs |
| **SQL formatter** | SELECT columns, WHERE clauses, JOINs, CASE WHEN, subqueries |
| **Dialect conversion** | PostgreSQL → MSSQL (SQL Server) or MySQL |
| **Query analysis** | Table list, JOIN breakdown, subquery depth, complexity score |
| **Multi-query support** | Paste an entire log with many `Executed DbCommand` entries |
| **History** | Last 30 conversions saved in localStorage |
| **100% client-side** | Nothing leaves your browser |

## Stack

Vanilla JS + [Vite](https://vitejs.dev). No framework, no dependencies.

## Development

```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # output → dist/
```

## Project structure

```
src/
  parser/
    params.js      # Parses Parameters=[...] block, builds param map
    log.js         # Splits raw log into blocks, calls params.js
    formatter.js   # Formats SQL (recursive, clause-aware)
    highlight.js   # Tokenizer-based syntax highlighter
    analyzer.js    # Query complexity analysis
    dialect.js     # PostgreSQL → MSSQL / MySQL conversion
  ui/
    render.js      # HTML generation
    clipboard.js   # Copy-to-clipboard with button feedback
    history.js     # localStorage history helpers
  styles/
    main.css       # All styles, single file
  main.js          # Entry point, event wiring
```

## Support

If this tool saves you time, consider sponsoring:

**[→ github.com/sponsors/mehmetaltunel](https://github.com/sponsors/mehmetaltunel)**

## License

MIT

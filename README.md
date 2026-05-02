# EF Core SQL Converter

Free browser-based tool that converts **Entity Framework Core log output** into clean, executable SQL by resolving parameter placeholders inline.

**Live → [efcore.xyzapps.net](https://efcore.xyzapps.net)**

## What it does

EF Core logs your queries like this:

```
[Parameters=[@__userId_0='a1b2c3d4-...' (DbType = Guid)], CommandType='Text', CommandTimeout='30']
SELECT u."Id", u."Email"
FROM "App"."Users" AS u
WHERE u."Id" = @__userId_0
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
LIMIT 1
```

## Features

- **Parameter resolution** — strings, numbers, GUIDs, datetimes, NULLs, booleans
- **SQL formatter** — SELECT columns, WHERE clauses, JOINs, CASE WHEN, subqueries
- **Dialect conversion** — PostgreSQL → MSSQL (SQL Server) or MySQL
- **Query analysis** — table list, JOIN breakdown, subquery depth, complexity score
- **Multi-query support** — paste an entire log with many `Executed DbCommand` entries
- **History** — last 30 conversions saved in localStorage
- **100% client-side** — nothing leaves your browser

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

## License

MIT

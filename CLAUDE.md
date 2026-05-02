# sql-converter

EF Core loglarindan parametreleri SQL'e gomup hazir sorgu uretme araci.

## Baslatma

```
npm run dev   # http://localhost:5173
npm run build # dist/
```

## Mimari

```
src/
  parser/
    params.js     -- EF Core Parameters=[...] satirini parse eder, parametreleri map'e cevirmek
    log.js        -- Ham log metnini bloklara ayirir, params.js'i cagirip SQL'i cozumler
    highlight.js  -- Cozumlenmis SQL'e syntax highlight uygular (tokenizer tabanli)
  ui/
    render.js     -- HTML uretir (bos durum, hata, sorgu bloklari)
    clipboard.js  -- Kopyalama islemi + buton durum yonetimi
  styles/
    main.css      -- Tum stiller, tek dosya
  main.js         -- Uygulama giris noktasi, DOM mount, event wiring
```

## Temel akis

1. Kullanici EF Core logunu sol panele yapistirirak Ctrl+Enter veya "Donustur"e basar
2. `parseEFLog` (log.js) regex ile bloklari bulur
3. Her blok icin `parseParams` + `resolveParams` (params.js) ile parametreler SQL'e islenir
4. `renderBlocks` (render.js) her blok icin HTML uretir
5. `highlight` (highlight.js) tokenize ederek renklendirme uygular

## Desteklenen parametre tipleri

- String: `@param='deger'` -> `'deger'`
- Number: `@param=123` -> `123`
- NULL: `@param=NULL` -> `NULL`
- Datetime string olarak islenir (zaten string pattern eşleşir)
- `Size`, `Nullable`, `DbType` gibi ek metadata gozardi edilir

## Stil kurallari

- Emoji kullanma
- Yorum satiri sadece neden acik degilse yaz
- CSS degiskenleri `:root`'ta, degistirme oradan yapilir
- Renk paleti `--bg`, `--surface`, `--surface2`, `--border`, `--accent`, `--accent2`
- Syntax: `--kw`, `--str`, `--num`, `--op`

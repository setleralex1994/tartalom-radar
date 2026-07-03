# PPC hírek és tartalomgyár

_Készítette: [www.setleralex.hu](https://www.setleralex.hu)_

Helyi Node app egy PPC specialistának, két modullal:

1. **Radar** — figyeli a megadott szakmai forrásokat (RSS + scrape-tartalék), hetente
   összegyűjti az új cikkeket, Claude **magyarul** összefoglalja és relevanciát ad nekik,
   majd egy szép HTML **e-mailt** küld a hét terméséről (+ trend/tartalomötletek).
2. **Tartalomgyár** — helyi webes dashboard: a hét cikkei mellett egy gombbal
   **videós hirdetés forgatókönyvet** (DO!marketing váz: 12–15 nyitómondat 10 horog-típusból,
   sztori-törzs, CTA), LinkedIn-posztot vagy hírlevél-szösszenetet generál a hírből.

## Telepítés

```
npm install
cp .env.example .env   # töltsd ki az API-kulcsot és az SMTP-adatokat
```

`.env` — a lényeges mezők: `ANTHROPIC_API_KEY`, `SMTP_*`, `DIGEST_TO`.

## Használat

- **Radar futtatása + e-mail:** `npm run radar`
- **Dashboard (tartalomgyár):** `npm run serve` → http://localhost:4310
  - A dashboardon a *Radar futtatása most* gomb e-mail nélkül futtatja a lehúzást.

## Heti automatizálás (Windows Feladatütemező)

Hozz létre egy heti feladatot, ami ezt futtatja a projekt mappájából:

```
node src/radar.js
```

## Forrás-lista

A `config/sources.json` szabadon bővíthető. Típusok: `rss` (böngésző-User-Agenttel),
`scrape` (cheerio, a `selector` mezővel). A `Tema-radar` sorok Google News RSS
kulcsszavas lekérdezések — ezekkel a szélesebb hír-tér is bekerül.

## Modellek

Alapértelmezetten mindenhez `claude-opus-4-8`. Költség-érzékeny esetben az
összefoglaló modellt átállíthatod (`CLAUDE_SUMMARY_MODEL`), a tartalomgyártást
érdemes Opuson hagyni.

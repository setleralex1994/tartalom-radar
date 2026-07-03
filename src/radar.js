// Radar pipeline: forrasok lehuzasa -> dedup -> Claude osszefoglalo -> szures ->
// trend-szintezis -> heti HTML archivum + e-mail.
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchSource } from './fetch.js';
import { isSeen, saveItem, getItem, itemsMissingSummary, itemsForWeek } from './db.js';
import { summarizeItem, synthesizeTrends } from './claude.js';
import { buildHtml, sendDigest } from './email.js';
import { isoWeek } from './util.js';
import { isPPCRelevant } from './topic.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sources = JSON.parse(readFileSync(join(root, 'config', 'sources.json'), 'utf8'));
const DAYS = Number(process.env.RADAR_DAYS || 7);
const MIN_RELEVANCE = Number(process.env.MIN_RELEVANCE || 3);

export async function runRadar({ send = true } = {}) {
  const cutoff = Date.now() - DAYS * 86400000;
  const week = isoWeek();

  // 1) Lehuzas + dedup + friss szures
  const collected = [];
  for (const s of sources) {
    try {
      const items = await fetchSource(s);
      let added = 0;
      let skipped = 0;
      for (const it of items) {
        if (it.published && it.published.getTime() < cutoff) continue;
        if (isSeen(it.guid)) continue;
        if (!isPPCRelevant(it, s.ppc)) {
          skipped++;
          continue;
        }
        collected.push(it);
        added++;
      }
      console.log(`[${s.name}] ${items.length} tetel, ${added} uj PPC${skipped ? `, ${skipped} kiszurve (nem PPC)` : ''}`);
    } catch (e) {
      console.warn(`[${s.name}] hiba: ${e.message}`);
    }
  }
  console.log(`Osszesen ${collected.length} uj PPC cikk.`);

  // 1) Uj cikkek raw tarolasa (osszefoglalo nelkul) — a felulethez ez is eleg
  for (const it of collected) {
    if (getItem(it.guid)) continue;
    saveItem({
      ...it,
      published: it.published ? it.published.toISOString() : null,
      week,
      importance: 0,
      relevance: 0,
      summary_hu: '',
      why_hu: '',
      action_hu: '',
      seen_at: new Date().toISOString(),
    });
  }

  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  if (!hasKey) {
    console.log(`ANTHROPIC_API_KEY nincs -> ${collected.length} uj cikk tarolva, magyar osszefoglalo nelkul.`);
    return { count: collected.length, week, summarized: false };
  }

  // 2) Magyar osszefoglalo + relevancia: minden osszefoglalo nelkuli tetel (uj + korabbi is), korlatozva.
  //    Igy a kulcs beallitasa utan a mar tarolt hirek is visszamenoleg megkapjak a magyar osszefoglalot.
  const BACKFILL = Number(process.env.BACKFILL_LIMIT || 120);
  const toSummarize = itemsMissingSummary().slice(0, BACKFILL);
  console.log(`${toSummarize.length} tetel osszefoglalasa magyarul...`);
  for (const it of toSummarize) {
    try {
      const a = await summarizeItem(it);
      saveItem({
        ...it,
        title_hu: a.title_hu || '',
        importance: Number(a.importance) || 0,
        relevance: Number(a.relevance) || 0,
        summary_hu: a.summary_hu || '',
        why_hu: a.why_hu || '',
        action_hu: a.action_hu || '',
      });
    } catch (e) {
      console.warn(`Claude hiba (${it.title}): ${e.message}`);
    }
  }

  // 3) Heti e-mail: az e heti, relevans, osszefoglalt hirek
  const processed = itemsForWeek(week).filter((i) => i.summary_hu && i.relevance >= MIN_RELEVANCE);
  console.log(`${processed.length} relevans e heti cikk (>= ${MIN_RELEVANCE}).`);

  let trends = null;
  if (processed.length) {
    try {
      trends = await synthesizeTrends(processed);
    } catch (e) {
      console.warn(`Trend-szintezis hiba: ${e.message}`);
    }
  }

  const html = buildHtml(processed, trends, week);
  mkdirSync(join(root, 'archive'), { recursive: true });
  writeFileSync(join(root, 'archive', `${week}.html`), html, 'utf8');
  if (send && processed.length) await sendDigest(html, week);

  return { count: processed.length, week, summarized: true };
}

// CLI: node src/radar.js
const invokedDirectly =
  process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  runRadar()
    .then((r) => console.log('Kesz:', r))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

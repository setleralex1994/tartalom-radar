// Radar pipeline: forrasok lehuzasa -> dedup -> Claude osszefoglalo -> szures ->
// trend-szintezis -> heti HTML archivum + e-mail.
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchSource } from './fetch.js';
import { isSeen, saveItem } from './db.js';
import { summarizeItem, synthesizeTrends } from './claude.js';
import { buildHtml, sendDigest } from './email.js';
import { isoWeek } from './util.js';

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
      for (const it of items) {
        if (it.published && it.published.getTime() < cutoff) continue;
        if (isSeen(it.guid)) continue;
        collected.push(it);
        added++;
      }
      console.log(`[${s.name}] ${items.length} tetel, ${added} uj`);
    } catch (e) {
      console.warn(`[${s.name}] hiba: ${e.message}`);
    }
  }
  console.log(`Osszesen ${collected.length} uj cikk feldolgozasra.`);

  // 2) Claude osszefoglalo + relevancia
  const processed = [];
  for (const it of collected) {
    try {
      const a = await summarizeItem(it);
      const row = {
        ...it,
        published: it.published ? it.published.toISOString() : null,
        week,
        importance: Number(a.importance) || 0,
        relevance: Number(a.relevance) || 0,
        summary_hu: a.summary_hu || '',
        why_hu: a.why_hu || '',
        action_hu: a.action_hu || '',
        seen_at: new Date().toISOString(),
      };
      saveItem(row);
      if (row.relevance >= MIN_RELEVANCE) processed.push(row);
    } catch (e) {
      console.warn(`Claude hiba (${it.title}): ${e.message}`);
    }
  }
  processed.sort((a, b) => b.relevance - a.relevance || b.importance - a.importance);
  console.log(`${processed.length} relevans cikk (>= ${MIN_RELEVANCE}).`);

  // 3) Trend-szintezis
  let trends = null;
  if (processed.length) {
    try {
      trends = await synthesizeTrends(processed);
    } catch (e) {
      console.warn(`Trend-szintezis hiba: ${e.message}`);
    }
  }

  // 4) Archivum + e-mail
  const html = buildHtml(processed, trends, week);
  mkdirSync(join(root, 'archive'), { recursive: true });
  writeFileSync(join(root, 'archive', `${week}.html`), html, 'utf8');
  if (send && processed.length) await sendDigest(html, week);

  return { count: processed.length, week };
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

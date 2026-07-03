// Egyszeru, natifug-mentes JSON tar. A tarat a docs/data/ ala tesszuk, hogy
// a GitHub Pages statikusan ki tudja szolgalni (online felulet), es ~6 honapra
// visszamenoleg tartsuk meg a hireket.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'docs', 'data');
const file = join(dir, 'items.json');
const RETAIN_DAYS = 183; // kb. fel ev
mkdirSync(dir, { recursive: true });

function load() {
  if (!existsSync(file)) return { items: {}, content: [], updated_at: null };
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    return { items: raw.items || {}, content: raw.content || [], updated_at: raw.updated_at || null };
  } catch {
    return { items: {}, content: [], updated_at: null };
  }
}

let db = load();

// Fel evnel regebbi hireket kidobjuk (megjelenesi datum, vagy ha nincs, az elso latas ideje alapjan).
function prune() {
  const cutoff = Date.now() - RETAIN_DAYS * 86400000;
  for (const [g, it] of Object.entries(db.items)) {
    const t = Date.parse(it.published || it.seen_at || '') || 0;
    if (t && t < cutoff) delete db.items[g];
  }
}

function persist() {
  prune();
  db.updated_at = new Date().toISOString();
  writeFileSync(file, JSON.stringify(db, null, 2), 'utf8');
}

export function isSeen(guid) {
  return !!db.items[guid];
}

export function saveItem(row) {
  db.items[row.guid] = row;
  persist();
}

export function getItem(guid) {
  return db.items[guid] || null;
}

export function itemsForWeek(week) {
  return Object.values(db.items)
    .filter((i) => i.week === week)
    .sort((a, b) => b.relevance - a.relevance || b.importance - a.importance);
}

export function allWeeks() {
  return [...new Set(Object.values(db.items).map((i) => i.week))].sort().reverse();
}

export function saveContent(itemGuid, format, body) {
  db.content.push({
    id: Date.now(),
    item_guid: itemGuid,
    format,
    body,
    created_at: new Date().toISOString(),
  });
  persist();
}

export function contentForItem(guid) {
  return db.content.filter((c) => c.item_guid === guid);
}

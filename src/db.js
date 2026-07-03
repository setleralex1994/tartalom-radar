// Egyszeru, natifug-mentes JSON tar. Heti nehany tucat cikkhez boven eleg,
// es Windowson nem kell natifv modult forditani.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'data');
const file = join(dir, 'store.json');
mkdirSync(dir, { recursive: true });

function load() {
  if (!existsSync(file)) return { items: {}, content: [] };
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { items: {}, content: [] };
  }
}

let db = load();

function persist() {
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

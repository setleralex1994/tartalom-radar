// Tartalom Radar — online felulet. Statikus: beolvassa a data/items.json-t es a bongeszoben
// osszeallitja a promptot a valasztott tartalomtipusra. Nem kell API-kulcs.

// --- Tartalomtipusok es promptsablonok ---------------------------------------

const HOOKS = [
  'KÉTSÉG — kelts bizonytalanságot, kérdőjelezd meg, amiben eddig hittek',
  'FÉLELEM — mutass rá egy kemény tényre / valós problémára',
  'TEKINTÉLY — alapozd meg a hitelességed, miért érdemes rád figyelni',
  'IPARÁG — ránts le a leplet egy iparági trendről/belső igazságról',
  'KÉRDÉS — tegyél fel egy ütős kérdést',
  'FÁJDALOM — üsd meg az érzékeny pontot, a legnagyobb fájdalmat',
  'OKTATÁS — adj azonnali értéket egy hasznos infóval',
  'SZITUÁCIÓ — fess le egy helyzetet, amivel azonosulnak',
  'SOKK — egy ütős, merész kijelentés a minták megtöréséhez',
  'SZTORI — meséld el egy lebilincselő történet nyitányát',
].join('\n- ');

const FORMATS = {
  video: {
    label: 'Videós hirdetés forgatókönyv',
    instruction:
      'Írj MAGYAR videós hirdetés-forgatókönyvet a DO!marketing váz szerint:\n' +
      'A) NYITÓMONDATOK (12-15 db) — mindegyik elé írd a horog-típust szögletes zárójelben. Meríts sok különböző típusból:\n- ' +
      HOOKS +
      '\nA nyitómondatok legyenek felmondhatók, és a végük illeszkedjen egy általános sztori-törzs elé.\n' +
      'B) SZTORI TÖRZS (1-3 változat, 30-60 mp) — bizalomépítés, a probléma feloldása, a megoldás felvázolása, 2-3 oktatás-morzsa.\n' +
      'C) CTA — 1 kész, cselekvésre ösztönző blokk.\n' +
      'A közönség magyar KKV / hirdető. A hír egy új funkció / változás / lehetőség — erre építs.',
  },
  blog: {
    label: 'Blogbejegyzés',
    instruction:
      'Írj MAGYAR, SEO-barát blogbejegyzést (600-900 szó) erről a hírről egy PPC-szakértő hangján.\n' +
      '- Figyelemfelkeltő cím + rövid bevezető (miért fontos ez most).\n' +
      '- 3-5 H2 alcím, közérthető kifejtés, konkrét gyakorlati tanácsok hirdetőknek.\n' +
      '- 1 kiemelt tipp/„checklist”, majd záró CTA (pl. konzultáció).\n' +
      '- Kerüld az általánosságokat, adj kézzelfogható példákat.',
  },
  reels: {
    label: 'Rövid videó / Reels script',
    instruction:
      'Írj MAGYAR rövid videó (Reels/TikTok/Shorts) scriptet, 30-45 mp.\n' +
      '- Erős HOOK az első 3 mp-ben.\n' +
      '- 3 tömör, gyors érték-pont a hírből.\n' +
      '- Záró CTA + javaslat feliratra/képaláírásra.\n' +
      '- Jelöld a vágásokat/megjegyzéseket [szögletes zárójelben].',
  },
  linkedin: {
    label: 'LinkedIn-poszt',
    instruction:
      'Írj EGY MAGYAR LinkedIn-posztot erről a hírről egy PPC specialista hangján.\n' +
      '- Ütős első sor (horog), 3-6 rövid bekezdés, konkrét szakmai insight.\n' +
      '- Záró kérdés vagy CTA, majd 3-5 releváns hashtag.',
  },
  newsletter: {
    label: 'Hírlevél-szösszenet',
    instruction:
      'Írj MAGYAR hírlevél-blokkot erről a hírről (kb. 4-6 mondat).\n' +
      '- Címsor + tömör kifejtés: mi változott, miért számít, mit tegyen az olvasó.',
  },
  general: {
    label: 'Általános (szabad)',
    instruction:
      'Foglald össze és dolgozd fel MAGYARUL ezt a hírt tartalomként a saját közönségemnek ' +
      '(PPC/hirdetés). A hangnem legyen szakmai, de közérthető. A végén adj 3 konkrét ' +
      'tartalom-ötletet, amit ebből készíthetnék.',
  },
};

function buildPrompt(item, formatKey) {
  const f = FORMATS[formatKey] || FORMATS.general;
  const info = (item.summary_hu && item.summary_hu.trim()) || item.snippet || '(nincs kivonat)';
  const why = item.why_hu ? `\nMiért fontos: ${item.why_hu}` : '';
  return (
    `Egy tapasztalt magyar PPC (fizetett hirdetési) szakértő vagy.\n\n` +
    `${f.instruction}\n\n` +
    `--- A FORRÁS-HÍR ---\n` +
    `Cím: ${item.title_hu || item.title}\n` +
    `Forrás: ${item.source}\n` +
    `Link: ${item.link}\n` +
    `Összefoglaló: ${info}${why}\n` +
    `--------------------\n\n` +
    `Írj magyarul, kész, közvetlenül felhasználható szöveget, felesleges bevezető nélkül.`
  );
}

// --- Betoltes es megjelenites -------------------------------------------------

let ITEMS = [];

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function dateOf(it) {
  return Date.parse(it.published || it.seen_at || '') || 0;
}

async function load() {
  try {
    const res = await fetch('data/items.json', { cache: 'no-store' });
    const raw = await res.json();
    ITEMS = Object.values(raw.items || {}).sort((a, b) => dateOf(b) - dateOf(a));
    const upd = raw.updated_at ? new Date(raw.updated_at).toLocaleString('hu-HU') : '—';
    document.getElementById('updated').textContent = 'Frissítve: ' + upd;
  } catch {
    ITEMS = [];
  }
  buildSourceFilter();
  render();
}

function buildSourceFilter() {
  const sel = document.getElementById('source');
  const sources = [...new Set(ITEMS.map((i) => i.source))].sort();
  for (const s of sources) {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    sel.appendChild(o);
  }
}

function filtered() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const src = document.getElementById('source').value;
  const days = Number(document.getElementById('period').value);
  const cutoff = days ? Date.now() - days * 86400000 : 0;
  return ITEMS.filter((i) => {
    // Csak a szakmailag ertekes hirek: az osszefoglalt, de gyenge relevanciaju (1-2) tetelt elrejtjuk.
    if (i.relevance && i.relevance < 3) return false;
    if (src && i.source !== src) return false;
    if (cutoff && dateOf(i) && dateOf(i) < cutoff) return false;
    if (q) {
      const hay = (i.title + ' ' + (i.title_hu || '') + ' ' + (i.summary_hu || '') + ' ' + (i.snippet || '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function optionList(selectedKey) {
  return Object.entries(FORMATS)
    .map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`)
    .join('');
}

function render() {
  const list = document.getElementById('list');
  const items = filtered();
  document.getElementById('count').textContent = items.length + ' hír';
  document.getElementById('empty').hidden = ITEMS.length > 0;

  list.innerHTML = items
    .map((i, idx) => {
      const d = dateOf(i) ? new Date(dateOf(i)).toLocaleDateString('hu-HU') : '';
      const rel = i.relevance ? ' · <span class="rel">' + '★'.repeat(i.relevance) + '</span>' : '';
      const info = (i.summary_hu && i.summary_hu.trim()) || i.snippet || '';
      const why = i.why_hu
        ? `<div class="small"><b>Miért fontos:</b> ${esc(i.why_hu)}</div>`
        : '';
      return `<div class="card" data-idx="${idx}">
        <div class="meta">${esc(i.source)} · ${esc(i.category || '')}${d ? ' · ' + d : ''}${rel}</div>
        <a class="title" href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.title_hu || i.title)}</a>
        ${info ? `<div class="body">${esc(info)}</div>` : ''}
        ${why}
        <div class="tools">
          <select class="fmt">${optionList()}</select>
          <button class="mk">Prompt készítése &amp; másolás</button>
          <button class="ghost cp" hidden>Másolás újra</button>
        </div>
        <div class="out"><textarea readonly></textarea></div>
      </div>`;
    })
    .join('');

  // Az idx a szurt listara mutat -> tegyuk el a szurt tombot a kattintasokhoz.
  list._items = items;
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = 'Kimásolva ✓';
    setTimeout(() => (btn.textContent = old), 1500);
  } catch {
    // ha a clipboard tiltott, legalabb jeloljuk ki
    btn.textContent = 'Jelöld ki és másold (Ctrl+C)';
  }
}

document.getElementById('list').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const item = document.getElementById('list')._items[Number(card.dataset.idx)];
  const out = card.querySelector('.out');
  const ta = card.querySelector('textarea');
  const cp = card.querySelector('.cp');

  if (e.target.classList.contains('mk')) {
    const fmt = card.querySelector('.fmt').value;
    ta.value = buildPrompt(item, fmt);
    out.classList.add('show');
    cp.hidden = false;
    copyText(ta.value, e.target);
  } else if (e.target.classList.contains('cp')) {
    copyText(ta.value, e.target);
  }
});

['search', 'source', 'period'].forEach((id) =>
  document.getElementById(id).addEventListener('input', render)
);

load();

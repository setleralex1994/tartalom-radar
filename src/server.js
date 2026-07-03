// Helyi tartalomgyar dashboard: a het cikkei + "gombnyomasra tartalom".
import 'dotenv/config';
import express from 'express';
import { itemsForWeek, allWeeks, getItem, saveContent } from './db.js';
import { generateContent } from './claude.js';
import { runRadar } from './radar.js';
import { isoWeek, escapeHtml } from './util.js';

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT || 4310);

function page(week, items, weeks) {
  const weekOptions = weeks
    .map((w) => `<option value="${w}"${w === week ? ' selected' : ''}>${w}</option>`)
    .join('');

  const cards = items.length
    ? items
        .map((i) => {
          const rel = '★'.repeat(Math.max(0, Math.min(5, i.relevance || 0)));
          return `<div class="card">
            <div class="meta">${escapeHtml(i.source)} · ${escapeHtml(
            i.category || ''
          )} · relevancia ${rel}</div>
            <a class="title" href="${escapeHtml(i.link)}" target="_blank" rel="noopener">${escapeHtml(
            i.title
          )}</a>
            <div class="sum">${escapeHtml(i.summary_hu || '')}</div>
            <div class="small"><b>Miért fontos:</b> ${escapeHtml(i.why_hu || '')}</div>
            <div class="small"><b>Teendő:</b> ${escapeHtml(i.action_hu || '')}</div>
            <div class="tools">
              <select id="fmt-${escapeHtml(i.guid)}">
                <option value="video">Videós forgatókönyv (DO!marketing)</option>
                <option value="linkedin">LinkedIn-poszt</option>
                <option value="newsletter">Hírlevél-szösszenet</option>
              </select>
              <button onclick="gen('${escapeHtml(i.guid)}')">Tartalmat készítek ebből</button>
            </div>
            <pre class="out" id="out-${escapeHtml(i.guid)}"></pre>
          </div>`;
        })
        .join('')
    : `<div class="empty">Ehhez a héthez még nincs feldolgozott cikk. Kattints a <b>Radar futtatása most</b> gombra.</div>`;

  return `<!doctype html><html lang="hu"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PPC hírek és tartalomgyár</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#faf8f4;color:#1a1a1a;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}
    header{background:#fff;border-bottom:3px solid #edbb5f;padding:16px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    header h1{font-size:18px;margin:0;flex:1}
    select,button{font-size:14px;padding:8px 10px;border-radius:8px;border:1px solid #ccc;background:#fff}
    button{background:#edbb5f;color:#1d263a;border-color:#edbb5f;cursor:pointer;font-weight:600}
    button:disabled{opacity:.6;cursor:default}
    .wrap{max-width:760px;margin:0 auto;padding:20px}
    .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:16px 18px;margin-bottom:16px}
    .meta{font-size:12px;color:#999}
    .title{display:block;font-size:17px;font-weight:600;margin:2px 0 8px;color:#1d263a;text-decoration:none}
    .sum{font-size:14px;line-height:1.5}
    .small{font-size:13px;color:#555;margin-top:4px}
    .tools{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}
    .out{white-space:pre-wrap;background:#f7f5f0;border:1px solid #eee;border-radius:8px;padding:12px;margin-top:12px;font-size:13px;line-height:1.5;display:none}
    .out.show{display:block}
    .empty{background:#fff;border:1px dashed #ccc;border-radius:12px;padding:24px;text-align:center;color:#777}
  </style></head><body>
  <header>
    <h1>PPC hírek és tartalomgyár</h1>
    <select id="week" onchange="location.href='/?week='+encodeURIComponent(this.value)">${weekOptions}</select>
    <button id="runbtn" onclick="runRadar()">Radar futtatása most</button>
    <a href="https://www.setleralex.hu" target="_blank" rel="noopener" style="margin-left:auto;color:#cf9a34;font-weight:600;text-decoration:none">setleralex.hu</a>
  </header>
  <div class="wrap">${cards}</div>
  <script>
    async function gen(guid){
      var sel=document.getElementById('fmt-'+guid);
      var box=document.getElementById('out-'+guid);
      box.classList.add('show'); box.textContent='Generálás... (ez 10-30 mp is lehet)';
      try{
        var r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guid:guid,format:sel.value})});
        var j=await r.json();
        box.textContent=j.body||('Hiba: '+(j.error||'ismeretlen'));
      }catch(e){ box.textContent='Hiba: '+e.message; }
    }
    async function runRadar(){
      var b=document.getElementById('runbtn'); b.disabled=true; b.textContent='Fut... (ez percekig tarthat)';
      try{
        var r=await fetch('/api/run?send=0',{method:'POST'});
        var j=await r.json();
        location.href='/?week='+encodeURIComponent(j.week);
      }catch(e){ b.disabled=false; b.textContent='Radar futtatása most'; alert('Hiba: '+e.message); }
    }
  </script>
  </body></html>`;
}

app.get('/', (req, res) => {
  const weeks = allWeeks();
  const week = req.query.week || weeks[0] || isoWeek();
  res.send(page(week, itemsForWeek(week), weeks.length ? weeks : [week]));
});

app.post('/api/generate', async (req, res) => {
  try {
    const { guid, format } = req.body || {};
    const item = getItem(guid);
    if (!item) return res.status(404).json({ error: 'ismeretlen cikk' });
    const body = await generateContent(item, format);
    saveContent(guid, format, body);
    res.json({ body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/run', async (req, res) => {
  try {
    const send = req.query.send === '1';
    const result = await runRadar({ send });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`PPC hírek és tartalomgyár dashboard: http://localhost:${PORT}`);
});

// Heti HTML e-mail osszeallitasa es kikuldese.
import nodemailer from 'nodemailer';
import { escapeHtml } from './util.js';

export function buildHtml(items, trends, week) {
  const trendBlock = trends
    ? `<div style="background:#f4f1ea;border:1px solid #e5ddc8;border-radius:10px;padding:16px 18px;margin:0 0 24px">
         <h2 style="margin:0 0 8px;font-size:16px;color:#7a4a24">A hét témái &amp; tartalomötletek</h2>
         <div style="white-space:pre-wrap;font-size:14px;line-height:1.55;color:#333">${escapeHtml(trends)}</div>
       </div>`
    : '';

  const rows = items
    .map((i) => {
      const rel = '★'.repeat(Math.max(0, Math.min(5, i.relevance || 0)));
      return `<tr><td style="padding:14px 0;border-bottom:1px solid #eee">
        <div style="font-size:12px;color:#999">${escapeHtml(i.source)} · ${escapeHtml(
        i.category || ''
      )} · relevancia ${rel}</div>
        <div style="font-size:16px;font-weight:600;margin:2px 0 6px">
          <a href="${escapeHtml(i.link)}" style="color:#1a1a1a;text-decoration:none">${escapeHtml(
        i.title
      )}</a>
        </div>
        <div style="font-size:14px;line-height:1.5;color:#333">${escapeHtml(i.summary_hu || '')}</div>
        <div style="font-size:13px;color:#555;margin-top:4px"><b>Miért fontos:</b> ${escapeHtml(
          i.why_hu || ''
        )}</div>
        <div style="font-size:13px;color:#555"><b>Teendő:</b> ${escapeHtml(i.action_hu || '')}</div>
      </td></tr>`;
    })
    .join('');

  return `<!doctype html><html><body style="margin:0;background:#fafafa;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 4px">PPC Tartalom Radar</h1>
      <div style="color:#888;font-size:13px;margin-bottom:20px">${escapeHtml(week)} · ${
    items.length
  } releváns hír</div>
      ${trendBlock}
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <div style="color:#aaa;font-size:12px;margin-top:24px">Automatikus összefoglaló · PPC Radar &amp; Tartalomgyár</div>
    </div>
  </body></html>`;
}

// Ugyanaz a kuldesi mod, mint a Kampany-figyelonel: Gmail + app-jelszo.
export function transport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: (process.env.GMAIL_USER || '').trim(),
      pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
    },
  });
}

export async function sendDigest(html, week) {
  const user = (process.env.GMAIL_USER || '').trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  // Alapertelmezetten a sajat Gmail-cimre megy (privat), nem az SOS cimre.
  const to = (process.env.DIGEST_TO || user).trim();
  if (!user || !pass) {
    console.warn('GMAIL_USER / GMAIL_APP_PASSWORD nincs beallitva — e-mail kihagyva (az archivum elkeszult).');
    return false;
  }
  await transport().sendMail({
    from: `"PPC Radar & Tartalomgyar" <${user}>`,
    to,
    subject: `PPC Tartalom Radar — ${week}`,
    html,
  });
  return true;
}

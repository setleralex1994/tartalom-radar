// Forrasok lehuzasa: RSS elsodlegesen, cheerio-scrape tartalek a botokat blokkolo oldalakra.
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': UA,
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeRss(it, source) {
  return {
    guid: it.guid || it.link || `${source.name}:${it.title}`,
    source: source.name,
    lang: source.lang,
    category: source.category,
    title: (it.title || '').trim(),
    link: it.link || '',
    published: toDate(it.isoDate || it.pubDate),
    snippet: (it.contentSnippet || it.summary || '').trim().slice(0, 600),
  };
}

function absolute(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

async function fetchScrape(source) {
  const res = await fetch(source.url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const seen = new Set();
  const items = [];
  $(source.selector || 'article a').each((_, el) => {
    const a = $(el);
    const href = a.attr('href');
    const title = a.text().trim().replace(/\s+/g, ' ');
    if (!href || title.length < 18) return;
    const link = absolute(href, source.url);
    if (seen.has(link)) return;
    seen.add(link);
    items.push({
      guid: link,
      source: source.name,
      lang: source.lang,
      category: source.category,
      title,
      link,
      published: null, // scrape-nel gyakran nincs megbizhato datum -> a radar atengedi
      snippet: '',
    });
  });
  return items.slice(0, 25);
}

export async function fetchSource(source) {
  if (source.type === 'scrape') return fetchScrape(source);
  const feed = await parser.parseURL(source.url);
  return (feed.items || []).map((it) => normalizeRss(it, source));
}

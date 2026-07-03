// Claude (Anthropic) integracio: osszefoglalo, trend-szintezis, tartalomgeneralas.
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  SUMMARY_SYSTEM,
  SUMMARY_SCHEMA,
  buildSummaryUser,
  TREND_SYSTEM,
  buildTrendUser,
  CONTENT_SYSTEM,
  buildContentUser,
} from './prompts.js';

const SUMMARY_MODEL = process.env.CLAUDE_SUMMARY_MODEL || 'claude-opus-4-8';
const CONTENT_MODEL = process.env.CLAUDE_CONTENT_MODEL || 'claude-opus-4-8';

// Lusta inicializalas: kulcs nelkul is importalhato a modul (a gyujto/online resz nem hasznalja).
let _client;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

function textOf(res) {
  return res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

// Egy cikk kiertekelese + magyar osszefoglalo, strukturalt JSON kimenettel.
export async function summarizeItem(item) {
  const res = await client().messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 1200,
    system: SUMMARY_SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SUMMARY_SCHEMA } },
    messages: [{ role: 'user', content: buildSummaryUser(item) }],
  });
  return JSON.parse(textOf(res) || '{}');
}

// A het temainak/trendjeinek kiemelese + tartalomotletek (szabad szoveg).
export async function synthesizeTrends(items) {
  const res = await client().messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 1500,
    system: TREND_SYSTEM,
    messages: [{ role: 'user', content: buildTrendUser(items) }],
  });
  return textOf(res).trim();
}

// "Gombnyomasra tartalom": DO!marketing forgatokonyv / LinkedIn / hirlevel.
export async function generateContent(item, format) {
  const res = await client().messages.create({
    model: CONTENT_MODEL,
    max_tokens: 6000,
    thinking: { type: 'adaptive' }, // kreativ, tobblepéses feladat -> adaptiv gondolkodas
    system: CONTENT_SYSTEM,
    messages: [{ role: 'user', content: buildContentUser(item, format) }],
  });
  return textOf(res).trim();
}

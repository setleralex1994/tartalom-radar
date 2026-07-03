// PPC-relevancia szuro. Kulcs nelkul is mukodik (a gyujtes soran fut le), hogy
// KIZAROLAG a PPC/fizetett hirdetes temaju hirek keruljenek be — SEO, WordPress,
// weboldalkeszites, altalanos marketing NEM.

const PPC = [
  'ppc', 'pay-per-click', 'pay per click', 'google ads', 'adwords', 'meta ads',
  'facebook ads', 'instagram ads', 'tiktok ads', 'microsoft ads', 'bing ads',
  'linkedin ads', 'amazon ads', 'paid search', 'paid social', 'paid media',
  'performance max', 'pmax', 'shopping ads', 'demand gen', 'display ads',
  'search ads', 'smart bidding', 'bid strategy', 'bidding', 'cpc', 'cpa', 'cpm',
  'roas', 'tcpa', 'conversion tracking', 'remarketing', 'retargeting',
  'ad campaign', 'ad group', 'ad copy', 'ad creative', 'quality score',
  'negative keyword', 'merchant center', 'hirdetés', 'kampány', 'konverzió',
  'licit', 'ajánlattétel',
];

const EXCLUDE = [
  'seo', 'organic search', 'organic traffic', 'backlink', 'link building',
  'search engine optimization', 'wordpress', 'woocommerce', 'elementor',
  ' plugin', 'website design', 'web design', 'webdesign', 'weboldalkész',
  'honlapkész', 'weboldal kész', 'honlap kész',
];

// curated = a forras eleve PPC-fokuszu (pl. SEL PPC rovat) -> csak a nyilvanvaloan
// nem-PPC (SEO/WP) tetelt dobjuk. Nem curated forrasnal PPC-kulcsszo kell.
export function isPPCRelevant(item, curated) {
  const t = ((item.title || '') + ' ' + (item.snippet || '')).toLowerCase();
  const hasPPC = PPC.some((k) => t.includes(k));
  const hasExc = EXCLUDE.some((k) => t.includes(k));
  if (hasExc && !hasPPC) return false;
  if (curated) return true;
  return hasPPC;
}

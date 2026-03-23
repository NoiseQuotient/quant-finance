/**
 * QuantFrontier — Feed Fetcher
 * Pulls from tier-1 financial news & research sources.
 * Runs server-side every 30 min, outputs data.json.
 */
import { XMLParser } from 'fast-xml-parser';
import { writeFileSync } from 'fs';

// ─────────────────────────────────────────────────────────────
//  SOURCES — only confirmed, high-quality, publicly accessible
// ─────────────────────────────────────────────────────────────
const FEEDS = [

  // ── FINANCIAL NEWS (Tier 1) ────────────────────────────────
  {
    url:   'https://www.ft.com/rss/home',
    type:  'news', label: 'Financial Times', tags: ['FT','markets','premium'],
  },
  {
    url:   'https://www.economist.com/finance-and-economics/rss.xml',
    type:  'news', label: 'The Economist', tags: ['macro','economics','premium'],
  },
  {
    url:   'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    type:  'news', label: 'Wall Street Journal', tags: ['WSJ','markets','premium'],
  },
  {
    url:   'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml',
    type:  'news', label: 'Wall Street Journal', tags: ['WSJ','business','premium'],
  },
  {
    url:   'https://feeds.bloomberg.com/markets/news.rss',
    type:  'news', label: 'Bloomberg Markets', tags: ['Bloomberg','markets','premium'],
  },
  {
    url:   'https://feeds.bloomberg.com/politics/news.rss',
    type:  'news', label: 'Bloomberg Politics', tags: ['Bloomberg','politics','premium'],
  },

  // ── FINANCIAL NEWS (Tier 2) ────────────────────────────────
  {
    url:   'https://www.cnbc.com/id/10001147/device/rss/rss.html',
    type:  'news', label: 'CNBC Finance', tags: ['CNBC','finance'],
  },
  {
    url:   'https://www.cnbc.com/id/15839135/device/rss/rss.html',
    type:  'news', label: 'CNBC Markets', tags: ['CNBC','markets'],
  },
  {
    url:   'https://feeds.marketwatch.com/marketwatch/topstories/',
    type:  'news', label: 'MarketWatch', tags: ['markets'],
  },
  {
    url:   'https://seekingalpha.com/feed.xml',
    type:  'analysis', label: 'Seeking Alpha', tags: ['analysis','equities'],
  },

  // ── RESEARCH PAPERS ─────────────────────────────────────────
  {
    // arXiv search API — returns recent q-fin papers any day of the week
    url:   'https://export.arxiv.org/api/query?search_query=cat:q-fin.PM+OR+cat:q-fin.TR+OR+cat:q-fin.RM+OR+cat:q-fin.CP+OR+cat:q-fin.MF&start=0&max_results=30&sortBy=lastUpdatedDate&sortOrder=descending',
    type:  'research', label: 'arXiv q-fin', tags: ['paper','research','quant'], atom: true,
  },
  {
    url:   'https://export.arxiv.org/api/query?search_query=cat:cs.LG+AND+%28ti:portfolio+OR+ti:trading+OR+ti:finance+OR+ti:risk+OR+ti:market%29&start=0&max_results=20&sortBy=lastUpdatedDate&sortOrder=descending',
    type:  'research', label: 'arXiv ML×Finance', tags: ['ML','paper','research','AI'], atom: true,
  },
  {
    // BIS Working Papers (Bank for International Settlements) — uses RDF/RSS 1.0
    url:   'https://www.bis.org/doclist/wppubls.rss',
    type:  'research', label: 'BIS Working Papers', tags: ['paper','macro','policy','central bank'], rdf: true,
  },
  {
    // Federal Reserve FEDS Notes & Working Papers
    url:   'https://www.federalreserve.gov/feeds/feds.xml',
    type:  'research', label: 'Federal Reserve', tags: ['paper','policy','macro','central bank'],
  },
  {
    // CEPR — Centre for Economic Policy Research
    url:   'https://cepr.org/rss.xml',
    type:  'research', label: 'CEPR', tags: ['paper','economics','policy'],
  },
];

// ─────────────────────────────────────────────────────────────
const parser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  processEntities:     false,   // avoid entity expansion limit
  htmlEntities:        true,
});

function stripHtml(s = '') {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/&#8211;/g,'\u2013').replace(/&#8212;/g,'\u2014')
    .replace(/&#8216;/g,'\u2018').replace(/&#8217;/g,'\u2019')
    .replace(/&#8220;/g,'\u201c').replace(/&#8221;/g,'\u201d')
    .replace(/&#\d+;/g, ' ')
    .trim();
}

function str(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v['#text']) return String(v['#text']);
  if (Array.isArray(v)) return String(v[0] || '');
  return String(v);
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; QuantFrontier/2.0; +https://noisequotient.github.io/quant-finance)',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
    signal:   AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml);

  let items = [];

  if (feed.atom) {
    // Atom feed (arXiv API)
    const entries = doc?.feed?.entry || [];
    const arr = Array.isArray(entries) ? entries : [entries];
    items = arr.map(e => ({
      title: stripHtml(str(e.title)),
      link:  str(e.id) || (Array.isArray(e.link) ? str(e.link[0]?.['@_href']) : str(e.link?.['@_href'])),
      desc:  stripHtml(str(e.summary)).slice(0, 300),
      date:  new Date(str(e.updated) || str(e.published) || Date.now()).toISOString(),
    }));

  } else if (feed.rdf) {
    // RSS 1.0 / RDF (BIS)
    const ns = doc?.['rdf:RDF'] || doc?.RDF || doc;
    const rawItems = ns?.item || [];
    const arr = Array.isArray(rawItems) ? rawItems : [rawItems];
    items = arr.map(i => ({
      title: stripHtml(str(i.title)),
      link:  str(i.link) || str(i['@_rdf:about']),
      desc:  stripHtml(str(i.description)).slice(0, 300),
      date:  new Date(str(i['dc:date']) || str(i.pubDate) || Date.now()).toISOString(),
    }));

  } else {
    // Standard RSS 2.0
    const channel = doc?.rss?.channel || {};
    const rawItems = channel.item || [];
    const arr = Array.isArray(rawItems) ? rawItems : [rawItems];
    items = arr.map(i => ({
      title: stripHtml(str(i.title)),
      link:  str(i.link) || str(i.guid?.['#text']) || str(i.guid),
      desc:  stripHtml(str(i.description) || str(i['content:encoded'])).slice(0, 300),
      date:  new Date(str(i.pubDate) || str(i.updated) || Date.now()).toISOString(),
    }));
  }

  return items
    .filter(i => i.title && i.title.length > 6 && i.link)
    .slice(0, 25)
    .map(i => ({ ...i, type: feed.type, label: feed.label, tags: feed.tags }));
}

// ─────────────────────────────────────────────────────────────
console.log(`\n⚡ QuantFrontier Feed Refresh — ${new Date().toUTCString()}\n`);

const results = await Promise.allSettled(FEEDS.map(async feed => {
  try {
    const items = await fetchFeed(feed);
    console.log(`  ✓ ${feed.label.padEnd(24)} ${items.length} items`);
    return items;
  } catch(e) {
    console.log(`  ✗ ${feed.label.padEnd(24)} ${e.message}`);
    return [];
  }
}));

const failed = FEEDS
  .filter((_,i) => results[i].status === 'rejected' || (results[i].value?.length === 0))
  .map(f => f.label);

let items = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

// Deduplicate by title
const seen = new Set();
items = items
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .filter(i => {
    const k = i.title.toLowerCase().slice(0, 70);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

const output = {
  updated: new Date().toISOString(),
  count:   items.length,
  failed,
  items,
};

writeFileSync('data.json', JSON.stringify(output, null, 2));
console.log(`\n✓ ${items.length} articles saved to data.json`);
if (failed.length) console.log(`  Gaps: ${failed.join(', ')}`);

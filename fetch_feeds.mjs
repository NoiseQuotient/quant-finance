import { XMLParser } from 'fast-xml-parser';
import { writeFileSync } from 'fs';

const FEEDS = [
  // arXiv — redirects to export.arxiv.org, empty on weekends (expected)
  { url:'https://export.arxiv.org/rss/q-fin',      type:'arxiv',  label:'arXiv q-fin',       tags:['research','paper'] },
  { url:'https://export.arxiv.org/rss/q-fin.PM',   type:'arxiv',  label:'arXiv Portfolio',   tags:['portfolio','paper'] },
  { url:'https://export.arxiv.org/rss/q-fin.TR',   type:'arxiv',  label:'arXiv Trading',     tags:['trading','paper'] },
  { url:'https://export.arxiv.org/rss/q-fin.RM',   type:'arxiv',  label:'arXiv Risk',        tags:['risk','paper'] },
  { url:'https://export.arxiv.org/rss/q-fin.CP',   type:'arxiv',  label:'arXiv Pricing',     tags:['derivatives','paper'] },
  { url:'https://export.arxiv.org/rss/cs.LG',      type:'arxiv',  label:'arXiv ML',          tags:['ML','paper'] },
  // Blogs
  { url:'https://quantocracy.com/feed/',               type:'blog', label:'Quantocracy',        tags:['curated','blog'] },
  { url:'https://robotwealth.com/feed/',               type:'blog', label:'Robot Wealth',       tags:['strategy','blog'] },
  { url:'https://alphaarchitect.com/feed/',            type:'blog', label:'Alpha Architect',    tags:['factor','blog'] },
  { url:'https://blog.thinknewfound.com/feed/',        type:'blog', label:'Newfound Research',  tags:['portfolio','blog'] },
  { url:'https://www.portfolioprobe.com/feed/',        type:'blog', label:'Portfolio Probe',    tags:['portfolio','blog'] },
  { url:'https://blog.headlandstech.com/feed/',        type:'blog', label:'Headlands Tech',     tags:['HFT','blog'] },
  { url:'https://feeds.feedburner.com/AllAboutAlpha',  type:'blog', label:'All About Alpha',    tags:['hedge fund','blog'] },
  { url:'https://www.eurekahedge.com/Research/RSS',    type:'blog', label:'Eurekahedge',        tags:['hedge fund','research'] },
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim();
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: {
        'User-Agent': 'QuantFrontier/1.0 (feed aggregator; research tool)',
        'Accept': feed.json ? 'application/json' : 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Reddit JSON API
    if (feed.json) {
      const data = await res.json();
      const posts = data?.data?.children || [];
      return posts.slice(0,25).map(p => {
        const d = p.data;
        return {
          title: d.title || '',
          link:  `https://reddit.com${d.permalink}`,
          desc:  (d.selftext || '').slice(0,280),
          date:  new Date(d.created_utc * 1000).toISOString(),
          type:  feed.type, label: feed.label, tags: feed.tags,
        };
      }).filter(i => i.title && i.title.length > 4);
    }

    // XML / RSS
    const xml = await res.text();
    const doc = parser.parse(xml);
    const channel = doc?.rss?.channel || doc?.feed || {};
    const rawItems = channel.item || channel.entry || [];
    const items = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);

    return items.slice(0, 20).map(item => {
      const title = stripHtml(String(item.title?.['#text'] || item.title || '')).trim();
      const link  = item.link?.['@_href'] || (typeof item.link === 'string' ? item.link : '') || item.guid?.['#text'] || String(item.guid||'');
      const desc  = stripHtml(String(item.description || item.summary?.['#text'] || item.summary || item['content:encoded'] || '')).slice(0, 280);
      const raw   = item.pubDate || item.published || item.updated || '';
      const date  = raw ? new Date(String(raw)).toISOString() : new Date().toISOString();
      return { title, link: typeof link === 'string' ? link : '', desc, date, type: feed.type, label: feed.label, tags: feed.tags };
    }).filter(i => i.title && i.title.length > 4);

  } catch(e) {
    console.error(`✗ ${feed.label}: ${e.message}`);
    return null;
  }
}

console.log('Fetching feeds...\n');
const results = await Promise.allSettled(FEEDS.map(fetchFeed));

const failed = [];
let items = [];
results.forEach((r, i) => {
  if (r.status === 'fulfilled' && r.value !== null) {
    console.log(`✓ ${FEEDS[i].label}: ${r.value.length} items`);
    items.push(...r.value);
  } else {
    console.log(`✗ ${FEEDS[i].label}: failed`);
    failed.push(FEEDS[i].label);
  }
});

// Deduplicate
const seen = new Set();
items = items
  .sort((a,b) => new Date(b.date) - new Date(a.date))
  .filter(i => {
    const k = i.title.toLowerCase().slice(0,60);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

const output = {
  updated: new Date().toISOString(),
  count: items.length,
  failed,
  items,
};

writeFileSync('data.json', JSON.stringify(output, null, 2));
console.log(`\n✓ Saved ${items.length} items to data.json`);
if (failed.length) console.log(`✗ Failed: ${failed.join(', ')}`);

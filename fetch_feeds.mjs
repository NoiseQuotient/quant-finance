/**
 * SECURE Quant Finance Feed Fetcher
 * ONLY uses the specified secure resources
 */

import { XMLParser } from 'fast-xml-parser';
import { writeFileSync } from 'fs';

// ========== SECURE QUANT FINANCE SOURCES ONLY ==========
const feeds = [
  // 1. ACADEMIC RESEARCH & PRE-PRINTS
  {
    url: 'https://export.arxiv.org/api/query?search_query=cat:q-fin.*&sortBy=lastUpdatedDate&sortOrder=descending&max_results=15',
    label: 'arXiv q-fin',
    type: 'research',
    tags: ['academic', 'preprint', 'quant']
  },
  {
    url: 'https://papers.ssrn.com/sol3/DisplayAbstractSearch.cfm?q=quantitative%20finance&sort=date',
    label: 'SSRN Quant Finance',
    type: 'research',
    tags: ['academic', 'working-paper', 'quant']
  },
  
  // 2. HIGH-IMPACT ACADEMIC JOURNALS
  {
    url: 'https://www.cambridge.org/core/rss/journals/journal-of-financial-and-quantitative-analysis',
    label: 'Journal of Financial and Quantitative Analysis',
    type: 'research',
    tags: ['journal', 'peer-reviewed', 'quant']
  },
  {
    url: 'https://www.tandfonline.com/feed/rquf20',
    label: 'Quantitative Finance Journal',
    type: 'research',
    tags: ['journal', 'peer-reviewed', 'quant']
  },
  {
    url: 'https://onlinelibrary.wiley.com/feed/15406261/most-recent',
    label: 'The Journal of Finance',
    type: 'research',
    tags: ['journal', 'peer-reviewed', 'finance']
  },
  {
    url: 'https://www.bis.org/rss/rss_publ_working_papers.rss',
    label: 'BIS Working Papers',
    type: 'research',
    tags: ['central-bank', 'policy', 'research']
  },
  {
    url: 'https://www.federalreserve.gov/feeds/working_papers.xml',
    label: 'Federal Reserve Papers',
    type: 'research',
    tags: ['central-bank', 'policy', 'research']
  },
  {
    url: 'https://cepr.org/rss/publications/discussion-papers',
    label: 'CEPR Discussion Papers',
    type: 'research',
    tags: ['economics', 'policy', 'research']
  },
  
  // 3. INDUSTRY NEWS & PRACTITIONER INSIGHTS
  {
    url: 'https://www.risk.net/feed',
    label: 'Risk.net',
    type: 'news',
    tags: ['industry', 'professional', 'risk-management'],
    isPaywalled: true
  },
  {
    url: 'https://wilmott.com/feed/',
    label: 'Wilmott',
    type: 'news',
    tags: ['industry', 'technical', 'quant-community']
  },
  {
    url: 'https://www.bloomberg.com/markets/rss',
    label: 'Bloomberg Quant News',
    type: 'news',
    tags: ['markets', 'trading', 'quant'],
    isPaywalled: true
  },
  {
    url: 'https://www.ft.com/?format=rss',
    label: 'Financial Times Quant',
    type: 'news',
    tags: ['markets', 'finance', 'quant'],
    isPaywalled: true
  },
  {
    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    label: 'Wall Street Journal Markets',
    type: 'news',
    tags: ['markets', 'finance', 'quant'],
    isPaywalled: true
  },
  {
    url: 'https://www.economist.com/finance-and-economics/rss.xml',
    label: 'The Economist Finance',
    type: 'news',
    tags: ['economics', 'markets', 'finance'],
    isPaywalled: true
  },
  
  // 4. SPECIALIZED SEMINARS & COMMUNITY HUBS
  {
    url: 'https://www.fields.utoronto.ca/activities/quantitative-finance-seminars/rss',
    label: 'Fields Institute Seminars',
    type: 'research',
    tags: ['seminars', 'academic', 'quant']
  },
  {
    url: 'https://www.quantstart.com/feed/',
    label: 'QuantStart',
    type: 'analysis',
    tags: ['tutorials', 'coding', 'quant']
  },
  {
    url: 'https://www.alphagamma.eu/feed/',
    label: 'AlphaGamma',
    type: 'analysis',
    tags: ['community', 'young-professionals', 'finance']
  },
  
  // 5. DATA & CODING
  {
    url: 'https://www.quantconnect.com/forum/rss',
    label: 'QuantConnect Forum',
    type: 'analysis',
    tags: ['coding', 'platform', 'community']
  },
  {
    url: 'https://www.kaggle.com/datasets.rss?search=finance',
    label: 'Kaggle Finance Datasets',
    type: 'research',
    tags: ['data', 'datasets', 'machine-learning']
  }
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  processEntities: false,
  htmlEntities: true,
});

function stripHtml(text = '') {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function str(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value['#text']) return String(value['#text']);
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value);
}

async function fetchFeed(feed) {
  try {
    console.log(`  Fetching ${feed.label}...`);
    
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuantFrontier/SECURE; +https://noisequotient.github.io/quant-finance)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      console.log(`    ❌ HTTP ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const doc = parser.parse(xml);
    
    let items = [];
    
    // Handle arXiv
    if (feed.url.includes('arxiv.org')) {
      const entries = doc?.feed?.entry || [];
      const arr = Array.isArray(entries) ? entries : [entries];
      items = arr.map(entry => ({
        title: stripHtml(str(entry.title)),
        link: str(entry.id) || (Array.isArray(entry.link) ? str(entry.link[0]?.['@_href']) : str(entry.link?.['@_href'])),
        desc: stripHtml(str(entry.summary)).slice(0, 400),
        date: new Date(str(entry.updated) || str(entry.published) || Date.now()).toISOString(),
        label: feed.label,
        type: feed.type,
        tags: [...(feed.tags || []), ...(feed.isPaywalled ? ['premium'] : [])],
        isPaywalled: feed.isPaywalled || false
      }));
    } else {
      // RSS/Atom feeds
      const rawItems = doc.rss?.channel?.item || doc.feed?.entry || [];
      const arr = Array.isArray(rawItems) ? rawItems : [rawItems];
      
      items = arr.map(item => ({
        title: stripHtml(str(item.title || item['title'])),
        link: str(item.link || item['link'] || item['@_href'] || item.id),
        desc: stripHtml(str(item.description || item.summary || item.content)).slice(0, 400),
        date: new Date(str(item.pubDate || item.published || item.updated || item['dc:date'] || Date.now())).toISOString(),
        label: feed.label,
        type: feed.type,
        tags: [...(feed.tags || []), ...(feed.isPaywalled ? ['premium'] : [])],
        isPaywalled: feed.isPaywalled || false
      }));
    }
    
    // Apply STRICT quant filtering for news sources
    if (feed.type === 'news') {
      const quantKeywords = [
        'quant', 'quantitative', 'algorithm', 'algorithmic', 'trading',
        'hedge fund', 'HFT', 'high frequency', 'market making',
        'risk', 'volatility', 'derivative', 'option', 'portfolio',
        'machine learning', 'AI', 'systematic', 'statistical', 'backtest'
      ];
      
      items = items.filter(item => {
        const text = (item.title + ' ' + item.desc).toLowerCase();
        return quantKeywords.some(keyword => text.includes(keyword));
      });
    }
    
    // Limit items
    items = items.slice(0, 10);
    
    console.log(`    ✓ ${items.length} items`);
    return items;
    
  } catch (error) {
    console.log(`    ❌ Error: ${error.message}`);
    return [];
  }
}

async function fetchAllFeeds() {
  console.log('📚 Fetching SECURE quant finance sources only...');
  
  const allItems = [];
  const failed = [];
  
  for (const feed of feeds) {
    try {
      const items = await fetchFeed(feed);
      allItems.push(...items);
    } catch (error) {
      failed.push({ label: feed.label, error: error.message });
    }
  }
  
  // Sort by date
  allItems.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Create data structure
  const data = {
    updated: new Date().toISOString(),
    count: allItems.length,
    failed: failed,
    items: allItems
  };
  
  // Save
  writeFileSync('./data.json', JSON.stringify(data, null, 2));
  
  console.log(`\n✅ SECURE feeds fetched!`);
  console.log(`   Total articles: ${allItems.length}`);
  console.log(`   Failed: ${failed.length}`);
  
  // Breakdown
  const byType = {};
  allItems.forEach(item => {
    byType[item.type] = (byType[item.type] || 0) + 1;
  });
  
  console.log(`\n📊 Breakdown:`);
  for (const [type, count] of Object.entries(byType)) {
    console.log(`   ${type}: ${count}`);
  }
  
  const premium = allItems.filter(item => item.isPaywalled).length;
  console.log(`   Premium (paywalled): ${premium}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAllFeeds().catch(console.error);
}

export { fetchAllFeeds };
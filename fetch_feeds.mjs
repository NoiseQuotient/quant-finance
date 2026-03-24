/**
 * Quant Frontier Feed Fetcher
 * Comprehensive quant finance sources as specified
 */

import { XMLParser } from 'fast-xml-parser';
import { writeFileSync } from 'fs';

// ========== COMPREHENSIVE QUANT FINANCE SOURCES ==========
const feeds = [
  // 1. ACADEMIC RESEARCH & PRE-PRINTS
  {
    url: 'https://export.arxiv.org/api/query?search_query=cat:q-fin.*&sortBy=lastUpdatedDate&sortOrder=descending&max_results=20',
    label: 'arXiv q-fin',
    type: 'research',
    tags: ['academic', 'preprint', 'quant'],
    priority: 1
  },
  {
    url: 'https://papers.ssrn.com/sol3/DisplayAbstractSearch.cfm?q=quantitative%20finance&sort=date',
    label: 'SSRN Quant Finance',
    type: 'research',
    tags: ['academic', 'working-paper', 'quant'],
    priority: 1
  },
  
  // 2. HIGH-IMPACT ACADEMIC JOURNALS
  {
    url: 'https://www.cambridge.org/core/rss/journals/journal-of-financial-and-quantitative-analysis',
    label: 'Journal of Financial and Quantitative Analysis',
    type: 'research',
    tags: ['journal', 'peer-reviewed', 'quant'],
    priority: 1
  },
  {
    url: 'https://www.tandfonline.com/feed/rquf20',
    label: 'Quantitative Finance Journal',
    type: 'research',
    tags: ['journal', 'peer-reviewed', 'quant'],
    priority: 1
  },
  {
    url: 'https://onlinelibrary.wiley.com/feed/15406261/most-recent',
    label: 'The Journal of Finance',
    type: 'research',
    tags: ['journal', 'peer-reviewed', 'finance'],
    priority: 1
  },
  {
    url: 'https://www.bis.org/rss/rss_publ_working_papers.rss',
    label: 'BIS Working Papers',
    type: 'research',
    tags: ['central-bank', 'policy', 'research'],
    priority: 1
  },
  {
    url: 'https://www.federalreserve.gov/feeds/working_papers.xml',
    label: 'Federal Reserve Papers',
    type: 'research',
    tags: ['central-bank', 'policy', 'research'],
    priority: 1
  },
  {
    url: 'https://cepr.org/rss/publications/discussion-papers',
    label: 'CEPR Discussion Papers',
    type: 'research',
    tags: ['economics', 'policy', 'research'],
    priority: 1
  },
  
  // 3. INDUSTRY NEWS & PRACTITIONER INSIGHTS
  {
    url: 'https://www.risk.net/feed',
    label: 'Risk.net',
    type: 'news',
    tags: ['industry', 'professional', 'risk-management'],
    priority: 2,
    isPaywalled: true
  },
  {
    url: 'https://wilmott.com/feed/',
    label: 'Wilmott',
    type: 'news',
    tags: ['industry', 'technical', 'quant-community'],
    priority: 2
  },
  {
    url: 'https://www.bloomberg.com/markets/rss',
    label: 'Bloomberg Quant News',
    type: 'news',
    tags: ['markets', 'trading', 'quant'],
    priority: 2,
    isPaywalled: true
  },
  {
    url: 'https://www.ft.com/?format=rss',
    label: 'Financial Times Quant',
    type: 'news',
    tags: ['markets', 'finance', 'quant'],
    priority: 2,
    isPaywalled: true
  },
  {
    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    label: 'Wall Street Journal Markets',
    type: 'news',
    tags: ['markets', 'finance', 'quant'],
    priority: 2,
    isPaywalled: true
  },
  {
    url: 'https://www.economist.com/finance-and-economics/rss.xml',
    label: 'The Economist Finance',
    type: 'news',
    tags: ['economics', 'markets', 'finance'],
    priority: 2,
    isPaywalled: true
  },
  
  // 4. SPECIALIZED SEMINARS & COMMUNITY HUBS
  {
    url: 'https://www.fields.utoronto.ca/activities/quantitative-finance-seminars/rss',
    label: 'Fields Institute Seminars',
    type: 'research',
    tags: ['seminars', 'academic', 'quant'],
    priority: 3
  },
  {
    url: 'https://www.quantstart.com/feed/',
    label: 'QuantStart',
    type: 'analysis',
    tags: ['tutorials', 'coding', 'quant'],
    priority: 3
  },
  {
    url: 'https://www.alphagamma.eu/feed/',
    label: 'AlphaGamma',
    type: 'analysis',
    tags: ['community', 'young-professionals', 'finance'],
    priority: 3
  },
  {
    url: 'https://quantocracy.com/feed/',
    label: 'Quantocracy',
    type: 'analysis',
    tags: ['quant-blog', 'strategies', 'community'],
    priority: 3
  },
  {
    url: 'https://robotwealth.com/feed/',
    label: 'Robot Wealth',
    type: 'analysis',
    tags: ['quant-blog', 'trading', 'strategies'],
    priority: 3
  },
  {
    url: 'https://alphaarchitect.com/feed/',
    label: 'Alpha Architect',
    type: 'analysis',
    tags: ['investment', 'research', 'quant'],
    priority: 3
  },
  
  // 5. DATA & CODING (BONUS)
  {
    url: 'https://www.quantconnect.com/forum/rss',
    label: 'QuantConnect Forum',
    type: 'analysis',
    tags: ['coding', 'platform', 'community'],
    priority: 4
  },
  {
    url: 'https://www.kaggle.com/datasets.rss?search=finance',
    label: 'Kaggle Finance Datasets',
    type: 'research',
    tags: ['data', 'datasets', 'machine-learning'],
    priority: 4
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
        'User-Agent': 'Mozilla/5.0 (compatible; QuantFrontier/3.0; +https://noisequotient.github.io/quant-finance)',
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
    
    // Handle different feed formats
    if (feed.url.includes('arxiv.org')) {
      // arXiv Atom format
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
    } else if (doc.rss?.channel?.item || doc.feed?.entry) {
      // RSS or Atom
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
    
    // Apply quant filtering for news sources
    if (feed.type === 'news') {
      const quantKeywords = [
        'quant', 'quantitative', 'algorithm', 'algorithmic', 'trading',
        'hedge fund', 'HFT', 'high frequency', 'market making',
        'risk', 'volatility', 'derivative', 'option', 'portfolio',
        'machine learning', 'AI', 'systematic', 'statistical'
      ];
      
      items = items.filter(item => {
        const text = (item.title + ' ' + item.desc).toLowerCase();
        return quantKeywords.some(keyword => text.includes(keyword));
      });
    }
    
    // Limit items per feed
    items = items.slice(0, 15);
    
    console.log(`    ✓ ${items.length} items`);
    return items;
    
  } catch (error) {
    console.log(`    ❌ Error: ${error.message}`);
    return [];
  }
}

async function fetchAllFeeds() {
  console.log('📚 Fetching comprehensive quant finance sources...');
  
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
  
  // Sort by date (newest first)
  allItems.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Create final data structure
  const data = {
    updated: new Date().toISOString(),
    count: allItems.length,
    failed: failed,
    items: allItems
  };
  
  // Save to file
  writeFileSync('./data.json', JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Done!`);
  console.log(`   Total articles: ${allItems.length}`);
  console.log(`   Failed feeds: ${failed.length}`);
  
  // Show breakdown by type
  const byType = {};
  allItems.forEach(item => {
    byType[item.type] = (byType[item.type] || 0) + 1;
  });
  
  console.log(`\n📊 Breakdown:`);
  for (const [type, count] of Object.entries(byType)) {
    console.log(`   ${type}: ${count}`);
  }
  
  // Show premium articles
  const premium = allItems.filter(item => item.isPaywalled).length;
  console.log(`   Premium (paywalled): ${premium}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAllFeeds().catch(console.error);
}

export { fetchAllFeeds };
/**
 * QuantFrontier — Smart Archive System
 * Uses multiple archive services for reliability
 */
import { readFileSync, writeFileSync } from 'fs';

/**
 * Generate archive links using multiple services
 * Returns the most reliable link available
 */
function generateArchiveLinks(url) {
  const encodedUrl = encodeURIComponent(url);
  
  // Multiple archive services for reliability
  const services = [
    // archive.ph (most reliable)
    `https://archive.ph/?run=1&url=${encodedUrl}`,
    // archive.today (alternative)
    `https://archive.today/?run=1&url=${encodedUrl}`,
    // web.archive.org (Internet Archive)
    `https://web.archive.org/save/${url}`,
    // ghostarchive.org (alternative)
    `https://ghostarchive.org/?url=${encodedUrl}`,
  ];
  
  return {
    primary: services[0],  // archive.ph
    alternatives: services.slice(1),
    check: `https://archive.ph/${encodedUrl}`,  // Check if already archived
  };
}

/**
 * Check if content is truly quant finance
 * Uses keyword matching for quant-specific topics
 */
function isQuantFinanceContent(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  
  // Core quant finance keywords (must include at least one)
  const coreKeywords = [
    'quant', 'quantitative', 'algorithm', 'algorithmic', 'trading',
    'hedge fund', 'hft', 'high frequency', 'market making',
    'risk', 'volatility', 'var', 'value at risk',
    'derivative', 'option', 'future', 'swap', 'cds',
    'portfolio', 'allocation', 'optimization',
    'machine learning', 'ml', 'ai', 'neural', 'deep learning',
    'statistical', 'model', 'prediction', 'forecast',
    'liquidity', 'execution', 'slippage', 'spread',
    'factor', 'momentum', 'value', 'quality', 'carry'
  ];
  
  // General finance keywords to exclude (unless paired with quant terms)
  const generalFinance = [
    'earnings', 'profit', 'revenue', 'dividend', 'ipo',
    'merger', 'acquisition', 'ceo', 'cfo', 'board',
    'regulation', 'law', 'policy', 'government',
    'consumer', 'retail', 'inflation', 'unemployment',
    'politics', 'election', 'trump', 'biden'
  ];
  
  // Check for core quant keywords
  const hasQuantKeyword = coreKeywords.some(keyword => 
    text.includes(keyword.toLowerCase())
  );
  
  // Check if it's mostly general finance (to exclude)
  const generalCount = generalFinance.filter(keyword => 
    text.includes(keyword.toLowerCase())
  ).length;
  
  // Include if has quant keywords AND not dominated by general finance
  return hasQuantKeyword && generalCount < 3;
}

async function processFeeds() {
  console.log('🎯 Processing articles for quant focus and archives...');
  
  // Read existing data
  const data = JSON.parse(readFileSync('./data.json', 'utf8'));
  
  // Paywalled sites
  const paywalledSites = [
    'ft.com', 'financialtimes.com',
    'wsj.com', 'wallstreetjournal.com',
    'bloomberg.com', 
    'economist.com'
  ];
  
  let archiveCount = 0;
  let filteredCount = 0;
  
  // Filter for quant finance content
  const quantItems = data.items.filter(item => {
    const isQuant = isQuantFinanceContent(item.title, item.desc);
    if (!isQuant) filteredCount++;
    return isQuant;
  });
  
  // Generate archive links for paywalled quant articles
  for (const item of quantItems) {
    // Check if this is a paywalled site
    const isPaywalled = paywalledSites.some(site => 
      item.link.toLowerCase().includes(site.toLowerCase())
    );
    
    if (isPaywalled && !item.archiveLink) {
      const archiveLinks = generateArchiveLinks(item.link);
      item.archiveLinks = archiveLinks;
      item.archiveLink = archiveLinks.primary;  // Use archive.ph as primary
      item.isPaywalled = true;
      archiveCount++;
    }
  }
  
  // Update data with filtered quant articles
  data.items = quantItems;
  data.count = quantItems.length;
  data.filtered = filteredCount;
  
  // Save updated data
  writeFileSync('./data.json', JSON.stringify(data, null, 2));
  
  console.log(`✅ Quant filtering: ${filteredCount} non-quant articles removed`);
  console.log(`✅ Archive links: ${archiveCount} paywalled articles`);
  console.log(`📊 Final count: ${quantItems.length} focused quant finance articles`);
  console.log(`🔗 Using archive.ph for reliable archiving`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processFeeds().catch(console.error);
}

export { generateArchiveLinks, isQuantFinanceContent, processFeeds };
/**
 * QuantFrontier — Archive Link Generator
 * Creates archive.today links for paywalled articles
 * Uses archive.today service (archive.ph, archive.is, archive.today)
 */
import { readFileSync, writeFileSync } from 'fs';

/**
 * Generate an archive.today link for a URL
 * Note: archive.today doesn't have a public API, but we can:
 * 1. Generate a link to check if archive exists
 * 2. Or generate a submit link that user can click to create archive
 */
function generateArchiveLink(url) {
  // Create a submit link to archive.today
  // When user clicks this, they'll be taken to archive.today to create the archive
  const encodedUrl = encodeURIComponent(url);
  return `https://archive.today/?run=1&url=${encodedUrl}`;
}

/**
 * Check if an archive might exist (heuristic based on URL pattern)
 * We can't actually check without making a request, but we can
 * generate a "check" link that shows existing archives
 */
function generateArchiveCheckLink(url) {
  const encodedUrl = encodeURIComponent(url);
  return `https://archive.today/${encodedUrl}`;
}

async function processFeeds() {
  console.log('📚 Generating archive links for paywalled articles...');
  
  // Read existing data
  const data = JSON.parse(readFileSync('./data.json', 'utf8'));
  
  // Paywalled sites that benefit from archiving
  const paywalledSites = [
    'ft.com', 'financialtimes.com',
    'wsj.com', 'wallstreetjournal.com',
    'bloomberg.com', 
    'economist.com',
    'nytimes.com', 'newyorktimes.com',
    'washingtonpost.com',
    'barrons.com',
    'marketwatch.com'
  ];
  
  let updatedCount = 0;
  
  for (const item of data.items) {
    // Skip if already has archive link
    if (item.archiveLink) continue;
    
    // Check if this is a paywalled site
    const isPaywalled = paywalledSites.some(site => 
      item.link.toLowerCase().includes(site.toLowerCase())
    );
    
    if (isPaywalled) {
      // Generate both check and submit links
      item.archiveCheck = generateArchiveCheckLink(item.link);
      item.archiveSubmit = generateArchiveLink(item.link);
      
      // For display, use the submit link (users can create archive)
      item.archiveLink = item.archiveSubmit;
      
      updatedCount++;
      
      if (updatedCount <= 5) {
        console.log(`  ✓ ${item.label}: ${item.title.substring(0, 50)}...`);
      }
    }
  }
  
  // Save updated data
  writeFileSync('./data.json', JSON.stringify(data, null, 2));
  console.log(`✅ Added archive links to ${updatedCount} paywalled articles`);
  console.log(`🔗 Users can click "Archive" button to create/view archived versions`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processFeeds().catch(console.error);
}

export { generateArchiveLink, generateArchiveCheckLink, processFeeds };
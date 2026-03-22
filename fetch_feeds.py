import feedparser
import json
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

FEEDS = [
    {'url':'https://arxiv.org/rss/q-fin',           'type':'arxiv',  'label':'arXiv q-fin',      'tags':['research','paper']},
    {'url':'https://arxiv.org/rss/q-fin.PM',         'type':'arxiv',  'label':'arXiv Portfolio',  'tags':['portfolio','paper']},
    {'url':'https://arxiv.org/rss/q-fin.TR',         'type':'arxiv',  'label':'arXiv Trading',    'tags':['trading','paper']},
    {'url':'https://arxiv.org/rss/q-fin.RM',         'type':'arxiv',  'label':'arXiv Risk',       'tags':['risk','paper']},
    {'url':'https://arxiv.org/rss/q-fin.CP',         'type':'arxiv',  'label':'arXiv Pricing',    'tags':['derivatives','paper']},
    {'url':'https://arxiv.org/rss/cs.LG',            'type':'arxiv',  'label':'arXiv ML',         'tags':['ML','paper']},
    {'url':'https://quantocracy.com/feed/',           'type':'blog',   'label':'Quantocracy',      'tags':['curated','blog']},
    {'url':'https://robotwealth.com/feed/',           'type':'blog',   'label':'Robot Wealth',     'tags':['strategy','blog']},
    {'url':'https://alphaarchitect.com/feed/',        'type':'blog',   'label':'Alpha Architect',  'tags':['factor','blog']},
    {'url':'https://www.reddit.com/r/quant.rss?limit=25',         'type':'reddit', 'label':'r/quant',        'tags':['community']},
    {'url':'https://www.reddit.com/r/algotrading.rss?limit=25',   'type':'reddit', 'label':'r/algotrading',  'tags':['algo','community']},
    {'url':'https://www.reddit.com/r/quantfinance.rss?limit=20',  'type':'reddit', 'label':'r/quantfinance', 'tags':['community']},
    {'url':'https://www.reddit.com/r/MachineLearning.rss?limit=15','type':'reddit','label':'r/MachineLearning','tags':['ML','community']},
]

def strip_html(text):
    text = re.sub(r'<[^>]+>', ' ', text or '')
    text = re.sub(r'\s+', ' ', text)
    for ent, rep in [('&amp;','&'),('&lt;','<'),('&gt;','>'),('&quot;','"'),('&#39;',"'"),('&nbsp;',' ')]:
        text = text.replace(ent, rep)
    return text.strip()

def parse_date(entry):
    for field in ('published','updated','created'):
        val = entry.get(field, '')
        if val:
            try:
                dt = parsedate_to_datetime(val)
                return dt.isoformat()
            except Exception:
                pass
    return datetime.now(timezone.utc).isoformat()

items = []
failed = []

for feed_cfg in FEEDS:
    try:
        print(f"Fetching {feed_cfg['label']}...")
        d = feedparser.parse(feed_cfg['url'])
        count = 0
        for entry in d.entries[:20]:
            title = strip_html(entry.get('title',''))
            if not title or len(title) < 5:
                continue
            link  = entry.get('link','') or entry.get('id','')
            desc  = strip_html(entry.get('summary','') or entry.get('description','') or entry.get('content',[{}])[0].get('value',''))[:280]
            date  = parse_date(entry)
            items.append({
                'title': title,
                'link':  link,
                'desc':  desc,
                'date':  date,
                'type':  feed_cfg['type'],
                'label': feed_cfg['label'],
                'tags':  feed_cfg['tags'],
            })
            count += 1
        print(f"  → {count} items")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        failed.append(feed_cfg['label'])

# Deduplicate by title
seen = set()
unique = []
for item in sorted(items, key=lambda x: x['date'], reverse=True):
    key = item['title'].lower()[:60]
    if key not in seen:
        seen.add(key)
        unique.append(item)

output = {
    'updated': datetime.now(timezone.utc).isoformat(),
    'count': len(unique),
    'failed': failed,
    'items': unique,
}

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n✓ Saved {len(unique)} items to data.json")
if failed:
    print(f"✗ Failed feeds: {', '.join(failed)}")

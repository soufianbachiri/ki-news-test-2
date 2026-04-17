// ═══════════════════════════════════════════════
// KI News Fetcher — läuft täglich via GitHub Actions
// Holt alle RSS-Feeds, bewertet Artikel mit Gemini
// und speichert die besten 25 als articles.json
// ═══════════════════════════════════════════════

const { writeFileSync } = require('fs');

// ── Quellen (identisch mit index.html) ──
const SOURCES = [
  // KI & Tech — Deutsch
  { name: 'Heise Online',         url: 'https://www.heise.de/thema/Kuenstliche-Intelligenz.xml',                  category: 'KI & Tech' },
  { name: 't3n',                  url: 'https://t3n.de/tag/kuenstliche-intelligenz/rss.xml',                      category: 'KI & Tech' },
  { name: 'Google Deutschland',   url: 'https://blog.google/intl/de-de/feed/',                                   category: 'KI & Tech' },
  { name: 'Microsoft DE',         url: 'https://news.microsoft.com/de-de/tag/agents/feed/',                       category: 'KI & Tech' },

  // KI & Tech — Grosse Anbieter
  { name: 'OpenAI',               url: 'https://openai.com/news/rss.xml',                                        category: 'KI & Tech' },
  { name: 'Anthropic',            url: 'https://www.anthropic.com/rss.xml',                                      category: 'KI & Tech' },
  { name: 'Google DeepMind',      url: 'https://deepmind.google/blog/rss.xml',                                   category: 'KI & Tech' },
  { name: 'Google AI Blog',       url: 'https://ai.googleblog.com/feeds/posts/default',                          category: 'KI & Tech' },
  { name: 'Meta AI',              url: 'https://ai.meta.com/blog/feed/',                                         category: 'KI & Tech' },
  { name: 'Hugging Face',         url: 'https://huggingface.co/blog/feed.xml',                                   category: 'KI & Tech' },
  { name: 'Mistral AI',           url: 'https://mistral.ai/news/feed.xml',                                       category: 'KI & Tech' },
  { name: 'Microsoft AI Blog',    url: 'https://blogs.microsoft.com/ai/feed/',                                   category: 'KI & Tech' },
  { name: 'Perplexity',           url: 'https://www.perplexity.ai/hub/rss.xml',                                  category: 'KI & Tech' },
  { name: 'xAI (Grok)',           url: 'https://x.ai/blog/feed.xml',                                             category: 'KI & Tech' },
  { name: 'NVIDIA AI',            url: 'https://blogs.nvidia.com/blog/category/generative-ai/feed/',             category: 'KI & Tech' },
  { name: 'AWS Machine Learning', url: 'https://aws.amazon.com/blogs/machine-learning/feed/',                    category: 'KI & Tech' },
  { name: 'Apple ML',             url: 'https://machinelearning.apple.com/rss/whats-new.rss',                    category: 'KI & Tech' },
  { name: 'Cohere',               url: 'https://cohere.com/blog/rss',                                            category: 'KI & Tech' },
  { name: 'IBM Research AI',      url: 'https://research.ibm.com/blog/rss',                                      category: 'KI & Tech' },

  // KI & Tech — Fachmedien
  { name: 'VentureBeat AI',       url: 'https://venturebeat.com/category/ai/feed/',                              category: 'KI & Tech' },
  { name: 'TechCrunch AI',        url: 'https://techcrunch.com/category/artificial-intelligence/feed/',          category: 'KI & Tech' },
  { name: 'The Verge AI',         url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',      category: 'KI & Tech' },
  { name: 'Wired AI',             url: 'https://www.wired.com/feed/category/artificial-intelligence/latest/rss', category: 'KI & Tech' },
  { name: 'MIT Tech Review',      url: 'https://www.technologyreview.com/feed/',                                 category: 'KI & Tech' },
  { name: 'ZDNet AI',             url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',            category: 'KI & Tech' },
  { name: 'AI Business',          url: 'https://aibusiness.com/feed/',                                           category: 'KI & Tech' },
  { name: 'AI News',              url: 'https://www.artificialintelligence-news.com/feed/',                      category: 'KI & Tech' },
  { name: 'The Batch',            url: 'https://www.deeplearning.ai/the-batch/rss/',                             category: 'KI & Tech' },
  { name: 'The Rundown AI',       url: 'https://www.therundown.ai/rss',                                          category: 'KI & Tech' },
  { name: 'Towards Data Science', url: 'https://towardsdatascience.com/feed',                                    category: 'KI & Tech' },

  // KI & Tech — Enterprise Software
  { name: 'SAP News AI',          url: 'https://news.sap.com/category/artificial-intelligence/feed/',            category: 'KI & Tech' },
  { name: 'ServiceNow Blog',      url: 'https://www.servicenow.com/blogs/feed/',                                 category: 'KI & Tech' },
  { name: 'Workday Blog',         url: 'https://blog.workday.com/en-us/feed.xml',                                category: 'KI & Tech' },
  { name: 'Oracle AI',            url: 'https://blogs.oracle.com/ai-and-datascience/rss',                        category: 'KI & Tech' },
  { name: 'McKinsey AI',          url: 'https://www.mckinsey.com/capabilities/quantumblack/our-insights/rss',    category: 'KI & Tech' },
  { name: 'Microsoft Dynamics',   url: 'https://cloudblogs.microsoft.com/dynamics365/feed/',                     category: 'KI & Tech' },

  // Finance & Banking
  { name: 'IT Finanzmagazin',     url: 'https://www.it-finanzmagazin.de/tag/kuenstliche-intelligenz/feed/',       category: 'Finance & Banking' },
  { name: 'IT Finanzmagazin KI',  url: 'https://www.it-finanzmagazin.de/tag/ki/feed/',                           category: 'Finance & Banking' },
  { name: 'Der Bank Blog',        url: 'https://www.der-bank-blog.de/stichwort/kuenstliche-intelligenz/feed/',    category: 'Finance & Banking' },
  { name: 'Finance Forward',      url: 'https://financeforward.de/feed/',                                        category: 'Finance & Banking' },
  { name: 'Payment & Banking',    url: 'https://paymentandbanking.com/feed/',                                    category: 'Finance & Banking' },
  { name: 'BankingHub',           url: 'https://www.bankinghub.eu/feed/',                                        category: 'Finance & Banking' },
  { name: 'finews.ch',            url: 'https://www.finews.ch/rss/',                                             category: 'Finance & Banking' },
  { name: 'Gründerszene Fintech', url: 'https://www.gruenderszene.de/feed/?cat=fintech',                         category: 'Finance & Banking' },
  { name: 'WirtschaftsWoche KI',  url: 'https://www.wiwo.de/themen/kuenstliche-intelligenz/rss',                 category: 'Finance & Banking' },

  // Marketing, Vertrieb & Service — Deutsch
  { name: 'HubSpot Marketing',    url: 'https://blog.hubspot.de/marketing/rss.xml',                              category: 'Marketing, Vertrieb & Service' },
  { name: 'HubSpot Sales',        url: 'https://blog.hubspot.de/sales/rss.xml',                                  category: 'Marketing, Vertrieb & Service' },
  { name: 'HubSpot Service',      url: 'https://blog.hubspot.de/service/rss.xml',                                category: 'Marketing, Vertrieb & Service' },
  { name: 'OMR',                  url: 'https://omr.com/de/daily/feed/',                                         category: 'Marketing, Vertrieb & Service' },
  { name: 'OnlineMarketing.de',   url: 'https://onlinemarketing.de/feed/',                                       category: 'Marketing, Vertrieb & Service' },
  { name: 'W&V',                  url: 'https://www.wuv.de/rss/alle-news.xml',                                   category: 'Marketing, Vertrieb & Service' },
  { name: 'Absatzwirtschaft',     url: 'https://www.absatzwirtschaft.de/feed/',                                  category: 'Marketing, Vertrieb & Service' },

  // Marketing, Vertrieb & Service — CRM & Tools
  { name: 'Salesforce Blog',      url: 'https://www.salesforce.com/blog/feed/',                                  category: 'Marketing, Vertrieb & Service' },
  { name: 'Pipedrive Blog',       url: 'https://www.pipedrive.com/en/blog/rss',                                  category: 'Marketing, Vertrieb & Service' },
  { name: 'Intercom Blog',        url: 'https://www.intercom.com/blog/feed/',                                    category: 'Marketing, Vertrieb & Service' },
  { name: 'Zendesk Blog',         url: 'https://www.zendesk.com/blog/feed/',                                     category: 'Marketing, Vertrieb & Service' },
  { name: 'Freshworks Blog',      url: 'https://www.freshworks.com/blog/feed/',                                  category: 'Marketing, Vertrieb & Service' },
  { name: 'ActiveCampaign',       url: 'https://www.activecampaign.com/blog/feed/',                              category: 'Marketing, Vertrieb & Service' },
  { name: 'Monday.com Blog',      url: 'https://monday.com/blog/feed/',                                          category: 'Marketing, Vertrieb & Service' },
  { name: 'Close CRM',            url: 'https://close.com/blog/feed/',                                           category: 'Marketing, Vertrieb & Service' },
  { name: 'SuperOffice',          url: 'https://www.superoffice.com/blog/feed/',                                 category: 'Marketing, Vertrieb & Service' },
  { name: 'Zoho Blog',            url: 'https://www.zoho.com/blog/rss.xml',                                      category: 'Marketing, Vertrieb & Service' },
  { name: 'Gong Blog',            url: 'https://www.gong.io/blog/feed/',                                         category: 'Marketing, Vertrieb & Service' },
  { name: 'Drift Blog',           url: 'https://www.drift.com/blog/feed/',                                       category: 'Marketing, Vertrieb & Service' },
  { name: 'Zapier Blog',          url: 'https://zapier.com/blog/feeds/latest/',                                  category: 'Marketing, Vertrieb & Service' },
  { name: 'Make Blog',            url: 'https://www.make.com/en/blog/feed',                                      category: 'Marketing, Vertrieb & Service' },
  { name: 'n8n Blog',             url: 'https://blog.n8n.io/rss/',                                               category: 'Marketing, Vertrieb & Service' },

  // Marketing, Vertrieb & Service — International
  { name: 'Sprout Social',        url: 'https://sproutsocial.com/insights/feed/',                                category: 'Marketing, Vertrieb & Service' },
  { name: 'Buffer Blog',          url: 'https://buffer.com/resources/feed/',                                     category: 'Marketing, Vertrieb & Service' },
  { name: 'Content Marketing Inst.', url: 'https://contentmarketinginstitute.com/feed/',                         category: 'Marketing, Vertrieb & Service' },
  { name: 'MarketingProfs',       url: 'https://www.marketingprofs.com/rss/articles.asp',                       category: 'Marketing, Vertrieb & Service' },
  { name: 'Neil Patel',           url: 'https://neilpatel.com/blog/feed/',                                       category: 'Marketing, Vertrieb & Service' },
  { name: 'Moz Blog',             url: 'https://moz.com/blog/feed/rss',                                          category: 'Marketing, Vertrieb & Service' },
  { name: 'SEMrush Blog',         url: 'https://www.semrush.com/blog/feed/',                                     category: 'Marketing, Vertrieb & Service' },
];

// ── XML Parser ──
function extract(xml, tag) {
  const re = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'
  );
  const m = xml.match(re);
  return m ? (m[1] || m[2] || '').trim() : '';
}

function extractLink(xml) {
  const href = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (href) return href[1];
  const text = xml.match(/<link[^>]*>([^<]+)<\/link>/i);
  return text ? text[1].trim() : '';
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function parseRSS(xml, source) {
  const items = [];
  const re = /<(item|entry)[^>]*>([\s\S]*?)<\/(item|entry)>/g;
  let match;
  while ((match = re.exec(xml)) && items.length < 3) {
    const c = match[2];
    const title = stripHtml(extract(c, 'title'));
    const link  = extractLink(c);
    const desc  = extract(c, 'description') || extract(c, 'summary') || extract(c, 'content');
    const date  = extract(c, 'pubDate') || extract(c, 'published') || extract(c, 'updated');
    const imgM  = c.match(/<img[^>]+src=["']([^"'> ]+)["']/i);
    const encEl = c.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i);
    const mediaEl = c.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
                    c.match(/<media:content[^>]+url=["']([^"']+)["'][^>]+type=["']image/i);
    const image = (mediaEl && mediaEl[1]) || (encEl && encEl[1]) || (imgM && imgM[1]) || '';

    if (title && link) {
      items.push({
        title,
        link,
        image,
        excerpt: stripHtml(desc).slice(0, 250),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        source: source.name,
        category: source.category,
        score: 0,
      });
    }
  }
  return items;
}

// ── RSS Fetcher ──
async function fetchFeed(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KINewsBot/1.0)' }
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ── Gemini Bewertung ──
async function scoreWithGemini(articles) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const BATCH = 25;
  const result = [];

  for (let i = 0; i < articles.length; i += BATCH) {
    const batch = articles.slice(i, i + BATCH);

    const liste = batch.map((a, idx) =>
      `${idx + 1}. [${a.category}] "${a.title}"\n   ${a.excerpt.slice(0, 150)}`
    ).join('\n\n');

    const prompt = `Du bist Chefredakteur einer KI-Lernplattform für deutschsprachige Fach- und Führungskräfte.

Bewerte jeden Artikel von 0 bis 10. Vergib hohe Punktzahlen wenn:
- Der Artikel echte, aktuelle KI-News enthält (neue Modelle, Partnerschaften, Produkte, Studien)
- Es für Berufstätige relevant ist die KI im Arbeitsalltag einsetzen wollen
- Bei Finance: Bezug zu KI, Fintech, digitaler Transformation in Banken/Versicherungen
- Bei Marketing/Sales/CRM: Bezug zu KI-Tools, Automatisierung, modernen Sales-Methoden

Vergib niedrige Punktzahlen (0–3) für:
- Allgemeine Unternehmens-PR ohne echten Informationswert
- Clickbait oder oberflächliche Inhalte
- Keine erkennbare Relevanz für KI oder digitale Transformation

Artikel:
${liste}

Antworte NUR mit den Zahlen (0-10), eine pro Zeile, in der gleichen Reihenfolge. Keine Erklärungen.`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
        }),
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const scores = text.trim().split('\n').map(s => parseInt(s.trim()) || 0);
      batch.forEach((a, idx) => result.push({ ...a, score: scores[idx] ?? 0 }));
      console.log(`  Batch ${Math.floor(i / BATCH) + 1} bewertet (${batch.length} Artikel)`);
    } catch (e) {
      console.error(`  Batch Fehler: ${e.message}`);
      batch.forEach(a => result.push({ ...a, score: 5 }));
    }

    if (i + BATCH < articles.length) await new Promise(r => setTimeout(r, 1500));
  }

  return result;
}

// ── Hauptprogramm ──
async function main() {
  console.log(`\n🚀 KI News Fetcher gestartet — ${new Date().toLocaleString('de-DE')}`);
  console.log(`📡 ${SOURCES.length} Quellen werden geladen...\n`);

  const allArticles = [];
  let success = 0, failed = 0;

  for (const source of SOURCES) {
    try {
      const xml = await fetchFeed(source.url);
      const articles = parseRSS(xml, source);
      allArticles.push(...articles);
      console.log(`  ✓ ${source.name} (${articles.length} Artikel)`);
      success++;
    } catch (e) {
      console.log(`  ✗ ${source.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Ergebnis: ${success} Quellen geladen, ${failed} fehlgeschlagen`);
  console.log(`📰 Insgesamt ${allArticles.length} Artikel gesammelt`);
  console.log('\n🤖 Gemini bewertet die Artikel...\n');

  const scored = await scoreWithGemini(allArticles);

  // Top 25 pro Kategorie ausgewogen + beste Gesamtartikel
  const top = scored
    .filter(a => a.score >= 6)
    .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));

  // Mindestens 5 pro Kategorie sicherstellen
  const categories = ['KI & Tech', 'Finance & Banking', 'Marketing, Vertrieb & Service'];
  const selected = [];
  const used = new Set();

  for (const cat of categories) {
    const catArticles = top.filter(a => a.category === cat && !used.has(a.link)).slice(0, 7);
    catArticles.forEach(a => { selected.push(a); used.add(a.link); });
  }

  // Restliche Plätze mit besten verbleibenden füllen
  for (const a of top) {
    if (selected.length >= 25) break;
    if (!used.has(a.link)) { selected.push(a); used.add(a.link); }
  }

  const final = selected.slice(0, 25).sort((a, b) => b.score - a.score);

  console.log(`\n⭐ Top ${final.length} Artikel ausgewählt:`);
  final.forEach((a, i) => console.log(`  ${i + 1}. [${a.score}/10] [${a.category}] ${a.title.slice(0, 60)}`));

  writeFileSync('articles.json', JSON.stringify({
    updated: new Date().toISOString(),
    total_fetched: allArticles.length,
    articles: final,
  }, null, 2));

  console.log('\n✅ articles.json gespeichert!\n');
}

main().catch(e => { console.error(e); process.exit(1); });

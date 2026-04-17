// ═══════════════════════════════════════════════
// KI News Fetcher — läuft täglich via GitHub Actions
// Holt alle RSS-Feeds, bewertet Artikel mit Gemini
// und speichert die besten 25 als articles.json
// ═══════════════════════════════════════════════

const { writeFileSync } = require('fs');

// ── Quellen — nur deutschsprachige DACH-Medien ──
const SOURCES = [
  // KI & Tech — DACH
  { name: 'Heise Online',         url: 'https://www.heise.de/thema/Kuenstliche-Intelligenz.xml',                  category: 'KI & Tech' },
  { name: 't3n',                  url: 'https://t3n.de/tag/kuenstliche-intelligenz/rss.xml',                      category: 'KI & Tech' },
  { name: 'Golem.de',             url: 'https://www.golem.de/rss.php?feed=ATOM1.0',                               category: 'KI & Tech' },
  { name: 'Google Deutschland',   url: 'https://blog.google/intl/de-de/feed/',                                   category: 'KI & Tech' },
  { name: 'Microsoft DE',         url: 'https://news.microsoft.com/de-de/tag/agents/feed/',                       category: 'KI & Tech' },
  { name: 'ZDNet DE',             url: 'https://www.zdnet.de/feed/',                                             category: 'KI & Tech' },
  { name: 'Computerwoche',        url: 'https://www.computerwoche.de/a/rss.xml',                                  category: 'KI & Tech' },
  { name: 'Gründerszene',         url: 'https://www.gruenderszene.de/feed/',                                     category: 'KI & Tech' },
  { name: 'futurezone.at',        url: 'https://futurezone.at/rss/tech',                                         category: 'KI & Tech' },
  { name: 'netzpolitik.org',      url: 'https://netzpolitik.org/feed/',                                          category: 'KI & Tech' },
  { name: 'WirtschaftsWoche Tech',url: 'https://www.wiwo.de/themen/digitale-welt/rss',                           category: 'KI & Tech' },
  { name: 'Handelsblatt Tech',    url: 'https://www.handelsblatt.com/rss/technologie',                           category: 'KI & Tech' },

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

  // Marketing, Vertrieb & Service
  { name: 'HubSpot Marketing',    url: 'https://blog.hubspot.de/marketing/rss.xml',                              category: 'Marketing, Vertrieb & Service' },
  { name: 'HubSpot Sales',        url: 'https://blog.hubspot.de/sales/rss.xml',                                  category: 'Marketing, Vertrieb & Service' },
  { name: 'HubSpot Service',      url: 'https://blog.hubspot.de/service/rss.xml',                                category: 'Marketing, Vertrieb & Service' },
  { name: 'OMR',                  url: 'https://omr.com/de/daily/feed/',                                         category: 'Marketing, Vertrieb & Service' },
  { name: 'OnlineMarketing.de',   url: 'https://onlinemarketing.de/feed/',                                       category: 'Marketing, Vertrieb & Service' },
  { name: 'W&V',                  url: 'https://www.wuv.de/rss/alle-news.xml',                                   category: 'Marketing, Vertrieb & Service' },
  { name: 'Absatzwirtschaft',     url: 'https://www.absatzwirtschaft.de/feed/',                                  category: 'Marketing, Vertrieb & Service' },
  { name: 'meedia',               url: 'https://meedia.de/feed/',                                                category: 'Marketing, Vertrieb & Service' },
  { name: 'Horizont',             url: 'https://www.horizont.net/rss/',                                          category: 'Marketing, Vertrieb & Service' },
];

// ── KI-Relevanz-Filter ──
function isRelevant(art) {
  const title   = art.title.toLowerCase();
  const excerpt = art.excerpt.toLowerCase();
  const KI_KEYWORDS = [
    'künstliche intelligenz','maschinelles lernen','sprachmodell','chatbot','automatisierung',
    'generative ki','deep learning','neuronale','digitale transformation',
    'ki-assistent','ki-agent','ki-tool','ki-plattform','ki-modell','ki-gestützt',
    'chatgpt','gpt-4','gpt-5','copilot','gemini','llama','mistral','grok','claude','perplexity',
    'openai','anthropic','deepmind','hugging face','cohere','xai','mistral ai',
    'large language model','llm','generative ai','foundation model','transformer',
    'agentic','ai agent','ai tool','prompt','fine-tuning',
    'automation','rpa','intelligente automatisierung','conversational ai',
  ];
  if (/\bki\b/.test(title) || /\bai\b/.test(title)) return true;
  if (KI_KEYWORDS.some(kw => title.includes(kw))) return true;
  if (/\bki\b/.test(excerpt) || /\bai\b/.test(excerpt)) return true;
  if (KI_KEYWORDS.some(kw => excerpt.includes(kw))) return true;
  return false;
}

// ── Sprachfilter: nur deutsche Artikel ──
function isGerman(art) {
  const text = (art.title + ' ' + art.excerpt).toLowerCase();
  if (/[äöüß]/.test(text)) return true;
  const words = [' der ',' die ',' das ',' und ',' mit ',' für ',' ist ',' von ',' auf ',' ein ',' eine ',' wird ',' hat ',' zu ',' im ',' an ',' bei ',' über ',' wie ',' aber ',' auch ',' nur ',' sich ',' sind ',' dem ',' den ',' als ',' oder ',' wenn ',' neue ',' neues '];
  return words.some(w => text.includes(w));
}

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

WICHTIG: Wähle NUR deutschsprachige Artikel. Vergib 0 für englischsprachige Artikel.

Bewerte jeden Artikel von 0 bis 10. Vergib hohe Punktzahlen wenn:
- Der Artikel auf Deutsch verfasst ist UND echte, aktuelle KI-News enthält (neue Modelle, Partnerschaften, Produkte, Studien)
- Es für deutschsprachige Berufstätige relevant ist, die KI im Arbeitsalltag einsetzen wollen
- Bei Finance: Bezug zu KI, Fintech, digitaler Transformation in Banken/Versicherungen
- Bei Marketing/Sales/CRM: Bezug zu KI-Tools, Automatisierung, modernen Sales-Methoden

Vergib niedrige Punktzahlen (0–3) für:
- Englischsprachige Artikel (immer 0)
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

  // Nur deutsche UND KI-relevante Artikel weiterverarbeiten
  const deutscheArtikel = allArticles.filter(isGerman).filter(isRelevant);

  console.log(`\n📊 Ergebnis: ${success} Quellen geladen, ${failed} fehlgeschlagen`);
  console.log(`📰 Insgesamt ${allArticles.length} Artikel gesammelt, davon ${deutscheArtikel.length} auf Deutsch`);
  console.log('\n🤖 Gemini bewertet die Artikel...\n');

  const scored = await scoreWithGemini(deutscheArtikel);

  // Duplikate entfernen (gleicher Link oder sehr ähnlicher Titel)
  const seenLinks = new Set();
  const seenTitles = new Set();
  const deduped = scored.filter(a => {
    if (seenLinks.has(a.link)) return false;
    const titleKey = a.title.toLowerCase().replace(/[^a-z0-9äöüß]/g, '').slice(0, 40);
    if (seenTitles.has(titleKey)) return false;
    seenLinks.add(a.link);
    seenTitles.add(titleKey);
    return true;
  });

  // Top-Artikel nach Score filtern
  const top = deduped
    .filter(a => a.score >= 6 && a.image && a.image.trim() !== '')
    .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));

  // Mindestens 3 pro Kategorie sicherstellen
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

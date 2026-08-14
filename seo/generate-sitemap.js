const fs = require('fs');
const path = require('path');
const { navigationUrls } = require('../src/utils/urlHelper');

const DOMAIN = 'https://laurentxdubois.com';
const CONFIG_PATH = path.join(__dirname, 'pages-to-index.txt');
const EXAMPLE_CONFIG_PATH = path.join(__dirname, 'pages-to-index.example.txt');
const OUTPUT_PATH = path.join(__dirname, '../public/sitemap.xml');

async function generateSitemap() {
    let pages = [];

    if (fs.existsSync(CONFIG_PATH)) {
        pages = fs.readFileSync(CONFIG_PATH, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
    } else if (fs.existsSync(EXAMPLE_CONFIG_PATH)) {
        pages = fs.readFileSync(EXAMPLE_CONFIG_PATH, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
    } else {
        pages = Object.keys(navigationUrls);
    }

    const validPages = pages.filter(key => navigationUrls[key]);

    const urls = validPages.map(key => ({
        fr: navigationUrls[key].fr,
        en: navigationUrls[key].en
    }));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(url => `  <url>
    <loc>${DOMAIN}${url.fr}</loc>
    <xhtml:link rel="alternate" hreflang="fr" href="${DOMAIN}${url.fr}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}${url.en}"/>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;

    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, xml);
    console.log(`✓ Sitemap generated: ${urls.length} URLs`);
}

generateSitemap();

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 1. Build Galleries Manifest
function buildGalleriesManifest() {
  const galleriesDir = path.join(ROOT_DIR, 'public', 'galleries');
  const outputPath = path.join(DATA_DIR, 'galleries-manifest.json');

  if (!fs.existsSync(galleriesDir)) {
    console.warn('Galleries directory not found:', galleriesDir);
    if (fs.existsSync(outputPath)) {
      console.log('✓ Preserving existing committed galleries manifest');
      return JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    }
    const emptyManifest = { galleries: [], details: {} };
    fs.writeFileSync(outputPath, JSON.stringify(emptyManifest, null, 2), 'utf-8');
    return emptyManifest;
  }

  const entries = fs.readdirSync(galleriesDir, { withFileTypes: true });
  const galleryFolders = entries
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map(dirent => dirent.name);

  if (galleryFolders.length === 0 && fs.existsSync(outputPath)) {
    console.log('✓ Preserving existing committed galleries manifest');
    return JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  }

  const manifest = {
    galleries: galleryFolders,
    details: {}
  };

  const validImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

  for (const folder of galleryFolders) {
    const galleryPath = `/galleries/${folder}`;
    const imagesDir = path.join(galleriesDir, folder, 'images');
    const videosDir = path.join(galleriesDir, folder, 'videos');

    let imageNames = [];
    if (fs.existsSync(imagesDir)) {
      imageNames = fs.readdirSync(imagesDir)
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return validImageExtensions.has(ext) && !file.startsWith('.');
        })
        .reverse();
    }

    let videosFolderExists = false;
    if (fs.existsSync(videosDir)) {
      const videoFiles = fs.readdirSync(videosDir)
        .filter(file => !file.startsWith('.'));
      videosFolderExists = videoFiles.length > 0;
    }

    manifest.details[folder] = {
      galleryPath,
      imageNames,
      videosFolderExists
    };
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✓ Galleries manifest generated: ${manifest.galleries.length} galleries`);
  return manifest;
}

// 2. Build Translations Bundle
function buildTranslationsBundle() {
  const localesDir = path.join(ROOT_DIR, 'locales');
  const translations = { fr: {}, en: {} };

  for (const lang of ['fr', 'en']) {
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir)) continue;

    for (const section of ['components', 'pages', 'common']) {
      const sectionDir = path.join(langDir, section);
      if (fs.existsSync(sectionDir)) {
        const files = fs.readdirSync(sectionDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const name = path.parse(file).name;
          const content = JSON.parse(fs.readFileSync(path.join(sectionDir, file), 'utf-8'));
          translations[lang][`${section}.${name}`] = content;
        }
      }
    }
  }

  const outputPath = path.join(DATA_DIR, 'translations.json');
  fs.writeFileSync(outputPath, JSON.stringify(translations, null, 2), 'utf-8');
  console.log('✓ Translations bundle generated (FR/EN)');
  return translations;
}

// 3. Precompile EJS Templates to Pure JS functions
const DESTRUCTURED_LOCALS = [
  't',
  'path',
  'currentLang',
  'languageUrls',
  'getPageUrl',
  'pageTitle',
  'pageDescription',
  'seoUtils',
  'googleAnalyticsMeasurementId',
  'clickyAnalyticsMeasurementId',
  'gtagMeasurementId',
  'otherCSSFile',
  'otherJSFile',
  'isArticle',
  'publishDate',
  'modifiedDate',
  'articleSection',
  'articleTags',
  'galleries',
  'alertMsgPerInput',
  'nameInput',
  'emailInput',
  'telephoneInput',
  'websiteInput',
  'messageInput',
  'galleryPath',
  'imageNames',
  'videosFolderExists',
  'locals'
];

function buildCompiledTemplates() {
  const viewsDir = path.join(ROOT_DIR, 'src', 'views');
  const rawTemplates = {};

  function readTemplatesRecursive(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        readTemplatesRecursive(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith('.ejs')) {
        const key = prefix ? `${prefix}/${entry.name}` : entry.name;
        const keyWithoutExt = prefix ? `${prefix}/${path.parse(entry.name).name}` : path.parse(entry.name).name;
        const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
        rawTemplates[key] = content;
        rawTemplates[keyWithoutExt] = content;
        rawTemplates[`./${key}`] = content;
        rawTemplates[`./${keyWithoutExt}`] = content;
      }
    }
  }

  readTemplatesRecursive(viewsDir);

  const compiledFunctions = {};
  for (const [key, templateContent] of Object.entries(rawTemplates)) {
    try {
      const fn = ejs.compile(templateContent, {
        client: true,
        compileDebug: false,
        _with: false,
        destructuredLocals: DESTRUCTURED_LOCALS
      });
      compiledFunctions[key] = fn.toString();
    } catch (err) {
      console.error(`Error compiling template ${key}:`, err);
    }
  }

  const outputJs = `// Auto-generated by scripts/build-manifest.js - DO NOT EDIT MANUALLY
module.exports = {
${Object.entries(compiledFunctions)
  .map(([k, fnStr]) => `  ${JSON.stringify(k)}: ${fnStr}`)
  .join(',\n')}
};
`;

  const outputPath = path.join(DATA_DIR, 'compiled-templates.js');
  fs.writeFileSync(outputPath, outputJs, 'utf-8');
  console.log(`✓ EJS templates precompiled to pure ESM-ready functions: ${Object.keys(compiledFunctions).length / 4} templates`);
}

console.log('Building Cloudflare Workers manifest & bundles...');
buildGalleriesManifest();
buildTranslationsBundle();
buildCompiledTemplates();
console.log('Done!');

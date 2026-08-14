const { Hono } = require('hono');
const { renderTemplate } = require('./utils/renderer');
const { translations, getTranslation } = require('./utils/translations');
const { getLanguageUrls, getGalleryFolder } = require('./utils/urlMapping');
const { getPageUrl } = require('./utils/urlHelper');
const galleryService = require('./services/galleryService');
const seoService = require('./services/seoService');
const { sendContactEmail } = require('./services/mailerService');

const app = new Hono();

// Helper to render EJS views with all required context
function renderView(c, templateName, viewData = {}, status = 200) {
  const lang = c.get('language') || (c.req.path.startsWith('/en') ? 'en' : 'fr');
  const path = c.req.path;
  const metadata = seoService.getMetadataForPath(path, lang);
  const languageUrls = getLanguageUrls(path);

  const env = c.env || {};

  const contextData = {
    path,
    currentLang: lang,
    languageUrls,
    t: (key) => getTranslation(translations[lang], key),
    getPageUrl: (page) => getPageUrl(page, lang),
    pageTitle: metadata.title,
    pageDescription: metadata.description,
    seoUtils: seoService,
    googleAnalyticsMeasurementId: env.GOOGLE_ANALYTICS_MEASUREMENT_ID || process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID || '',
    clickyAnalyticsMeasurementId: env.CLICKY_ANALYTICS_MEASUREMENT_ID || process.env.CLICKY_ANALYTICS_MEASUREMENT_ID || '',
    gtagMeasurementId: env.GTAG_ID || process.env.GTAG_ID || '',
    otherCSSFile: viewData.otherCSSFile || '',
    otherJSFile: viewData.otherJSFile || '',
    ...viewData
  };

  const html = renderTemplate(templateName, contextData);
  return c.html(html, status);
}

// Language middleware
app.use('*', async (c, next) => {
  const path = c.req.path;
  const language = path.startsWith('/en') ? 'en' : 'fr';
  c.set('language', language);
  await next();
});

// Static shortcuts / documents
app.get('/CV', (c) => c.redirect('/data/CVLaurentDuboisPhotography.pdf'));
app.get('/tarifs', (c) => c.redirect('/data/tarifs.pdf'));
app.get('/CGV_wedding', (c) => c.redirect('https://delivery.laurentxdubois.com/ivfz'));
app.get('/CGV_photoshoot', (c) => c.redirect('https://delivery.laurentxdubois.com/w7m0'));

// Home routes
app.get('/', async (c) => {
  const galleryData = await galleryService.getGalleryData('default');
  return renderView(c, 'gallery', galleryData);
});

app.get('/en', async (c) => {
  const galleryData = await galleryService.getGalleryData('default');
  return renderView(c, 'gallery', galleryData);
});

// About routes
app.get('/a-propos', (c) => renderView(c, 'about'));
app.get('/en/about', (c) => renderView(c, 'about'));

// Thanks routes
app.get('/merci', (c) => renderView(c, 'thanks'));
app.get('/en/thanks', (c) => renderView(c, 'thanks'));

// All galleries list
app.get('/galleries/__all__', async (c) => {
  const galleries = await galleryService.getAllGalleries();
  return renderView(c, 'all-galleries', { galleries });
});

app.get('/en/galleries/__all__', async (c) => {
  const galleries = await galleryService.getAllGalleries();
  return renderView(c, 'all-galleries', { galleries });
});

// Contact page GET
app.get('/contact', (c) => {
  return renderView(c, 'contact', {
    alertMsgPerInput: new Map(),
    nameInput: '',
    emailInput: '',
    telephoneInput: '',
    websiteInput: '',
    messageInput: ''
  });
});

app.get('/en/contact', (c) => {
  return renderView(c, 'contact', {
    alertMsgPerInput: new Map(),
    nameInput: '',
    emailInput: '',
    telephoneInput: '',
    websiteInput: '',
    messageInput: ''
  });
});

// Contact form POST
const handleContactPost = async (c) => {
  const lang = c.get('language');
  const body = await c.req.parseBody();

  const formData = {
    name: (body['name'] || '').toString().trim(),
    email: (body['email'] || '').toString().trim(),
    telephone: (body['telephone'] || '').toString().trim(),
    website: (body['website'] || '').toString().trim(),
    message: (body['message'] || '').toString().trim()
  };

  const alertMsgPerInput = new Map();

  if (!formData.name) {
    alertMsgPerInput.set('name', lang === 'fr' ? 'Le nom est requis' : 'Name is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email) {
    alertMsgPerInput.set('email', lang === 'fr' ? "L'email est requis" : 'Email is required');
  } else if (!emailRegex.test(formData.email)) {
    alertMsgPerInput.set('email', lang === 'fr' ? 'Veuillez entrer un email valide' : 'Please enter a valid email');
  }

  if (!formData.message) {
    alertMsgPerInput.set('message', lang === 'fr' ? 'Le message est requis' : 'Message is required');
  }

  if (alertMsgPerInput.size > 0) {
    return renderView(c, 'contact', {
      alertMsgPerInput,
      nameInput: formData.name,
      emailInput: formData.email,
      telephoneInput: formData.telephone,
      websiteInput: formData.website,
      messageInput: formData.message
    }, 400);
  }

  try {
    await sendContactEmail(formData, c.env);
    return c.redirect(lang === 'fr' ? '/merci' : '/en/thanks');
  } catch (error) {
    console.error('Failed to send contact email:', error);
    alertMsgPerInput.set('server', lang === 'fr' ? 'Erreur serveur :(' : 'Server error :(');
    return renderView(c, 'contact', {
      alertMsgPerInput,
      nameInput: formData.name,
      emailInput: formData.email,
      telephoneInput: formData.telephone,
      websiteInput: formData.website,
      messageInput: formData.message
    }, 500);
  }
};

app.post('/contact', handleContactPost);
app.post('/en/contact', handleContactPost);

// Dynamic gallery routes
app.get('/en/:galleryName', async (c) => {
  const rawParam = c.req.param('galleryName');
  const galleryFolder = getGalleryFolder(rawParam, 'en');
  const hasGallery = await galleryService.hasGallery(galleryFolder);

  if (!hasGallery) {
    return renderView(c, '404', {}, 404);
  }

  const galleryData = await galleryService.getGalleryData(galleryFolder);
  return renderView(c, 'gallery', galleryData);
});

app.get('/:galleryName', async (c) => {
  const rawParam = c.req.param('galleryName');
  const galleryFolder = getGalleryFolder(rawParam, 'fr');
  const hasGallery = await galleryService.hasGallery(galleryFolder);

  if (!hasGallery) {
    return renderView(c, '404', {}, 404);
  }

  const galleryData = await galleryService.getGalleryData(galleryFolder);
  return renderView(c, 'gallery', galleryData);
});

// 404 handler
app.notFound((c) => {
  return renderView(c, '404', {}, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled Error:', err);
  return renderView(c, '404', {}, 500);
});

export default app;

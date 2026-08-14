const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');

// Home routes
router.get('/', pageController.renderHomePage);
router.get('/en', pageController.renderHomePage);

// About pages - language specific
router.get('/a-propos', pageController.renderAboutPage);
router.get('/en/about', pageController.renderAboutPage);

// Thanks pages - language specific
router.get('/merci', pageController.renderThanksPage);
router.get('/en/thanks', pageController.renderThanksPage);

module.exports = router;

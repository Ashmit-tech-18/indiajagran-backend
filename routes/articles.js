// File: backend/routes/articles.js (UPDATED: Added Level 3 District Route)

const express = require('express');
const router = express.Router();

// Controller functions ko import karein
const {
    createArticle,
    getAllArticles,
    getArticleById,
    getArticleBySlug,
    getArticlesByCategory,
    getRelatedArticles, 
    getTopNews, 
    searchArticles,
    updateArticle,
    deleteArticle,
    generateSitemap
} = require('../controllers/articleController'); 

// --- Article Routes ---

// @route   POST /api/articles
// @desc    Create a new article
router.post('/', createArticle);

// @route   GET /api/articles
// @desc    Get all articles
router.get('/', getAllArticles);

// @route   GET /api/articles/search
// @desc    Search articles by query (q)
router.get('/search', searchArticles);

// @route   GET /api/articles/sitemap
// @desc    Generate sitemap
router.get('/sitemap', generateSitemap);

// @route   GET /api/articles/id/:id
// @desc    Get article by ID
router.get('/id/:id', getArticleById);

// @route   GET /api/articles/slug/:slug
// @desc    Get article by slug
router.get('/slug/:slug', getArticleBySlug);

// --- CATEGORY ROUTES (UPDATED) ---

// Level 1: Category only (e.g., /category/national)
router.get('/category/:category', getArticlesByCategory);

// Level 2: Category + Subcategory (e.g., /category/national/uttar-pradesh)
router.get('/category/:category/:subcategory', getArticlesByCategory);

// --- !!! NEW LEVEL 3 ROUTE ADDED !!! ---
// Level 3: Category + Subcategory + District (e.g., /category/national/uttar-pradesh/lucknow)
router.get('/category/:category/:subcategory/:district', getArticlesByCategory);
// ---------------------------------------


// @route   GET /api/articles/related
// @desc    Get related articles (Supports limit)
router.get('/related', getRelatedArticles);

// @route   GET /api/articles/top-news
// @desc    Get top news articles (for sidebar)
router.get('/top-news', getTopNews);


// @route   PUT /api/articles/:id
// @desc    Update an article
router.put('/:id', updateArticle);

// @route   DELETE /api/articles/:id
// @desc    Delete an article
router.delete('/:id', deleteArticle);

module.exports = router;
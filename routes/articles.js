// File: backend/routes/articles.js (FIXED: Naya 'top-news' route add kiya gaya)

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
    getTopNews, // --- !!! YAHAN NAYA FUNCTION IMPORT KIYA GAYA !!! ---
    searchArticles,
    updateArticle,
    deleteArticle,
    generateSitemap
} = require('../controllers/articleController'); // Controller se functions aa rahe hain

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

// @route   GET /api/articles/category/:category
// @desc    Get articles by category
router.get('/category/:category', getArticlesByCategory);

// @route   GET /api/articles/category/:category/:subcategory
// @desc    Get articles by category and subcategory
router.get('/category/:category/:subcategory', getArticlesByCategory);

// --- !!! NAYA ROUTE YAHAN ADD KIYA GAYA HAI !!! ---
// @route   GET /api/articles/related
// @desc    Get 4 related articles (Optimized)
router.get('/related', getRelatedArticles);
// --- FIX END ---


// --- !!! YAHAN NAYA 'TOP-NEWS' ROUTE ADD KIYA GAYA HAI !!! ---
// @route   GET /api/articles/top-news
// @desc    Get top news articles (for sidebar)
router.get('/top-news', getTopNews);
// --- NAYA ROUTE END ---


// @route   PUT /api/articles/:id
// @desc    Update an article
router.put('/:id', updateArticle);

// @route   DELETE /api/articles/:id
// @desc    Delete an article
router.delete('/:id', deleteArticle);


// --- YEH SABSE ZAROORI HAI ---
// Is file ko router ki tarah export karein
module.exports = router;
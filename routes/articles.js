const express = require('express');
const router = express.Router();
const {
    createArticle,
    getAllArticles,
    getArticleBySlug,
    updateArticle,
    deleteArticle,
    getArticlesByCategory,
    searchArticles,
    getArticleById,
    generateSitemap
} = require('../controllers/articleController');
const auth = require('../middleware/authMiddleware');

// --- Public Routes ---
router.get('/', getAllArticles);

// ---
// --- !!! FIX FOR UPTIME ROBOT !!! ---
// ---
// Yeh Uptime Robot ki 'HEAD' request ko '200 OK' ka jawab dega
router.head('/', (req, res) => {
    res.sendStatus(200);
});
// --- END OF FIX ---

router.get('/search', searchArticles);

router.get('/sitemap', generateSitemap); 

// Category routes ko generic /:slug se pehle rakha gaya hai
router.get('/category/:category', getArticlesByCategory);
router.get('/category/:category/:subcategory', getArticlesByCategory);

// --- Protected Admin Routes ---
router.post('/', auth, createArticle);
router.put('/:id', auth, updateArticle);
router.delete('/:id', auth, deleteArticle);

router.get('/id/:id', getArticleById);

// Yeh route hamesha AAKHIR me hona chahiye
router.get('/:slug', getArticleBySlug); 

module.exports = router;
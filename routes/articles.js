// File: backend/routes/articles.js

const express = require('express');
const router = express.Router();
const Article = require('../models/Article'); 
const multer = require('multer');
const { protect } = require('../middleware/auth'); 

// ☁️ Cloudinary Imports & Config
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 🔥 REMOVED: generateSitemap (Now handled in server.js)
const { 
    getArticles, 
    getArticleById, 
    createArticle, 
    updateArticle, 
    deleteArticle, 
    uploadImage,
    getAdminArticles,    
    updateArticleStatus,
    getArticlesByCategory,
    getRelatedArticles,
    getTopNews,
    searchArticles,
    getArticleBySlug,
    getHomeFeed 
} = require('../controllers/articleController');

// --- Cloudinary Configuration (UNCHANGED) ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🔥 VIDEO & IMAGE SUPPORT CONFIG
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'india_jagran_news',
        resource_type: 'auto',       // Auto-detect Image or Video
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'webm', 'avi', 'mov', 'mkv'], 
    },
});

const upload = multer({ storage: storage });

// ==================================================================
// ⚡ PRIORITY 1: SPECIFIC STATIC ROUTES
// ==================================================================

// Home Feed
router.get('/feed', getHomeFeed);

// Top News
router.get('/top-news', getTopNews);

// Related Articles
router.get('/related', getRelatedArticles);

// Search
router.get('/search', searchArticles);

// Admin Route (Matches Frontend call)
router.get('/admin/all', protect, getAdminArticles); 

// ==================================================================
// ⚡ PRIORITY 2: CATEGORY ROUTES (SPLIT TO PREVENT CRASH)
// ==================================================================

router.get('/category/:category', getArticlesByCategory);
router.get('/category/:category/:subcategory', getArticlesByCategory);
router.get('/category/:category/:subcategory/:district', getArticlesByCategory);

// ==================================================================
// ⚡ PRIORITY 3: GENERAL & DYNAMIC ROUTES
// ==================================================================

router.get('/', getArticles);
router.get('/slug/:slug', getArticleBySlug);
router.get('/id/:id', getArticleById); 

// ==================================================================
// ⚡ PRIORITY 4: WRITE OPERATIONS (PROTECTED)
// ==================================================================

// 1. Create Article (Supports Image/Video)
router.post('/', protect, upload.single('featuredImage'), createArticle);

// 2. Update Article (Supports Image/Video)
router.put('/:id', protect, upload.single('featuredImage'), updateArticle);

// 3. Delete Article
router.delete('/:id', protect, deleteArticle);

// 4. Direct Upload (For Editor Gallery/Content)
router.post('/upload', protect, upload.single('image'), uploadImage);

// 5. Admin Status Update
router.put('/:id/status', protect, updateArticleStatus);

// ==================================================================
// ⚡ LAST PRIORITY: CATCH-ALL ID ROUTE
// ==================================================================
router.get('/:id', getArticleById);

module.exports = router;
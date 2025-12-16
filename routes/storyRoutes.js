const express = require('express');
const router = express.Router();

// ✅ UPDATE: Yahan teenon functions import hone chahiye
const { 
    getWebStoryBySlug, 
    createWebStory, 
    getRecentWebStories, // <--- Ye miss ho raha tha
    getAllWebStories, // ✅ New
    deleteWebStory,   // ✅ New
    updateWebStory
} = require('../controllers/storyController');

const { protect } = require('../middleware/auth'); 

// 1. Manage Routes (Admin Only)
router.get('/admin/all', protect, getAllWebStories);
router.delete('/:id', protect, deleteWebStory);
router.put('/:id', protect, updateWebStory);

// 1. Get Recent Stories (Homepage List)
// Isse sabse upar rakhna zaroori hai taaki 'recent' ko slug na samjha jaye
router.get('/recent/all', getRecentWebStories);

// 2. Get Single Story (AMP View)
router.get('/:slug', getWebStoryBySlug);

// 3. Create Story (Admin Only)
router.post('/', protect, createWebStory);

module.exports = router;
// File: backend/models/Article.js (UPDATED: Added 'district' field)

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const articleSchema = new Schema({
    
    title_en: { 
        type: String,
        default: '' 
    },
    title_hi: { 
        type: String,
        default: '' 
    },
    summary_en: {
        type: String,
        default: ''
    },
    summary_hi: {
        type: String,
        default: ''
    },
    content_en: {
        type: String,
        default: ''
    },
    content_hi: {
        type: String,
        default: ''
    },
    urlHeadline: {
        type: String,
        default: ''
    },
    shortHeadline: {
        type: String,
        default: ''
    },
    longHeadline: {
        type: String,
        default: ''
    },
    kicker: {
        type: String,
        default: ''
    },
    keywords: {
        type: [String],
        default: []
    },
    featuredImage: {
        type: String
    },
    thumbnailCaption: {
        type: String,
        default: ''
    },
    galleryImages: {
        type: [
            {
                url: String,
                caption: String
            }
        ],
        default: []
    },
    // --- CATEGORY SECTION ---
    category: {
        type: String,
        required: true
    },
    subcategory: {
        type: String,
        default: ''
    },
    // --- !!! NEW FIELD ADDED !!! ---
    district: {
        type: String,
        default: '' // Optional, kyunki har news district ki nahi hoti
    },
    // -------------------------------
    slug: { 
        type: String,
        required: true,
        unique: true,
        index: true
    },
    author: {
        type: String,
        default: 'News Chakra'
    },
    sourceUrl: {
        type: String,
        default: null
    }
}, { timestamps: true });


// --- OverwriteModelError Fix ---
const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

module.exports = Article;
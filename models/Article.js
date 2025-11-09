// File: backend/models/Article.js (FIXED: Yeh aapki MODEL file hai)

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
    category: {
        type: String,
        required: true
    },
    subcategory: {
        type: String
    },
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


// --- !!! OverwriteModelError ka FIX YAHAN HAI !!! ---
// Yeh check karta hai ki model pehle se bana hai ya nahi.
const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

module.exports = Article;
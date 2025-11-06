// File: backend/models/Article.js (UPDATED: Tags field removed)

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const articleSchema = new Schema({
    
    // --- Aapke maujooda Dual-Language fields (Waise hi hain) ---
    title_en: { // Legacy Title fields, ab sirf internal use ke liye ya empty rahenge
        type: String,
        default: '' 
    },
    title_hi: { // Legacy Title fields, ab sirf internal use ke liye ya empty rahenge
        type: String,
        default: '' 
    },
    summary_en: {
        type: String,
        default: '' // English summary
    },
    summary_hi: {
        type: String,
        default: '' // Hindi summary
    },
    content_en: {
        type: String,
        default: '' // English content
    },
    content_hi: {
        type: String,
        default: '' // Hindi content
    },

    // --- NEW PROFESSIONAL FIELDS ---
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
    keywords: { // SEO Meta Tag Keywords (Ab iska hi use hoga)
        type: [String],
        default: []
    },
    
    // --- Media fields ---
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
    
    // --- REMOVED: Tags field has been removed ---
    // tags: {
    //     type: [String], 
    //     default: []     
    // },
    
    // --- Baaki sabhi fields (Waise hi hain) ---
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
        default: 'Madhur News'
    },
    sourceUrl: {
        type: String,
        default: null
    }
}, { timestamps: true });

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
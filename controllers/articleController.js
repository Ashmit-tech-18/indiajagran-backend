// File: backend/controllers/articleController.js (UPDATED: With District Support)

const Article = require('../models/Article');
const axios = require('axios');

// --- Helper functions (UNCHANGED) ---
const createSlug = (title) => {
    if (!title) return '';
    return title.toString().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
};
const formatTitle = (text = '') => {
    return text.replace(/\b\w/g, char => char.toUpperCase());
};


// @desc    Create a new article (UPDATED: Added district)
const createArticle = async (req, res) => {
    
    const { 
        title_en, title_hi, 
        summary_en, summary_hi, 
        content_en, content_hi, 
        category, subcategory, district, // --- Added district ---
        featuredImage, galleryImages,
        urlHeadline,
        shortHeadline,
        longHeadline,
        kicker,
        keywords,
        author,
        sourceUrl,
        thumbnailCaption
    } = req.body;

    const slugTitle = urlHeadline || longHeadline || title_en || title_hi;
    if (!slugTitle || slugTitle.trim() === '') {
         return res.status(400).json({ msg: 'At least one title (URL, Long, EN, or HI) is required to create a slug.' });
    }
    
    let slug = createSlug(slugTitle);

    try {
        const articleExists = await Article.findOne({ slug });
        if (articleExists) {
            slug = `${slug}-${Date.now()}`;
        }

        const newArticle = new Article({
            title_en: title_en || '',
            title_hi: title_hi || '',
            summary_en: summary_en || '',
            summary_hi: summary_hi || '',
            content_en: content_en || '',
            content_hi: content_hi || '',
            slug: slug,
            category,
            subcategory,
            district: district || '', // --- Saving District ---
            featuredImage,
            galleryImages: galleryImages || [],
            urlHeadline: urlHeadline || '',
            shortHeadline: shortHeadline || '',
            longHeadline: longHeadline || '',
            kicker: kicker || '',
            keywords: keywords || [],
            author: author || 'News Chakra',
            sourceUrl: sourceUrl || '',
            thumbnailCaption: thumbnailCaption || ''
        });

        const savedArticle = await newArticle.save();
        res.status(201).json(savedArticle);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all articles (UNCHANGED)
const getAllArticles = async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get single article by ID (UNCHANGED)
const getArticleById = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ msg: 'Article not found' });
        }
        res.json(article);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get single article by slug (UNCHANGED)
const getArticleBySlug = async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug });
        if (!article) {
            return res.status(404).json({ msg: 'Article not found' });
        }
        res.json(article);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


// @desc    Get articles by category (UPDATED: Handles Category, Subcategory & District)
const getArticlesByCategory = async (req, res) => {
 
    console.log("DEBUG [Backend]: Received request parameters:", req.params);

    try {
        const { category, subcategory, district } = req.params; // --- Added district ---

        // 1. Category Map Logic (UNCHANGED)
        const categoryEquivalents = {
            national: ['National', 'राष्ट्रीय'],
            world: ['World', 'विश्व'],
            politics: ['Politics', 'राजनीति'],
            business: ['Business', 'व्यापार', 'Finance', 'वित्त'],
            entertainment: ['Entertainment', 'मनोरंजन'],
            sports: ['Sports', 'खेल'],
            education: ['Education', 'शिक्षा'],
            health: ['Health', 'स्वास्थ्य'],
            tech: ['Tech', 'टेक'],
            religion: ['Religion', 'धर्म'],
            environment: ['Environment', 'पर्यावरण'],
            crime: ['Crime', 'क्राइम'],
            opinion: ['Opinion', 'विचार'],
            // Added UP specific for safer matching
            'uttar-pradesh': ['Uttar Pradesh', 'उत्तर प्रदेश']
        };

        let categoryKey = null;
        for (const key in categoryEquivalents) {
            if (categoryEquivalents[key].map(c => c.toLowerCase()).includes(category.toLowerCase())) {
                categoryKey = key;
                break;
            }
        }

        let query = {};
        if (categoryKey) {
            const names = categoryEquivalents[categoryKey];
            query = {
                $or: names.map(name => ({ category: new RegExp(`^${name}$`, 'i') }))
            };
        } else {
            query = { category: new RegExp(`^${category}$`, 'i') };
        }

        // 2. Subcategory Logic
        if (subcategory) {
            const formattedSub = subcategory.replace(/-/g, ' ');
            query.subcategory = new RegExp(`^${formattedSub}$`, 'i');
        }
        
        // --- 3. NEW: District Logic ---
        if (district) {
            const formattedDistrict = district.replace(/-/g, ' ');
            // District field me regex search (case-insensitive)
            query.district = new RegExp(`^${formattedDistrict}$`, 'i');
        }
        // ------------------------------
        
        console.log("DEBUG [Backend]: Executing query:", JSON.stringify(query));
        let articles = await Article.find(query).sort({ createdAt: -1 }).limit(20);

        // --- GNews Fallback Logic (UNCHANGED) ---
        // Note: GNews auto-fetch generally won't work well for specific districts, 
        // so we only trigger it if NO district is provided to save API calls.
        if (articles.length === 0 && !subcategory && !district && process.env.GNEWS_API_KEY) {
            res.json([]); 
            console.log(`[Non-Blocking] Sent empty response for ${category}, fetching GNews in background...`);
            fetchAndStoreNewsForCategory(category);
        } else {
            res.json(articles);
        }

    } catch (err) {
        console.error("Error in getArticlesByCategory:", err.message);
        if (!res.headersSent) res.json([]);
    }
};


// @desc    Get related articles (Supports Limit)
const getRelatedArticles = async (req, res) => {
    try {
        const { category, slug, lang, limit } = req.query; // --- Added limit param ---

        // Default limit 4 agar frontend se na aaye
        const limitNum = limit ? parseInt(limit) : 4; 

        // Category Matching Logic
        const categoryEquivalents = {
            national: ['National', 'राष्ट्रीय'],
            world: ['World', 'विश्व'],
            politics: ['Politics', 'राजनीति'],
            business: ['Business', 'व्यापार', 'Finance', 'वित्त'],
            entertainment: ['Entertainment', 'मनोरंजन'],
            sports: ['Sports', 'खेल'],
            education: ['Education', 'शिक्षा'],
            health: ['Health', 'स्वास्थ्य'],
            tech: ['Tech', 'टेक'],
            religion: ['Religion', 'धर्म'],
            environment: ['Environment', 'पर्यावरण'],
            crime: ['Crime', 'क्राइम'],
            opinion: ['Opinion', 'विचार']
        };

        let categoryKey = null;
        for (const key in categoryEquivalents) {
            if (categoryEquivalents[key].map(c => c.toLowerCase()).includes(category.toLowerCase())) {
                categoryKey = key;
                break;
            }
        }

        let categoryQuery;
        if (categoryKey) {
            const names = categoryEquivalents[categoryKey];
            categoryQuery = {
                $or: names.map(name => ({ category: new RegExp(`^${name}$`, 'i') }))
            };
        } else {
            categoryQuery = { category: new RegExp(`^${category}$`, 'i') };
        }

        let query = {
            ...categoryQuery,
            slug: { $ne: slug } 
        };

        if (lang === 'hi') {
            query.title_hi = { $ne: null, $ne: "" };
        } else {
            query.title_en = { $ne: null, $ne: "" };
        }

        const articles = await Article.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNum); // --- Using dynamic limit ---

        res.json(articles);

    } catch (error) {
        console.error('Error fetching related articles:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Get top news articles (UNCHANGED)
const getTopNews = async (req, res) => {
    try {
        const { lang } = req.query; 
        let query = {}; 

        if (lang === 'hi') {
            query.title_hi = { $ne: null, $ne: "" };
        } else {
            query.title_en = { $ne: null, $ne: "" };
        }
          
        const articles = await Article.find(query)
            .sort({ createdAt: -1 }) 
            .limit(5); 

        res.status(200).json(articles);

    } catch (error) {
        console.error('Error fetching top news:', error);
        res.status(500).json({ message: "Failed to fetch top news", error: error.message });
    }
};


// @desc    Search articles (UNCHANGED)
const searchArticles = async (req, res) => {
    try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
            return res.status(400).json({ msg: 'Search query is required' });
        }
        
        const searchRegex = new RegExp(searchQuery, 'i');
        
        const articles = await Article.find({
            $or: [
                { title_en: { $regex: searchRegex } },
                { title_hi: { $regex: searchRegex } },
                { summary_en: { $regex: searchRegex } },
                { summary_hi: { $regex: searchRegex } },
                { content_en: { $regex: searchRegex } },
                { content_hi: { $regex: searchRegex } },
                { longHeadline: { $regex: searchRegex } },
                { shortHeadline: { $regex: searchRegex } },
                { kicker: { $regex: searchRegex } },
                { keywords: { $regex: searchRegex } },
                // District search bhi add kar sakte hain
                { district: { $regex: searchRegex } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(20);
        
        res.status(200).json(articles); 

    } catch (err) {
        console.error("Search API Error:", err.message);
        res.status(200).json([]); 
    }
};

// @desc    Update an article (UPDATED: Added district)
const updateArticle = async (req, res) => {
    const { 
        title_en, title_hi, 
        summary_en, summary_hi, 
        content_en, content_hi, 
        category, subcategory, district, // --- Added district ---
        featuredImage, galleryImages,
        urlHeadline,
        shortHeadline,
        longHeadline,
        kicker,
        keywords,
        author,
        sourceUrl,
        thumbnailCaption
    } = req.body;
    
    const articleFields = {};

    const newSlugTitle = urlHeadline || longHeadline || title_en || title_hi;
    if (newSlugTitle) {
        const newSlug = createSlug(newSlugTitle);
        const existingArticle = await Article.findOne({ slug: newSlug, _id: { $ne: req.params.id } });
        if (existingArticle) {
            return res.status(400).json({ msg: 'An article with this title (slug) already exists. Please choose a different title.' });
        }
        articleFields.slug = newSlug;
    }

    if (title_en !== undefined) articleFields.title_en = title_en;
    if (title_hi !== undefined) articleFields.title_hi = title_hi;
    
    if (summary_en !== undefined) articleFields.summary_en = summary_en;
    if (summary_hi !== undefined) articleFields.summary_hi = summary_hi;
    if (content_en !== undefined) articleFields.content_en = content_en;
    if (content_hi !== undefined) articleFields.content_hi = content_hi;
    if (category) articleFields.category = category;
    if (subcategory !== undefined) articleFields.subcategory = subcategory;
    if (district !== undefined) articleFields.district = district; // --- Updating district ---
    if (featuredImage !== undefined) articleFields.featuredImage = featuredImage;
    if (galleryImages !== undefined) articleFields.galleryImages = galleryImages;

    if (urlHeadline !== undefined) articleFields.urlHeadline = urlHeadline;
    if (shortHeadline !== undefined) articleFields.shortHeadline = shortHeadline;
    if (longHeadline !== undefined) articleFields.longHeadline = longHeadline;
    if (kicker !== undefined) articleFields.kicker = kicker;
    if (keywords !== undefined) articleFields.keywords = keywords;
    if (author !== undefined) articleFields.author = author;
    if (sourceUrl !== undefined) articleFields.sourceUrl = sourceUrl;
    if (thumbnailCaption !== undefined) articleFields.thumbnailCaption = thumbnailCaption;

    try {
        let article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ msg: 'Article not found' });
        }
        article = await Article.findByIdAndUpdate(
            req.params.id,
            { $set: articleFields },
            { new: true }
        );
        res.json(article);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete an article (UNCHANGED)
const deleteArticle = async (req, res) => {
    try {
        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) {
          return res.status(404).json({ msg: 'Article not found' });
        }
        res.json({ msg: 'Article removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


// -----------------------------------------------------------------
// --- AUTO-FETCH LOGIC (UNCHANGED) ---
// -----------------------------------------------------------------
const fetchAndStoreNewsForCategory = async (category) => {
    // ... (Your existing GNews logic is here, preserved completely) ...
    let newArticlesCount = 0;
    try {
        const categoryForQuery = category.toLowerCase();
        
        let apiTopic = categoryForQuery;
        const validTopics = ['world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'];
        
        if (['national', 'politics'].includes(apiTopic)) {
            apiTopic = 'nation';
        } else if (!validTopics.includes(apiTopic)) {
            return; 
        }

        const apiParams = {
            lang: 'en', 
            country: 'in',
            topic: apiTopic,
            token: process.env.GNEWS_API_KEY,
        };

        const newsApiResponse = await axios.get(`https://gnews.io/api/v4/top-headlines`, { params: apiParams });
        const fetchedArticles = newsApiResponse.data.articles;

        for (const articleData of fetchedArticles) {
            
            const newSlug = createSlug(articleData.title);
            const existingArticle = await Article.findOne({ slug: newSlug });
            
            if (!existingArticle && articleData.image && articleData.description) {
                
                const newArticle = new Article({
                    title_en: articleData.title, 
                    title_hi: '',
                    summary_en: articleData.description,
                    summary_hi: '',
                    content_en: articleData.description + ` <br><br><a href="${articleData.url}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">Read full story...</a>`,
                    content_hi: '',
                    
                    urlHeadline: newSlug,
                    shortHeadline: articleData.title,
                    longHeadline: articleData.title,
                    kicker: '',
                    keywords: [], 
                    
                    slug: newSlug,
                    category: formatTitle(category),
                    author: articleData.source.name || 'News Chakra',
                    sourceUrl: articleData.url,
                    
                    featuredImage: articleData.image,
                    thumbnailCaption: '',
                    galleryImages: [],

                    createdAt: new Date(articleData.publishedAt),
                });
                await newArticle.save();
                newArticlesCount++;
            }
        }
        
        if (newArticlesCount > 0) {
            console.log(`[Auto-Fetch] Successfully saved ${newArticlesCount} new articles for ${category}.`);
        }

    } catch (err) {
        console.error(`[Auto-Fetch] Error fetching news for ${category}:`, err.message);
    }
};

const runGNewsAutoFetch = async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled GNews auto-fetch job...`);
    const categoriesToFetch = ['National', 'World', 'Politics', 'Business', 'Entertainment', 'Sports', 'Education', 'Health', 'Tech', 'Religion', 'Environment','Crime', 'Opinion'];
    for (const category of categoriesToFetch) {
        await fetchAndStoreNewsForCategory(category);
    }
    console.log(`[${new Date().toISOString()}] GNews fetch job complete.`);
};


// -----------------------------------------------------------------
// --- SITEMAP GENERATOR (UNCHANGED) ---
// -----------------------------------------------------------------
const generateSitemap = async (req, res) => {
    const staticCategories = [
        'national', 'politics', 'business', 'finance', 'entertainment', 'sports', 'world', 'education', 'health', 'tech', 'religion', 'environment', 'crime', 'opinion'
    ];
    const staticPages = [
        '', 'about', 'contact', 'privacy-policy', 'terms-condition', 'subscribe'
    ];
    
    try {
        const baseUrl = process.env.FRONTEND_URL;
        if (!baseUrl) {
            return res.status(500).send('Server Error: FRONTEND_URL is not defined in .env');
        }

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        
        const today = new Date().toISOString();

        staticPages.forEach(page => {
            xml += '<url>';
            xml += `<loc>${baseUrl}/${page}</loc>`;
            xml += `<lastmod>${today}</lastmod>`;
            xml += `<priority>${page === '' ? '1.0' : '0.8'}</priority>`;
            xml += '</url>';
        });
        
        staticCategories.forEach(category => {
            xml += '<url>';
            xml += `<loc>${baseUrl}/category/${category}</loc>`;
            xml += `<lastmod>${today}</lastmod>`;
            xml += '<priority>0.9</priority>';
            xml += '</url>';
        });

        const articles = await Article.find().select('slug createdAt').sort({ createdAt: -1 });

        articles.forEach(article => {
            xml += '<url>';
            xml += `<loc>${baseUrl}/article/${article.slug}</loc>`;
            xml += `<lastmod>${article.createdAt.toISOString()}</lastmod>`;
            xml += '<priority>0.7</priority>';
            xml += '</url>';
        });

        xml += '</urlset>';
        
        res.header('Content-Type', 'application/xml');
        res.send(xml);

    } catch (err) {
        console.error('Error generating sitemap:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
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
    runGNewsAutoFetch,
    generateSitemap
};
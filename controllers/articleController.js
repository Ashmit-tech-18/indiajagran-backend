// File: backend/controllers/articleController.js (FIXED: getRelatedArticles mein category logic add kiya gaya)

const Article = require('../models/Article');
const axios = require('axios');

// --- Helper functions (Koi change nahi) ---
const createSlug = (title) => {
    if (!title) return '';
    return title.toString().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
};
const formatTitle = (text = '') => {
    return text.replace(/\b\w/g, char => char.toUpperCase());
};
// --- End of Helper functions ---


// @desc    Create a new article (Koi change nahi)
const createArticle = async (req, res) => {
    // ... (Aapka poora 'createArticle' function waisa hi hai) ...
    
    const { 
        title_en, title_hi, 
        summary_en, summary_hi, 
        content_en, content_hi, 
        category, subcategory, featuredImage, galleryImages,
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

// @desc    Get all articles (Koi change nahi)
const getAllArticles = async (req, res) => {
    // ... (Aapka poora 'getAllArticles' function waisa hi hai) ...
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get single article by ID (Koi change nahi)
const getArticleById = async (req, res) => {
    // ... (Aapka poora 'getArticleById' function waisa hi hai) ...
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

// @desc    Get single article by slug (Koi change nahi)
const getArticleBySlug = async (req, res) => {
    // ... (Aapka poora 'getArticleBySlug' function waisa hi hai) ...
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


// @desc    Get articles by category (Koi change nahi)
const getArticlesByCategory = async (req, res) => {
 
    console.log("DEBUG [Backend]: Received request parameters:", req.params);

    try {
        const { category, subcategory } = req.params;

        // --- !!! YEH HAI AAPKA NAYA FIX !!! ---
        
        // 1. Sabhi categories aur unke Hindi/English naamo ka map
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

        // 2. URL se aayi category (jaise "राष्ट्रीय") ka English key (jaise "national") dhoondhein
        let categoryKey = null;
        for (const key in categoryEquivalents) {
            // Check if the URL param (e.g., " राष्ट्रीय") is in any of the arrays
            if (categoryEquivalents[key].map(c => c.toLowerCase()).includes(category.toLowerCase())) {
                categoryKey = key;
                break;
            }
        }

        // 3. Database query banayein
        let query = {};
        if (categoryKey) {
            // Agar category match hui (e.g., "national"), toh uske saare naam (['National', 'राष्ट्रीय']) lein
            const names = categoryEquivalents[categoryKey];
            
            // Ek $or query banayein jo database mein 'National' YA 'राष्ट्रीय' dono ko dhoondhe
            query = {
                $or: names.map(name => ({ category: new RegExp(`^${name}$`, 'i') }))
            };
        } else {
            // Agar koi anjaan category aayi hai, toh usey hi dhoondh lein
            query = { category: new RegExp(`^${category}$`, 'i') };
        }
        // --- NAYA FIX END ---


        // --- Aapka subcategory logic (ab naye query ke saath kaam karega) ---
        if (subcategory) {
            const formattedSub = subcategory.replace(/-/g, ' ');
            // Query mein subcategory ko bhi add kar dein
            query.subcategory = new RegExp(`^${formattedSub}$`, 'i');
        }
        // --- Subcategory logic End ---
        
        console.log("DEBUG [Backend]: Executing query:", JSON.stringify(query));
        let articles = await Article.find(query).sort({ createdAt: -1 }).limit(20);

        // --- Aapka GNews logic (Koi change nahi) ---
        if (articles.length === 0 && !subcategory && process.env.GNEWS_API_KEY) {
            
            res.json([]); 
            console.log(`[Non-Blocking] Sent empty response for ${category}, fetching GNews in background...`);
            fetchAndStoreNewsForCategory(category);
            
        } else {
            res.json(articles);
        }

    } catch (err) {
        console.error("Error in getArticlesByCategory:", err.message);
        if (err.response) {
            console.error("GNews API Error Response:", err.response.data);
        } else {
            console.error("GNews Error (No Response):", err);
        }
        
        if (!res.headersSent) {
            try {
                // 'query' variable abhi bhi scope mein hai aur sahi hai
                const articlesFromDb = await Article.find(query).sort({ createdAt: -1 }).limit(20);
                res.json(articlesFromDb);
            } catch (dbErr) {
                res.json([]);
            }
        }
    }
};


// --- !!! YAHAN BADLAAV KIYA GAYA HAI !!! ---
// @desc    Get 4 related articles (FIXED: Category logic add kiya gaya)
const getRelatedArticles = async (req, res) => {
    try {
        const { category, slug, lang } = req.query;

        // --- !!! YAHAN FIX ADD KIYA GAYA HAI !!! ---
        // Wahi category map jo getArticlesByCategory me use hota hai
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

        // URL se aayi category (jaise "National" ya "राष्ट्रीय") ka English key (jaise "national") dhoondhein
        let categoryKey = null;
        for (const key in categoryEquivalents) {
            if (categoryEquivalents[key].map(c => c.toLowerCase()).includes(category.toLowerCase())) {
                categoryKey = key;
                break;
            }
        }

        let categoryQuery;
        if (categoryKey) {
            // Agar category match hui (e.g., "national"), toh uske saare naam (['National', 'राष्ट्रीय']) lein
            const names = categoryEquivalents[categoryKey];
            // Ek $or query banayein jo database mein 'National' YA 'राष्ट्रीय' dono ko dhoondhe
            categoryQuery = {
                $or: names.map(name => ({ category: new RegExp(`^${name}$`, 'i') }))
            };
        } else {
            // Agar koi anjaan category aayi hai, toh usey hi dhoondh lein
            categoryQuery = { category: new RegExp(`^${category}$`, 'i') };
        }
        // --- FIX END ---

        // Ab main query banayein
        let query = {
            ...categoryQuery, // Yahan category ki query add ki
            slug: { $ne: slug } // Current article ko exclude karein
        };

        // Language filter
        if (lang === 'hi') {
            query.title_hi = { $ne: null, $ne: "" };
        } else {
            query.title_en = { $ne: null, $ne: "" };
        }

        const articles = await Article.find(query)
            .sort({ createdAt: -1 })
            .limit(4); // Sirf 4 articles

        res.json(articles);

    } catch (error) {
        console.error('Error fetching related articles:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
// --- !!! BADLAAV KHATM HUA !!! ---


// @desc    Get top news articles (for sidebar) (Koi change nahi)
const getTopNews = async (req, res) => {
    try {
        const { lang } = req.query; // language ko query se lein ('hi' or 'en')

        let query = {}; // Basic query

        // Language filter (bilkul 'getRelatedArticles' jaisa)
        if (lang === 'hi') {
            // Agar hindi hai, toh woh articles laao jinka title_hi khali nahi hai
            query.title_hi = { $ne: null, $ne: "" };
        } else {
            // English (default) ke liye, woh articles laao jinka title_en khali nahi hai
            query.title_en = { $ne: null, $ne: "" };
        }
          
        // Database se 5 sabse naye articles fetch karein
        const articles = await Article.find(query)
            .sort({ createdAt: -1 }) // Sabse naye upar
            .limit(5); // Sirf 5 articles (sidebar ke liye)

        res.status(200).json(articles);

    } catch (error) {
        console.error('Error fetching top news:', error);
        res.status(500).json({ message: "Failed to fetch top news", error: error.message });
    }
};


// @desc    Search articles (Koi change nahi)
const searchArticles = async (req, res) => {
    // ... (Aapka poora 'searchArticles' function waisa hi hai) ...
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
                { keywords: { $regex: searchRegex } }
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

// @desc    Update an article (Koi change nahi)
const updateArticle = async (req, res) => {
    // ... (Aapka poora 'updateArticle' function waisa hi hai) ...
    
    const { 
        title_en, title_hi, 
        summary_en, summary_hi, 
        content_en, content_hi, 
        category, subcategory, featuredImage, galleryImages,
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

// @desc    Delete an article (Koi change nahi)
const deleteArticle = async (req, res) => {
    // ... (Aapka poora 'deleteArticle' function waisa hi hai) ...
    try {
        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) {
          return res.status(4404).json({ msg: 'Article not found' });
        }
        res.json({ msg: 'Article removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


// -----------------------------------------------------------------
// --- AUTO-FETCH LOGIC (GNEWS) (Koi change nahi) ---
// -----------------------------------------------------------------
const fetchAndStoreNewsForCategory = async (category) => {
    // ... (Aapka poora 'fetchAndStoreNewsForCategory' function waisa hi hai) ...
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
            } else if (existingArticle) {
                // console.log(`[Auto-Fetch] Skipping duplicate article (slug exists): ${newSlug}`);
            }
        }
        
        if (newArticlesCount > 0) {
            console.log(`[Auto-Fetch] Successfully saved ${newArticlesCount} new articles for ${category}.`);
        }

    } catch (err) {
        console.error(`[Auto-Fetch] Error fetching news for ${category}:`);
        if (err.response) {
            console.error("GNews API Error Response:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("GNews Error (No Response):", err.message);
        }
    }
};

const runGNewsAutoFetch = async () => {
    // ... (Aapka poora 'runGNewsAutoFetch' function waisa hi hai) ...
    console.log(`[${new Date().toISOString()}] Running scheduled GNews auto-fetch job...`);
    const categoriesToFetch = ['National', 'World', 'Politics', 'Business', 'Entertainment', 'Sports', 'Education', 'Health', 'Tech', 'Religion', 'Environment','Crime', 'Opinion'];
    for (const category of categoriesToFetch) {
        await fetchAndStoreNewsForCategory(category);
    }
    console.log(`[${new Date().toISOString()}] GNews fetch job complete.`);
};


// -----------------------------------------------------------------
// --- SITEMAP GENERATOR FUNCTION (Koi change nahi) ---
// -----------------------------------------------------------------
const generateSitemap = async (req, res) => {
    // ... (Aapka poora 'generateSitemap' function waisa hi hai) ...
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

// --- EXPORT BLOCK (Koi change nahi) ---
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
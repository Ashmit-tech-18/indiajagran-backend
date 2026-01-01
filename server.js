const compression = require('compression');
const storyRoutes = require('./routes/storyRoutes');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');
const rssRoutes = require('./routes/rssRoutes');

// --- Controllers & Models ---
// ✅ IMPORTANT: generateSitemap yahan import hai, hum iska hi use karenge
const { generateSitemap, runGNewsAutoFetch } = require('./controllers/articleController'); 
const Article = require('./models/Article'); 

// --- Optimization & Logging ---
const morgan = require('morgan');
const logger = require('./utils/logger');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Helper to Optimize Cloudinary Images for Bots ---
const getOptimizedUrl = (url) => {
    if (!url) return null;
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
        if (!url.includes('q_auto') && !url.includes('f_auto')) {
            // Optimize: Quality Auto, Format Auto, Width 1200px
            return url.replace('/upload/', '/upload/q_auto,f_auto,w_1200/');
        }
    }
    return url;
};

// =======================================================================
// ✅ SITEMAP ROUTE (FIXED)
// =======================================================================
// Purana manual code hata diya jo galat data de raha tha.
// Ab hum controller ka sahi logic use kar rahe hain jo sirf Published articles dega.

// 1. Standard Route (Google yahan check karega)
app.get('/sitemap.xml', generateSitemap);


// 2. API Route (Backup ke liye)
app.get('/api/articles/sitemap', generateSitemap);


// --- Middleware ---
app.use(compression());
app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));

// =======================================================================
// CORS CONFIGURATION
// =======================================================================
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

// =======================================================================
// KEEP-ALIVE PING ROUTE
// =======================================================================
app.get('/ping', (req, res) => {
    res.status(200).send('Pong - Server is Awake!');
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static Files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// =======================================================================
// 🧪 TEST ROUTE: Force GNews Update
// =======================================================================
app.get('/api/force-update-news', async (req, res) => {
    try {
        console.log("Manually triggering GNews Fetch...");
        await runGNewsAutoFetch(); 
        res.send("✅ GNews Fetch Triggered Successfully! Check Render Logs for details.");
    } catch (error) {
        console.error("Manual Update Failed:", error);
        res.status(500).send(`Update Failed: ${error.message}`);
    }
});

// ===========================================================================
// MAGIC ROUTE (Updated with Image Optimization & WWW Fix)
// ===========================================================================

app.get('/article/:slug', async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const cleanSlug = req.params.slug; 
    
    // ✅ FIX 1: Humne ?r=1 wali line hata di hai. Ab koi faltu redirect nahi hoga.
    const queryParams = new URLSearchParams(req.query);
    const isHindi = queryParams.get('lang') === 'hi'; // Agar URL me ?lang=hi hai
    
    const isBot = /facebookexternalhit|twitterbot|whatsapp|linkedinbot|telegrambot|bot|googlebot|bingbot|yandex|slurp|duckduckgo/i.test(userAgent);

    try {
        const article = await Article.findOne({ slug: cleanSlug });
        const baseUrl = process.env.FRONTEND_URL || 'https://indiajagran.com';

        // Agar article nahi mila, to Homepage par bhej do
        if (!article) {
            return isBot ? res.status(404).send('Article not found') : res.redirect(baseUrl);
        }

        // ✅ DYNAMIC LANGUAGE LOGIC
        // Agar ?lang=hi hai, to Hindi title uthao, nahi to English
        const title = isHindi 
            ? (article.title_hi || article.longHeadline || article.title_en)
            : (article.longHeadline || article.title_en || article.title_hi);

        const rawSummary = isHindi
            ? (article.summary_hi || article.content_hi || article.summary_en || '')
            : (article.summary_en || article.content_en || '');

        const summary = rawSummary.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...';
        
        let image = article.featuredImage || `${baseUrl}/logo192.png`;
        if (image && !image.startsWith('http')) {
            image = `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
        }
        image = getOptimizedUrl(image);

        // ✅ URL handling for Canonical
        const canonicalUrl = `${baseUrl}/article/${cleanSlug}${isHindi ? '?lang=hi' : ''}`;

        if (isBot) {
            const html = `
                <!DOCTYPE html>
                <html lang="${isHindi ? 'hi' : 'en'}">
                <head>
                    <meta charset="UTF-8">
                    <title>${title}</title>
                    <meta name="description" content="${summary}" />
                    
                    <meta property="og:locale" content="${isHindi ? 'hi_IN' : 'en_US'}" />
                    <meta property="og:type" content="article" />
                    <meta property="og:title" content="${title}" />
                    <meta property="og:description" content="${summary}" />
                    <meta property="og:image" content="${image}" />
                    <meta property="og:url" content="${canonicalUrl}" />
                    
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="${title}" />
                    <meta name="twitter:description" content="${summary}" />
                    <meta name="twitter:image" content="${image}" />
                    
                    <link rel="canonical" href="${canonicalUrl}" /> 
                </head>
                <body>
                    <h1>${title}</h1>
                    <img src="${image}" alt="${title}" />
                    <p>${summary}</p>
                </body>
                </html>
            `;
            return res.send(html);
        }

        // User Handling
        // Agar user ?lang=hi ke sath aaya hai, to wahi pass karo
        let redirectUrl = `${baseUrl}/article/${cleanSlug}`;
        if (isHindi) redirectUrl += `?lang=hi`;

        return res.redirect(redirectUrl);

    } catch (error) {
        console.error('Magic Route Error:', error);
        return res.redirect('https://indiajagran.com');
    }
});

// --- API Routes ---
app.use('/api', rssRoutes);
app.use('/web-stories', storyRoutes);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/subscriber', require('./routes/subscribers'));

// --- Error Handling ---
app.use((err, req, res, next) => {
    logger.error(err.message);
    console.error(err);
    res.status(500).json({ message: 'Server Error', error: err.message });
});

// --- Database Connection ---
const dbModule = require('./config/db');
let connectDB;
if (typeof dbModule === 'function') connectDB = dbModule;
else if (dbModule && typeof dbModule.connectDB === 'function') connectDB = dbModule.connectDB;

if (connectDB) connectDB();

// --- Cron Jobs ---
cron.schedule('*/1 * * * *', async () => {
    try {
        const now = new Date();
        const result = await Article.updateMany(
            { status: 'scheduled', publishedAt: { $lte: now } },
            { $set: { status: 'published', updatedAt: now } }
        );
        if (result.modifiedCount > 0) logger.info(`Published ${result.modifiedCount} scheduled articles.`);
    } catch (error) {
        logger.error('Error publishing scheduled articles:', error);
    }
});

// GNews Auto Fetch (Every 4 hours)
cron.schedule('0 */4 * * *', async () => {
    try {
        logger.info('⏰ Starting GNews Auto Fetch...');
        await runGNewsAutoFetch();
        logger.info('✅ GNews Auto Fetch Complete.');
    } catch (error) {
        logger.error('❌ GNews Auto Fetch Failed:', error);
    }
});

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
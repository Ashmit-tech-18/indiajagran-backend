const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');

// --- Controllers & Models ---
const { generateSitemap, runGNewsAutoFetch } = require('./controllers/articleController'); 
const Article = require('./models/Article'); 

// --- Optimization & Logging ---
const compression = require('compression');
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
// SITEMAP ROUTE
// =======================================================================
app.get('/api/articles/sitemap', async (req, res) => {
    logger.info("Sitemap generation request received.");
    try {
        const articles = await Article.find({}, 'slug updatedAt createdAt');
        const baseUrl = process.env.FRONTEND_URL || 'https://www.indiajagran.com';
        
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        sitemap += `
            <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
            <url><loc>${baseUrl}/about</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
            <url><loc>${baseUrl}/contact</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
        `;

        articles.forEach(article => {
            let dateString = article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString(); 
            if (article.slug) {
                sitemap += `
                <url>
                    <loc>${baseUrl}/article/${article.slug}</loc>
                    <lastmod>${dateString}</lastmod>
                    <changefreq>weekly</changefreq>
                    <priority>0.8</priority>
                </url>`;
            }
        });

        sitemap += '</urlset>';
        logger.info("Sitemap generated successfully.");
        
        res.header('Content-Type', 'application/xml');
        res.send(sitemap);

    } catch (e) {
        logger.error("SITEMAP ROUTE CRASH:", e);
        res.status(500).send("Sitemap generation failed due to server error.");
    }
});

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
// 🧪 TEST ROUTE: Force GNews Update (Isse browser me khol kar check karein)
// =======================================================================
app.get('/api/force-update-news', async (req, res) => {
    try {
        console.log("Manually triggering GNews Fetch...");
        await runGNewsAutoFetch(); // Ye function call karega
        res.send("✅ GNews Fetch Triggered Successfully! Check Render Logs for details.");
    } catch (error) {
        console.error("Manual Update Failed:", error);
        res.status(500).send(`Update Failed: ${error.message}`);
    }
});

// ===========================================================================
// MAGIC ROUTE (Updated with Image Optimization)
// ===========================================================================
app.get('/article/:slug', async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const cleanSlug = req.params.slug; 
    const queryParams = new URLSearchParams(req.query);
    queryParams.set('r', '1'); 
    
    const isBot = /facebookexternalhit|twitterbot|whatsapp|linkedinbot|telegrambot/i.test(userAgent);

    try {
        const article = await Article.findOne({ slug: cleanSlug });

        if (!article) {
            return isBot ? res.status(404).send('Article not found') : res.redirect('https://indiajagran.com');
        }

        const title = article.longHeadline || article.title || 'India Jagran';
        const summary = (article.summary || article.content || '').replace(/<[^>]*>?/gm, '').substring(0, 160) + '...';
        
        const baseUrl = process.env.FRONTEND_URL || 'https://www.indiajagran.com';
        
        let image = article.featuredImage || `${baseUrl}/logo192.png`;
        
        // 1. Fix relative paths
        if (image && !image.startsWith('http')) {
            image = `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
        }

        // 2. 🔥 Optimize Image for Bots (Cloudinary)
        image = getOptimizedUrl(image);

        const frontendUrl = `${baseUrl}/article/${cleanSlug}?${queryParams.toString()}`;
        const canonicalUrl = `${baseUrl}/article/${cleanSlug}`;

        if (isBot) {
            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta property="og:type" content="article" />
                    <meta property="og:title" content="${title}" />
                    <meta property="og:description" content="${summary}" />
                    <meta property="og:image" content="${image}" />
                    <meta property="og:url" content="${canonicalUrl}" />
                    <meta property="og:site_name" content="India Jagran" />
                    <link rel="canonical" href="${canonicalUrl}" /> 
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="${title}" />
                    <meta name="twitter:image" content="${image}" />
                </head>
                <body><h1>${title}</h1><img src="${image}" /><p>${summary}</p></body>
                </html>
            `;
            return res.send(html);
        }
        return res.redirect(frontendUrl);
    } catch (error) {
        console.error('Magic Route Error:', error);
        return res.redirect('https://indiajagran.com');
    }
});

// --- API Routes ---
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
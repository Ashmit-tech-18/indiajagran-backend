// File: backend/server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron'); 
const path = require('path'); 

// --- 🔥 IMPORT: Sitemap Controller ---
const { generateSitemap } = require('./controllers/articleController'); 

// --- 1. Import Optimization & Logging Libraries ---
const compression = require('compression'); 
const morgan = require('morgan');
const logger = require('./utils/logger'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- 2. Apply Compression (Speed Booster 🚀) ---
app.use(compression());

// --- 3. Apply Logging (Debug Booster 🐞) ---
app.use(morgan('dev', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// --- 4. CORS CONFIG ---
const allowedOrigins = [
    'https://indiajagran.com',       
    'https://www.indiajagran.com', 
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json()); 
app.use('/uploads', express.static('uploads'));

// --- 5. Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info("MongoDB Connected Successfully"))
    .catch(err => logger.error("MongoDB Connection Failed: " + err.message));

// --- 6. Import Routes ---
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const contactRoutes = require('./routes/contact');

// --- 🔥 FIXED: Sitemap Route at Root Level ---
// यह अब https://indiajagran.com/sitemap.xml पर खुलेगा
app.get('/sitemap.xml', generateSitemap); 

// --- 7. Use Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/contact', contactRoutes);

// --- Magic Route for Social Share Redirects ---
app.get('/news/:slug', async (req, res) => {
    try {
        const Article = require('./models/Article'); 
        const article = await Article.findOne({ slug: req.params.slug });

        const frontendUrl = `${process.env.FRONTEND_URL}/news/${req.params.slug}`;
        
        if (!article) {
             return res.redirect(process.env.FRONTEND_URL);
        }

        const title = article.longHeadline || article.title_en || 'India Jagran News';
        const description = article.summary_en || 'Latest news updates.';
        const image = article.featuredImage || 'https://indiajagran.com/logo192.png';

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${title}</title>
                
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${image}" />
                <meta property="og:type" content="article" />
                
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${description}" />
                <meta name="twitter:image" content="${image}" />

                <script>
                    window.location.href = "${frontendUrl}";
                </script>
            </head>
            <body>
                <p>Redirecting to article... <a href="${frontendUrl}">Click here</a></p>
            </body>
            </html>
        `;
        res.send(html);

    } catch (error) {
        logger.error(`Magic Route Error: ${error.message}`);
        res.status(500).send('Server Error');
    }
});

// --- ROOT ROUTE ---
app.get('/', (req, res) => {
    res.send('India Jagran Backend is Running Successfully! 🚀');
});

// --- Global Error Handling ---
app.use((err, req, res, next) => {
    logger.error(err.message); 
    console.error(err); 
    res.status(500).json({ message: 'Server Error', error: err.message });
});

// --- Start Server ---
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
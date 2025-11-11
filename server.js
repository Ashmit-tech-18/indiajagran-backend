// File: backend/server.js
// (UPDATED: Domain changed to India Jagran)

const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron'); 

dotenv.config();

const app = express();

// -----------------------------------------------------------------
// --- CORS CONFIG (Updated for India Jagran) ---
// -----------------------------------------------------------------
const allowedOrigins = [
    'https://indiajagran.com',       
    'https://www.indiajagran.com', 
    'http://localhost:3000'         
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// -----------------------------------------------------------------
// --- CORS CONFIG END ---
// -----------------------------------------------------------------

// Middleware
app.use(express.json());

// PORT
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and then start the server
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('MongoDB Connected successfully!');
    
    // --- Routes Load ---
    const authRoutes = require('./routes/auth');
    const articleRoutes = require('./routes/articles');
    const uploadRoutes = require('./routes/upload');
    const subscriberRoutes = require('./routes/subscribers');
    const contactRoutes = require('./routes/contact');
    
    // --- Analytics Route Load ---
    const analyticsRoutes = require('./routes/analytics'); 
    // ------------------------------------------------

    const { runGNewsAutoFetch } = require('./controllers/articleController');
    
    // --- Routes Register ---
    app.use('/api/auth', authRoutes);
    app.use('/api/articles', articleRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/subscribers', subscriberRoutes);
    app.use('/api/contact', contactRoutes);

    // --- Use Analytics Route ---
    app.use('/api/analytics', analyticsRoutes);
    // -----------------------------------------------

    // Server Start
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
    
    console.log('Setting up GNews auto-fetch job...');
    
    cron.schedule('0 * * * *', () => {
        runGNewsAutoFetch();
    });

})
.catch(err => {
    // --- Error Logging ---
    if (err.name === 'OverwriteModelError') {
        console.error('SERVER STARTUP FAILED: Model Overwrite Error.');
        console.error('Please check your model files (e.g., Article.js) for the fix.');
        console.error(err);
    } else {
        console.error('CRITICAL: Failed to connect to MongoDB', err);
    }
    process.exit(1);
});
// File: backend/server.js
// (FIXED: Connection order AND better logging)

const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron'); 

dotenv.config();

const app = express();

// -----------------------------------------------------------------
// --- CORS CONFIG (Aapka original code, bilkul sahi hai) ---
// -----------------------------------------------------------------
const allowedOrigins = [
    'https://newschakra.live',       
    'https://newschakra.netlify.app', 
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
// --- CORS FIX KHATM HUA ---
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
    
    // --- !!! FIX: Routes ko connection ke BAAD load karein !!! ---
    const authRoutes = require('./routes/auth');
    const articleRoutes = require('./routes/articles');
    const uploadRoutes = require('./routes/upload');
    const subscriberRoutes = require('./routes/subscribers');
    const contactRoutes = require('./routes/contact');
    
    const { runGNewsAutoFetch } = require('./controllers/articleController');
    
    // --- Sabhi routes ko yahan use karein ---
    app.use('/api/auth', authRoutes);
    app.use('/api/articles', articleRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/subscribers', subscriberRoutes);
    app.use('/api/contact', contactRoutes);
    // --- FIX END ---

    // Server ko yahan start karein
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
    
    console.log('Setting up GNews auto-fetch job...');
    
    cron.schedule('0 * * * *', () => {
        runGNewsAutoFetch();
    });

})
.catch(err => {
    // --- !!! BETTER ERROR LOGGING !!! ---
    // Ab yeh "Failed to connect" nahi dikhayega agar problem baad mein aati hai.
    if (err.name === 'OverwriteModelError') {
        console.error('SERVER STARTUP FAILED: Model Overwrite Error.');
        console.error('Please check your model files (e.g., Article.js) for the fix.');
        console.error(err);
    } else {
        console.error('CRITICAL: Failed to connect to MongoDB', err);
    }
    process.exit(1);
});
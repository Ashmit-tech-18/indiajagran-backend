const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    visitorId: { type: String, required: true }, // User ka unique ID (Browser se)
    pageUrl: { type: String, required: true },
    category: { type: String, default: 'Home' },
    device: { type: String, default: 'Desktop' },
    ipAddress: { type: String },
    visitedAt: { type: Date, default: Date.now },
    lastHeartbeat: { type: Date, default: Date.now } // Time spent track karne ke liye
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
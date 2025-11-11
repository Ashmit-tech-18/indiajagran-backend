// File: backend/controllers/analyticsController.js (FIXED: ReferenceError Solved)

const Analytics = require('../models/Analytics');

// 1. Track Visit
const trackVisit = async (req, res) => {
    try {
        const { visitorId, pageUrl, category, device } = req.body;
        
        // Check duplicate session (30 min logic)
        const sessionDuration = 30 * 60 * 1000; 
        const timeLimit = new Date(Date.now() - sessionDuration);

        const existingVisit = await Analytics.findOne({
            visitorId: visitorId,
            pageUrl: pageUrl,
            visitedAt: { $gte: timeLimit }
        });

        if (existingVisit) {
            // Purana session hai, heartbeat update kar do
            existingVisit.lastHeartbeat = new Date();
            await existingVisit.save();
            return res.status(200).json({ visitId: existingVisit._id, isNew: false });
        }

        // Naya visit
        const newVisit = new Analytics({
            visitorId,
            pageUrl,
            category: category || 'Home',
            device,
            ipAddress: req.ip
        });
        
        const savedVisit = await newVisit.save();
        res.status(201).json({ visitId: savedVisit._id, isNew: true });

    } catch (error) {
        console.error("Tracking Error:", error.message);
        res.status(500).json({ msg: "Tracking failed" });
    }
};

// 2. Heartbeat
const updateHeartbeat = async (req, res) => {
    try {
        const { visitId } = req.body;
        if(visitId) {
            await Analytics.findByIdAndUpdate(visitId, { lastHeartbeat: new Date() });
        }
        res.status(200).send('OK');
    } catch (error) {
        res.status(500).send('Error');
    }
};

// 3. Get Stats
const getAnalyticsStats = async (req, res) => {
    try {
        // A. Total Page Views
        const totalVisits = await Analytics.countDocuments();

        // B. Unique Visitors
        const uniqueVisitorsList = await Analytics.distinct('visitorId');
        const uniqueVisitors = uniqueVisitorsList.length;

        // C. Active Users (Last 5 mins)
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeUsersCount = await Analytics.distinct('visitorId', { lastHeartbeat: { $gte: fiveMinAgo } });

        // D. Top Categories
        const topCategories = await Analytics.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // E. Avg Time
        const durationData = await Analytics.aggregate([
            { $project: { duration: { $subtract: ["$lastHeartbeat", "$visitedAt"] } } },
            { $group: { _id: null, avgDuration: { $avg: "$duration" } } }
        ]);
        const avgTimeSeconds = durationData.length > 0 ? Math.round(durationData[0].avgDuration / 1000) : 0;

        res.json({
            totalVisits,
            uniqueVisitors,
            activeUsers: activeUsersCount.length,
            topCategories,
            avgTimeSeconds
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ msg: "Server Error" });
    }
};

// 4. Log Exit
const logExit = async (req, res) => {
    try {
        const { visitId } = req.body;
        if(visitId) {
            // Time ko 10 min peeche kar do taaki wo active list se hat jaye
            const pastTime = new Date(Date.now() - 10 * 60 * 1000);
            await Analytics.findByIdAndUpdate(visitId, { lastHeartbeat: pastTime });
        }
        res.status(200).send('Exit logged');
    } catch (error) {
        // Silent fail for beacon
        res.status(200).send('Error'); 
    }
};

// --- CORRECT EXPORT ---
module.exports = {
    trackVisit,
    updateHeartbeat,
    getAnalyticsStats,
    logExit 
};
const express = require('express');
const router = express.Router();
const { trackVisit, updateHeartbeat, getAnalyticsStats, logExit } = require('../controllers/analyticsController');

router.post('/track', trackVisit);
router.post('/heartbeat', updateHeartbeat);
router.get('/stats', getAnalyticsStats);

router.post('/leave', logExit);

module.exports = router;
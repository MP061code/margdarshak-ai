const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Route is guarded by standard JWT middleware, with role check done in the controller
router.get('/stats', authMiddleware, getStats);

const { activateEmergency, clearEmergency } = require('../controllers/adminController');
router.post('/emergency', authMiddleware, activateEmergency);
router.post('/emergency/clear', authMiddleware, clearEmergency);

module.exports = router;

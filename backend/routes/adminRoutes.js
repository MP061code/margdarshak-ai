const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Route is guarded by standard JWT middleware, with role check done in the controller
router.get('/stats', authMiddleware, getStats);

module.exports = router;

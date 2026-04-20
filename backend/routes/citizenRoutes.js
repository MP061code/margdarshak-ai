const express = require('express');
const router = express.Router();
const { reportIssue, getReports, uploadMiddleware } = require('../controllers/citizenController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/report', authMiddleware, uploadMiddleware, reportIssue);
router.get('/report', authMiddleware, getReports);

module.exports = router;

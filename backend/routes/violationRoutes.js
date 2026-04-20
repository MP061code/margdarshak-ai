const express = require('express');
const router = express.Router();
const { getViolations, createViolation } = require('../controllers/violationController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getViolations);
router.post('/', authMiddleware, createViolation);

module.exports = router;

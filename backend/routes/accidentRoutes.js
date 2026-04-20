const express = require('express');
const router = express.Router();
const { reportAccident, getAccidents, deleteAccident } = require('../controllers/accidentController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/accidents/report
router.post('/report', authMiddleware, reportAccident);

// GET /api/accidents
router.get('/', authMiddleware, getAccidents);

// DELETE /api/accidents/:id
router.delete('/:id', authMiddleware, deleteAccident);

module.exports = router;

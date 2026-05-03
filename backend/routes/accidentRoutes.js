const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { reportAccident, getAccidents, deleteAccident } = require('../controllers/accidentController');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// POST /api/accidents/report
router.post('/report', authMiddleware, upload.single('image'), reportAccident);

// GET /api/accidents
router.get('/', authMiddleware, getAccidents);

// DELETE /api/accidents/:id
router.delete('/:id', authMiddleware, deleteAccident);

module.exports = router;

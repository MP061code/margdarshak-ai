const express = require('express');
const router = express.Router();
const { getParking, updateParking } = require('../controllers/parkingController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getParking);
router.post('/update', authMiddleware, updateParking);

module.exports = router;

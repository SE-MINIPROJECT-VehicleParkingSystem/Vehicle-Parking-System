const express = require('express');
const { recordExit } = require('../controllers/exitController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireRole('Staff', 'Admin'), recordExit);

module.exports = router;
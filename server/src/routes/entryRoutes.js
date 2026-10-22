const express = require('express');
const { recordEntry } = require('../controllers/entryController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireRole('Staff', 'Admin'), recordEntry);

module.exports = router;
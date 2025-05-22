const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming you have auth middleware
const { updateUserSettings, getUserDetails } = require('../controllers/userController');

// @route   PUT api/users/settings
// @desc    Update user settings (e.g., monthly budget)
// @access  Private
router.put('/settings', auth, updateUserSettings);

// @route   GET api/users/me
// @desc    Get current logged-in user details
// @access  Private
router.get('/me', auth, getUserDetails);

module.exports = router;
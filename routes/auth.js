const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

// Login
router.post(
	'/login',
	[
		body('email').isEmail().normalizeEmail(),
		body('password').isLength({ min: 6 }),
	],
	authController.login,
);

// Register (optional)
router.post(
	'/register',
	[
		body('email').isEmail().normalizeEmail(),
		body('password').isLength({ min: 6 }),
	],
	authController.register,
);

// Get current admin (protected)
router.get('/me', auth, authController.getCurrentAdmin);

module.exports = router;

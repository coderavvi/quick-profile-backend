const express = require('express');
const { body, validationResult } = require('express-validator');
const clientController = require('../controllers/clientController');
const auth = require('../middleware/auth');
const upload = require('../config/cloudinary');

const router = express.Router();

// Middleware to validate input and handle validation errors
const validate = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const errorMessages = errors.array().map(e => e.msg).join('; ');
		return res.status(400).json({ 
			message: 'Validation failed: ' + errorMessages,
			errors: errors.array() 
		});
	}
	next();
};

// Public route - get profile by unique URL
router.get('/profile/:uniqueUrl', clientController.getPublicProfile);

// Public route - check URL availability
router.get('/check-url', clientController.checkUrlAvailability);

// Protected routes (require authentication)

// Create client
router.post(
	'/',
	auth,
	upload.single('pdf'),
	[
		body('clientName').trim().notEmpty().withMessage('Client name is required'),
		body('businessName')
			.trim()
			.notEmpty()
			.withMessage('Business name is required'),
		body('uniqueUrl').trim().notEmpty().withMessage('Unique URL is required'),
	],
	validate,
	clientController.createClient,
);

// Get all clients
router.get('/', auth, clientController.getAllClients);

// Get single client
router.get('/:id', auth, clientController.getSingleClient);

// Update client
router.put(
	'/:id',
	auth,
	upload.single('pdf'),
	[
		body('clientName').optional().trim().notEmpty(),
		body('businessName').optional().trim().notEmpty(),
		body('uniqueUrl').optional().trim().notEmpty(),
	],
	validate,
	clientController.updateClient,
);

// Toggle client status
router.patch('/:id/status', auth, clientController.toggleClientStatus);

// Delete client
router.delete('/:id', auth, clientController.deleteClient);

module.exports = router;

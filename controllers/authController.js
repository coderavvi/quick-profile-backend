const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: '7d',
	});
};

// Login Admin
exports.login = async (req, res) => {
	try {
		// Check for validation errors
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { email, password } = req.body;

		// Find admin by email
		const admin = await Admin.findOne({ email });
		if (!admin) {
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		// Compare password
		const isMatch = await admin.comparePassword(password);
		if (!isMatch) {
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		// Generate token
		const token = generateToken(admin._id);

		res.json({
			token,
			admin: {
				id: admin._id,
				email: admin.email,
			},
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Register Admin (optional - for initial setup)
exports.register = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { email, password } = req.body;

		// Check if admin already exists
		let admin = await Admin.findOne({ email });
		if (admin) {
			return res.status(400).json({ message: 'Admin already exists' });
		}

		// Create new admin
		admin = new Admin({ email, password });
		await admin.save();

		// Generate token
		const token = generateToken(admin._id);

		res.status(201).json({
			token,
			admin: {
				id: admin._id,
				email: admin.email,
			},
		});
	} catch (error) {
		console.error('Register error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Get current admin
exports.getCurrentAdmin = async (req, res) => {
	try {
		const admin = await Admin.findById(req.adminId);
		if (!admin) {
			return res.status(404).json({ message: 'Admin not found' });
		}

		res.json({
			admin: {
				id: admin._id,
				email: admin.email,
			},
		});
	} catch (error) {
		console.error('Get admin error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

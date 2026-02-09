const Client = require('../models/Client');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// Sanitize unique URL
const sanitizeUrl = (url) => {
	return url
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
};

// Helper: Delete old PDF
const deleteOldPdf = (pdfUrl) => {
	if (pdfUrl) {
		const filePath = path.join(
			process.env.UPLOAD_DIR || './uploads',
			path.basename(pdfUrl),
		);
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	}
};

// Create new client
exports.createClient = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		if (!req.file) {
			return res.status(400).json({ message: 'PDF file is required' });
		}

		const { clientName, businessName, uniqueUrl } = req.body;
		let sanitizedUrl = sanitizeUrl(uniqueUrl);

		// Check if URL already exists
		const existingClient = await Client.findOne({ uniqueUrl: sanitizedUrl });
		if (existingClient) {
			fs.unlinkSync(req.file.path);
			return res
				.status(400)
				.json({ message: 'This unique URL is already taken' });
		}

		// Create new client
		const client = new Client({
			clientName,
			businessName,
			uniqueUrl: sanitizedUrl,
			pdfUrl: `/uploads/${req.file.filename}`,
			isActive: true,
		});

		await client.save();

		res.status(201).json({
			message: 'Client created successfully',
			client,
		});
	} catch (error) {
		if (req.file) {
			fs.unlinkSync(req.file.path);
		}
		console.error('Create client error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Get all clients with pagination
exports.getAllClients = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const search = req.query.search || '';
		const skip = (page - 1) * limit;

		// Build search query
		const searchQuery = search
			? {
					$or: [
						{ clientName: { $regex: search, $options: 'i' } },
						{ businessName: { $regex: search, $options: 'i' } },
						{ uniqueUrl: { $regex: search, $options: 'i' } },
					],
				}
			: {};

		const total = await Client.countDocuments(searchQuery);
		const clients = await Client.find(searchQuery)
			.skip(skip)
			.limit(limit)
			.sort({ createdAt: -1 });

		res.json({
			clients,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error('Get clients error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Get single client by ID
exports.getSingleClient = async (req, res) => {
	try {
		const client = await Client.findById(req.params.id);

		if (!client) {
			return res.status(404).json({ message: 'Client not found' });
		}

		res.json(client);
	} catch (error) {
		console.error('Get client error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Update client
exports.updateClient = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { clientName, businessName, uniqueUrl } = req.body;

		let client = await Client.findById(req.params.id);
		if (!client) {
			if (req.file) {
				fs.unlinkSync(req.file.path);
			}
			return res.status(404).json({ message: 'Client not found' });
		}

		// Check if URL is being changed and is unique
		if (uniqueUrl && uniqueUrl !== client.uniqueUrl) {
			const sanitizedUrl = sanitizeUrl(uniqueUrl);
			const existingClient = await Client.findOne({
				uniqueUrl: sanitizedUrl,
				_id: { $ne: req.params.id },
			});

			if (existingClient) {
				if (req.file) {
					fs.unlinkSync(req.file.path);
				}
				return res
					.status(400)
					.json({ message: 'This unique URL is already taken' });
			}

			client.uniqueUrl = sanitizedUrl;
		}

		// Update fields
		if (clientName) client.clientName = clientName;
		if (businessName) client.businessName = businessName;

		// Handle PDF replacement
		if (req.file) {
			deleteOldPdf(client.pdfUrl);
			client.pdfUrl = `/uploads/${req.file.filename}`;
		}

		await client.save();

		res.json({
			message: 'Client updated successfully',
			client,
		});
	} catch (error) {
		if (req.file) {
			fs.unlinkSync(req.file.path);
		}
		console.error('Update client error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Toggle client status
exports.toggleClientStatus = async (req, res) => {
	try {
		const client = await Client.findById(req.params.id);

		if (!client) {
			return res.status(404).json({ message: 'Client not found' });
		}

		client.isActive = !client.isActive;
		await client.save();

		res.json({
			message: `Client is now ${client.isActive ? 'active' : 'inactive'}`,
			client,
		});
	} catch (error) {
		console.error('Toggle status error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Delete client
exports.deleteClient = async (req, res) => {
	try {
		const client = await Client.findById(req.params.id);

		if (!client) {
			return res.status(404).json({ message: 'Client not found' });
		}

		// Delete PDF file
		deleteOldPdf(client.pdfUrl);

		await Client.findByIdAndDelete(req.params.id);

		res.json({ message: 'Client deleted successfully' });
	} catch (error) {
		console.error('Delete client error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Get public profile by unique URL
exports.getPublicProfile = async (req, res) => {
	try {
		const client = await Client.findOne({ uniqueUrl: req.params.uniqueUrl });

		if (!client || !client.isActive) {
			return res.status(404).json({ message: 'Profile not found' });
		}

		res.json(client);
	} catch (error) {
		console.error('Get profile error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Check URL availability
exports.checkUrlAvailability = async (req, res) => {
	try {
		const { uniqueUrl } = req.query;

		if (!uniqueUrl) {
			return res.status(400).json({ message: 'URL is required' });
		}

		const sanitizedUrl = sanitizeUrl(uniqueUrl);
		const client = await Client.findOne({ uniqueUrl: sanitizedUrl });

		res.json({
			available: !client,
			sanitizedUrl,
		});
	} catch (error) {
		console.error('Check availability error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

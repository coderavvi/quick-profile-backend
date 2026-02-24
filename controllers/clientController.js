const Client = require('../models/Client');
const cloudinary = require('cloudinary').v2;
const { validationResult } = require('express-validator');

// Sanitize unique URL
const sanitizeUrl = (url) => {
	return url
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-zA-Z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
};

// Helper: Delete old PDF/file from Cloudinary
const deleteOldFile = async (pdfUrl) => {
	if (!pdfUrl) return;

	try {
		// Extract public_id from Cloudinary URL
		// URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234/folder/public_id.ext
		const urlParts = pdfUrl.split('/');
		const fileNameWithExt = urlParts[urlParts.length - 1];
		const fileName = fileNameWithExt.split('.')[0];
		const folder = urlParts[urlParts.length - 2];

		const publicId = `${folder}/${fileName}`;

		// Determine resource type
		let resourceType = 'image';
		if (pdfUrl.includes('/pdfs/')) {
			resourceType = 'raw';
		}

		await cloudinary.uploader.destroy(publicId, {
			resource_type: resourceType,
		});
	} catch (error) {
		console.error('Error deleting file from Cloudinary:', error);
		// Don't throw - let the operation continue
	}
};

// Create new client
exports.createClient = async (req, res) => {
	try {
		console.log('=== CREATE CLIENT REQUEST ===');
		console.log('Body:', req.body);
		console.log('File:', req.file ? { name: req.file.originalname, size: req.file.size, secure_url: req.file.secure_url } : 'NO FILE');

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			console.log('Validation errors:', errors.array());
			const errorMessages = errors.array().map(e => e.msg).join('; ');
			return res.status(400).json({ 
				message: 'Validation failed: ' + errorMessages,
				errors: errors.array() 
			});
		}

		if (!req.file) {
			console.log('No file provided');
			return res.status(400).json({ message: 'File is required (PDF or image)' });
		}

		if (!req.file.secure_url) {
			console.error('File uploaded but no secure_url:', req.file);
			return res.status(500).json({ message: 'File upload failed - no URL returned from Cloudinary' });
		}

		console.log('✓ File uploaded to Cloudinary:', req.file.secure_url);

		const { clientName, businessName, uniqueUrl } = req.body;
		let sanitizedUrl = sanitizeUrl(uniqueUrl);

		// Check if URL already exists
		const existingClient = await Client.findOne({ uniqueUrl: sanitizedUrl });
		if (existingClient) {
			console.log('URL already exists:', sanitizedUrl);
			// Delete uploaded file from Cloudinary
			await deleteOldFile(req.file.secure_url);
			return res.status(400).json({ message: 'This unique URL is already taken' });
		}

		// Create new client with Cloudinary URL
		const client = new Client({
			clientName,
			businessName,
			uniqueUrl: sanitizedUrl,
			pdfUrl: req.file.secure_url,
			isActive: true,
		});

		await client.save();
		console.log('✓ Client saved to database:', client._id);

		res.status(201).json({
			message: 'Client created successfully',
			client,
		});
	} catch (error) {
		if (req.file && req.file.secure_url) {
			await deleteOldFile(req.file.secure_url).catch(e => console.error('Cleanup error:', e));
		}
		console.error('Create client error:', error);
		res.status(500).json({ message: error.message || 'Server error creating client' });
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
		console.log('=== UPDATE CLIENT REQUEST ===');
		console.log('Client ID:', req.params.id);
		console.log('Body:', req.body);
		console.log('File:', req.file ? { name: req.file.originalname, size: req.file.size, secure_url: req.file.secure_url } : 'NO FILE');

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			console.log('Validation errors:', errors.array());
			const errorMessages = errors.array().map(e => e.msg).join('; ');
			return res.status(400).json({ 
				message: 'Validation failed: ' + errorMessages,
				errors: errors.array() 
			});
		}

		const { clientName, businessName, uniqueUrl } = req.body;

		let client = await Client.findById(req.params.id);
		if (!client) {
			console.log('Client not found:', req.params.id);
			if (req.file) {
				await deleteOldFile(req.file.secure_url).catch(e => console.error('Cleanup error:', e));
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
				console.log('URL already taken:', sanitizedUrl);
				if (req.file) {
					await deleteOldFile(req.file.secure_url).catch(e => console.error('Cleanup error:', e));
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

		// Handle file replacement
		if (req.file) {
			if (!req.file.secure_url) {
				console.error('File uploaded but no secure_url:', req.file);
				return res.status(500).json({ message: 'File upload failed - no URL returned from Cloudinary' });
			}
			console.log('Replacing file:', client.pdfUrl, '->', req.file.secure_url);
			if (client.pdfUrl && !client.pdfUrl.includes('/uploads/')) {
				await deleteOldFile(client.pdfUrl).catch(e => console.error('Cleanup error:', e));
			}
			client.pdfUrl = req.file.secure_url;
		}

		await client.save();
		console.log('✓ Client updated:', client._id, 'PDF URL:', client.pdfUrl);

		res.json({
			message: 'Client updated successfully',
			client,
		});
	} catch (error) {
		if (req.file) {
			await deleteOldFile(req.file.secure_url).catch(e => console.error('Cleanup error:', e));
		}
		console.error('Update client error:', error);
		res.status(500).json({ message: error.message || 'Server error updating client' });
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

		// Delete file from Cloudinary
		await deleteOldFile(client.pdfUrl);

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

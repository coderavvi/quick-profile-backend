#!/usr/bin/env node

/**
 * Script to create an admin user in the database
 * Usage: node scripts/createAdmin.js <email> <password>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createAdmin = async () => {
	try {
		const email = process.argv[2];
		const password = process.argv[3];

		if (!email || !password) {
			console.error('Usage: node scripts/createAdmin.js <email> <password>');
			process.exit(1);
		}

		// Connect to MongoDB
		await mongoose.connect(process.env.MONGODB_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		console.log('Connected to MongoDB');

		// Check if admin already exists
		const existingAdmin = await Admin.findOne({ email });
		if (existingAdmin) {
			console.error('Admin with this email already exists');
			process.exit(1);
		}

		// Create new admin
		const admin = new Admin({ email, password });
		await admin.save();

		console.log(`✓ Admin created successfully!`);
		console.log(`Email: ${email}`);
		console.log(`You can now login with these credentials.`);

		process.exit(0);
	} catch (error) {
		console.error('Error creating admin:', error.message);
		process.exit(1);
	}
};

createAdmin();

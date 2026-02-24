require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');

// Initialize app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins =
	process.env.NODE_ENV === 'production'
		? (process.env.CORS_ORIGINS || 'https://quick-profile-frontend-9mgx.vercel.app,https://quick-profile.vercel.app')
				.split(',')
				.map((origin) => origin.trim())
		: ['http://localhost:3000', 'http://localhost:5000'];

app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	}),
);

// Cloudinary serves static files - no local uploads needed
// Previous: app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);

// Health check
app.get('/api/health', (req, res) => {
	res.json({ status: 'Backend is running' });
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
	console.error(err);
	res.status(err.statusCode || 500).json({
		message: err.message || 'Internal server error',
	});
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

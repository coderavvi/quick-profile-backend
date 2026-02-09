const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadsDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
	},
});

// File filter - only allow PDF files
const fileFilter = (req, file, cb) => {
	if (file.mimetype === 'application/pdf') {
		cb(null, true);
	} else {
		cb(new Error('Only PDF files are allowed'), false);
	}
};

// Upload middleware
const upload = multer({
	storage: storage,
	fileFilter: fileFilter,
	limits: {
		fileSize: parseInt(process.env.MAX_FILE_SIZE || 10485760), // 10MB default
	},
});

module.exports = upload;

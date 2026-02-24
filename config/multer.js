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
		const fileType = file.mimetype === 'application/pdf' ? 'pdf' : 'image';
		cb(null, fileType + '-' + uniqueSuffix + path.extname(file.originalname));
	},
});

// File filter - allow PDF and image files
const fileFilter = (req, file, cb) => {
	const allowedMimeTypes = [
		'application/pdf',
		'image/jpeg',
		'image/png',
		'image/gif',
		'image/webp',
	];
	if (allowedMimeTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Only PDF and image files are allowed'), false);
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

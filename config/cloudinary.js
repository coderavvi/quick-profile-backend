const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: async (req, file) => {
		// Determine resource type based on MIME type
		let resourceType = 'auto';
		let folder = 'quickprofile/uploads';

		if (file.mimetype === 'application/pdf') {
			folder = 'quickprofile/pdfs';
		} else if (file.mimetype.startsWith('image/')) {
			folder = 'quickprofile/images';
		}

		return {
			folder: folder,
			resource_type: resourceType,
			public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.split('.')[0]}`,
			format: file.originalname.split('.').pop(),
		};
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

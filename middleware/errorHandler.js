const upload = (req, res, next) => {
	return (err, req, res, next) => {
		if (err) {
			if (err.code === 'LIMIT_FILE_SIZE') {
				return res.status(400).json({
					message: 'File size is too large. Maximum file size is 10MB.',
				});
			}
			if (
				err instanceof Error &&
				err.message === 'Only PDF files are allowed'
			) {
				return res.status(400).json({
					message: 'Only PDF files are allowed',
				});
			}
			return res.status(400).json({
				message: err.message || 'File upload error',
			});
		}
		next();
	};
};

module.exports = upload;

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
	{
		clientName: {
			type: String,
			required: true,
			trim: true,
		},
		businessName: {
			type: String,
			required: true,
			trim: true,
		},
		uniqueUrl: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			index: true,
		},
		pdfUrl: {
			type: String,
			required: true,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true },
);

// Validate unique URL format before saving
clientSchema.pre('save', async function (next) {
	if (this.isModified('uniqueUrl')) {
		// Check if URL already exists
		const existingClient = await mongoose.model('Client').findOne({
			uniqueUrl: this.uniqueUrl,
			_id: { $ne: this._id }, // Exclude current document
		});

		if (existingClient) {
			const error = new Error('This unique URL is already taken');
			error.statusCode = 400;
			return next(error);
		}
	}
	next();
});

module.exports = mongoose.model('Client', clientSchema);

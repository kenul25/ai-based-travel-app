const mongoose = require('mongoose');

const DESTINATION_CATEGORIES = [
  'Beach',
  'Culture',
  'Nature',
  'Adventure',
  'Wildlife',
  'Food',
  'Wellness',
  'City',
  'History',
];

const DestinationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  location: { type: String, trim: true },
  categories: [{ type: String, enum: DESTINATION_CATEGORIES }],
  shortDescription: { type: String, trim: true, maxlength: 220 },
  description: { type: String, required: true, trim: true },
  image: { type: String, trim: true },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

DestinationSchema.index({ name: 'text', location: 'text', description: 'text', categories: 'text' });

module.exports = {
  Destination: mongoose.model('Destination', DestinationSchema),
  DESTINATION_CATEGORIES,
};

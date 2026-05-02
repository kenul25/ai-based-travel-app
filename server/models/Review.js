const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  traveler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 300 },
  photos: [String],
  isApproved: { type: Boolean, default: true },
}, { timestamps: true });

ReviewSchema.index({ driver: 1, isApproved: 1 });
ReviewSchema.index({ traveler: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);

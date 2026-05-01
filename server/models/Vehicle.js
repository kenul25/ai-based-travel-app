const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  type: { type: String, enum: ['Car', 'Van', 'Bus', 'Tuk-Tuk'], required: true },
  capacity: { type: Number, required: true },
  regNumber: { type: String, required: true, unique: true },
  pricePerDay: { type: Number, required: true },
  isAvailable: { type: Boolean, default: true },
  images: [{ type: String }],
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);

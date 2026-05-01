const mongoose = require('mongoose');

const SavedCardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardHolderName: { type: String, required: true, trim: true },
  last4: { type: String, required: true, minlength: 4, maxlength: 4 },
  brand: { type: String, required: true, trim: true },
  expiryMonth: { type: Number, required: true, min: 1, max: 12 },
  expiryYear: { type: Number, required: true },
  nickname: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
  gatewayToken: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SavedCard', SavedCardSchema);

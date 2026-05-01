const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  traveler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  method: { type: String, enum: ['saved_card', 'new_card', 'cash'], required: true },
  savedCard: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedCard' },
  status: { type: String, enum: ['pending', 'paid', 'refunded', 'failed'], default: 'pending' },
  transactionId: { type: String, unique: true, sparse: true },
  gatewayToken: String,
  receiptNumber: { type: String, unique: true },
  paidAt: Date,
  refundedAt: Date,
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);

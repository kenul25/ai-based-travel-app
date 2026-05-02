const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['booking', 'payment', 'trip', 'review', 'system'],
    default: 'system',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
  },
  readAt: { type: Date, default: null },
  actionRoute: { type: String, default: '' },
  relatedModel: { type: String, default: '' },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, readAt: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);

const Notification = require('../models/Notification');
const User = require('../models/User');

const createNotification = async ({
  recipient,
  title,
  message,
  type = 'system',
  priority = 'normal',
  actionRoute = '',
  relatedModel = '',
  relatedId,
  metadata = {},
}) => {
  if (!recipient || !title || !message) return null;

  return Notification.create({
    recipient,
    title,
    message,
    type,
    priority,
    actionRoute,
    relatedModel,
    relatedId,
    metadata,
  });
};

const createNotificationsForAdmins = async (notification) => {
  const admins = await User.find({
    role: { $in: ['admin', 'superadmin'] },
    isActive: true,
  }).select('_id');

  if (!admins.length) return [];

  return Notification.insertMany(
    admins.map((admin) => ({
      ...notification,
      recipient: admin._id,
    })),
    { ordered: false }
  );
};

module.exports = {
  createNotification,
  createNotificationsForAdmins,
};

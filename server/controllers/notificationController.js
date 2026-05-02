const Notification = require('../models/Notification');

exports.getMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const onlyUnread = req.query.unread === 'true';
    const query = { recipient: req.user.id };

    if (onlyUnread) query.readAt = null;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      readAt: null,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getNotificationSummary = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      readAt: null,
    });

    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.status(200).json({ success: true, unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

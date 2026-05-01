const User = require('../models/User');
const Trip = require('../models/Trip');
const Payment = require('../models/Payment');

const ADMIN_ROLES = ['admin', 'superadmin'];
const MANAGED_USER_ROLES = ['traveler', 'driver'];

const sanitizeUser = (user) => {
  const plain = user.toObject ? user.toObject() : user;
  delete plain.password;
  return plain;
};

const canManageAdmin = (actor, target) => {
  if (actor.role === 'superadmin') return true;
  return target.role === 'admin';
};

exports.getStats = async (_req, res) => {
  try {
    const [totalUsers, activeDrivers, totalTrips, pendingDrivers, revenueAgg, aiPlans] = await Promise.all([
      User.countDocuments({ role: { $in: ['traveler', 'driver'] } }),
      User.countDocuments({ role: 'driver', isActive: true, isVerified: true }),
      Trip.countDocuments(),
      User.countDocuments({ role: 'driver', isVerified: false }),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Trip.countDocuments({ aiRecommendedPlaces: { $exists: true, $not: { $size: 0 } } }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeDrivers,
        totalTrips,
        revenue: revenueAgg[0]?.total || 0,
        aiPlans,
        pendingDrivers,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load admin stats', error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role, status, search = '' } = req.query;
    const query = { role: { $in: MANAGED_USER_ROLES } };

    if (MANAGED_USER_ROLES.includes(role)) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load users', error: error.message });
  }
};

exports.verifyDriver = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'driver' });
    if (!user) return res.status(404).json({ message: 'Driver not found' });

    user.isVerified = true;
    await user.save();
    res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify driver', error: error.message });
  }
};

exports.toggleUserActive = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: { $in: MANAGED_USER_ROLES } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : !user.isActive;
    await user.save();
    res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: { $in: MANAGED_USER_ROLES } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.deleteOne();
    res.status(200).json({ success: true, message: 'User account deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

exports.getAdmins = async (_req, res) => {
  try {
    const admins = await User.find({ role: { $in: ADMIN_ROLES } })
      .select('-password')
      .populate('createdBy', 'name email role')
      .sort({ role: -1, createdAt: -1 });

    res.status(200).json({ success: true, count: admins.length, admins });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load admins', error: error.message });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, role = 'admin', phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (!ADMIN_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid admin role' });
    }
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admins can create super admins' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email is already registered' });

    const admin = await User.create({
      name,
      email,
      password,
      role,
      phone,
      isVerified: true,
      isActive: true,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, admin: sanitizeUser(admin) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create admin', error: error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: { $in: ADMIN_ROLES } });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (!canManageAdmin(req.user, admin)) {
      return res.status(403).json({ message: 'You cannot edit this admin account' });
    }

    const { name, email, phone, role, password } = req.body;
    if (name) admin.name = name;
    if (phone !== undefined) admin.phone = phone;
    if (email && email.toLowerCase() !== admin.email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: admin._id } });
      if (existing) return res.status(400).json({ message: 'Email is already registered' });
      admin.email = email;
    }
    if (role && role !== admin.role) {
      if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Only super admins can change admin roles' });
      if (!ADMIN_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid admin role' });
      admin.role = role;
    }
    if (password) {
      admin.password = password;
    }

    await admin.save();
    res.status(200).json({ success: true, admin: sanitizeUser(admin) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update admin', error: error.message });
  }
};

exports.toggleAdminActive = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: { $in: ADMIN_ROLES } });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (!canManageAdmin(req.user, admin)) {
      return res.status(403).json({ message: 'You cannot deactivate this admin account' });
    }
    if (String(admin._id) === req.user.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own admin account' });
    }

    admin.isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : !admin.isActive;
    await admin.save();
    res.status(200).json({ success: true, admin: sanitizeUser(admin) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update admin status', error: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admins can delete admins' });
    }

    const admin = await User.findOne({ _id: req.params.id, role: { $in: ADMIN_ROLES } });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (String(admin._id) === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    await admin.deleteOne();
    res.status(200).json({ success: true, message: 'Admin account deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete admin', error: error.message });
  }
};

exports.getTrips = async (req, res) => {
  try {
    const { status, search = '' } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search.trim()) query.destinationArea = { $regex: search.trim(), $options: 'i' };

    const trips = await Trip.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load trips', error: error.message });
  }
};

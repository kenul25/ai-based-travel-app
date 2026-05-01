const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const buildUserPayload = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  profileImage: user.profileImage,
  isVerified: user.isVerified,
  isActive: user.isActive,
  licenseNumber: user.licenseNumber,
  rating: user.rating,
  totalRatings: user.totalRatings,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, licenseNumber } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const userData = {
      name,
      email,
      password,
      role,
      phone
    };

    if (role === 'driver') {
      if (!licenseNumber) {
        return res.status(400).json({ message: 'License number is required for drivers' });
      }
      userData.licenseNumber = licenseNumber;
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      token: generateToken(user._id, user.role),
      user: buildUserPayload(user)
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated' });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id, user.role),
      user: buildUserPayload(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

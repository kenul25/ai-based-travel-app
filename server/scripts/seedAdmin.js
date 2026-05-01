require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const DEFAULT_SUPER_ADMIN = {
  name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
  email: (process.env.SUPER_ADMIN_EMAIL || 'superadmin@wanderway.com').toLowerCase(),
  password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@1234',
};

const seedSuperAdmin = async () => {
  const existingSuperAdmin = await User.findOne({ role: 'superadmin' });

  if (existingSuperAdmin) {
    console.log(`Super admin already exists: ${existingSuperAdmin.email}`);
    return existingSuperAdmin;
  }

  const existingEmailUser = await User.findOne({ email: DEFAULT_SUPER_ADMIN.email });

  if (existingEmailUser) {
    existingEmailUser.role = 'superadmin';
    existingEmailUser.name = existingEmailUser.name || DEFAULT_SUPER_ADMIN.name;
    existingEmailUser.isActive = true;
    existingEmailUser.isVerified = true;
    await existingEmailUser.save();
    console.log(`Existing user promoted to super admin: ${existingEmailUser.email}`);
    return existingEmailUser;
  }

  const superAdmin = await User.create({
    name: DEFAULT_SUPER_ADMIN.name,
    email: DEFAULT_SUPER_ADMIN.email,
    password: DEFAULT_SUPER_ADMIN.password,
    role: 'superadmin',
    isActive: true,
    isVerified: true,
  });

  console.log(`Super admin seeded successfully: ${superAdmin.email}`);
  return superAdmin;
};

const runStandalone = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for admin seeding.');
    await seedSuperAdmin();
  } catch (error) {
    console.error('Error seeding super admin:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  runStandalone();
}

module.exports = seedSuperAdmin;

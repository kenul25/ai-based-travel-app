const express = require('express');
const {
  createAdmin,
  deleteAdmin,
  deleteUser,
  getAdmins,
  getStats,
  getTrips,
  getUsers,
  toggleAdminActive,
  toggleUserActive,
  updateAdmin,
  verifyDriver,
} = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken, requireRole('admin', 'superadmin'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/verify', verifyDriver);
router.put('/users/:id/deactivate', toggleUserActive);
router.delete('/users/:id', deleteUser);

router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);
router.put('/admins/:id/deactivate', toggleAdminActive);
router.delete('/admins/:id', deleteAdmin);

router.get('/trips', getTrips);

module.exports = router;

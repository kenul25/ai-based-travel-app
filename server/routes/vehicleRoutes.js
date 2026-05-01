const express = require('express');
const router = express.Router();
const { 
  addVehicle, 
  getMyVehicles, 
  getAllVehicles, 
  toggleVehicleAvailability,
  getVehicleById,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehicleController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(verifyToken);

// Travelers can get all vehicles
router.get('/', getAllVehicles);

// Only drivers manage vehicles
router.use(requireRole('driver', 'admin', 'superadmin'));
router.post('/', upload.single('images'), addVehicle);
router.get('/my', getMyVehicles);
router.get('/:id', getVehicleById);
router.put('/:id', upload.single('images'), updateVehicle);
router.put('/:id/toggle', toggleVehicleAvailability);
router.delete('/:id', deleteVehicle);

module.exports = router;

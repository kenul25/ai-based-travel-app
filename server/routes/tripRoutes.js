const express = require('express');
const router = express.Router();
const { 
  createTrip, 
  getMyTrips, 
  getTripById, 
  deleteTrip,
  generateAITripPlan,
  getAITripPlan,
  regenerateAITripPlan
} = require('../controllers/tripController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All trip routes require at least traveler auth
router.use(verifyToken);
router.use(requireRole('traveler', 'admin', 'superadmin')); // Drivers don't plan trips

router.post('/', createTrip);
router.post('/ai-plan', generateAITripPlan);
router.get('/my', getMyTrips);
router.get('/:id/ai-plan', getAITripPlan);
router.get('/:id', getTripById);
router.post('/:id/regenerate-ai-plan', regenerateAITripPlan);
router.delete('/:id', deleteTrip);

module.exports = router;

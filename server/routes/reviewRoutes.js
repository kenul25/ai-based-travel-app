const express = require('express');
const {
  createReview,
  deleteReview,
  getAdminReviews,
  getDriverReviews,
  getTripReviews,
  toggleApproveReview,
  updateReview,
} = require('../controllers/reviewController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/driver/:driverId', getDriverReviews);
router.get('/trip/:tripId', getTripReviews);

router.use(verifyToken);

router.post('/', requireRole('traveler'), createReview);
router.get('/admin/all', requireRole('admin', 'superadmin'), getAdminReviews);
router.put('/:id', requireRole('traveler'), updateReview);
router.put('/:id/toggle-approve', requireRole('admin', 'superadmin'), toggleApproveReview);
router.delete('/:id', requireRole('traveler', 'admin', 'superadmin'), deleteReview);

module.exports = router;

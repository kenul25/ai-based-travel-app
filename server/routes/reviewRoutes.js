const express = require('express');
const {
  createReview,
  deleteReview,
  getAdminReviews,
  getDriverReviews,
  getMyReviews,
  getTripReviews,
  toggleApproveReview,
  updateReview,
  uploadReviewPhotos,
} = require('../controllers/reviewController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { reviewUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/driver/:driverId', getDriverReviews);
router.get('/trip/:tripId', getTripReviews);

router.use(verifyToken);

router.post('/', requireRole('traveler'), createReview);
router.get('/my', requireRole('traveler'), getMyReviews);
router.post('/upload-photos', requireRole('traveler'), reviewUpload.array('photos', 3), uploadReviewPhotos);
router.get('/admin/all', requireRole('admin', 'superadmin'), getAdminReviews);
router.put('/:id', requireRole('traveler'), updateReview);
router.put('/:id/toggle-approve', requireRole('admin', 'superadmin'), toggleApproveReview);
router.delete('/:id', requireRole('traveler', 'admin', 'superadmin'), deleteReview);

module.exports = router;

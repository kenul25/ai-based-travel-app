const express = require('express');
const router = express.Router();
const {
  createPayment,
  getTravelerPayments,
  getDriverPayments,
  getPaymentById,
  completePayment,
  refundPayment,
  deletePayment,
  getAllPayments,
  getPaymentSummary,
} = require('../controllers/paymentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', requireRole('traveler'), createPayment);
router.get('/traveler', requireRole('traveler'), getTravelerPayments);
router.get('/driver', requireRole('driver'), getDriverPayments);
router.get('/admin/all', requireRole('admin', 'superadmin'), getAllPayments);
router.get('/admin/summary', requireRole('admin', 'superadmin'), getPaymentSummary);
router.get('/:id', requireRole('traveler', 'driver', 'admin', 'superadmin'), getPaymentById);
router.put('/:id/complete', requireRole('traveler'), completePayment);
router.put('/:id/refund', requireRole('admin', 'superadmin'), refundPayment);
router.delete('/:id', requireRole('traveler'), deletePayment);

module.exports = router;

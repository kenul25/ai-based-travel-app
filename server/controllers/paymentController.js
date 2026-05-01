const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const SavedCard = require('../models/SavedCard');

const populatePayment = (query) => query
  .populate('booking')
  .populate('trip', 'destinationArea startDate endDate')
  .populate('driver', 'name')
  .populate('traveler', 'name')
  .populate('savedCard', 'brand last4 nickname');

const buildReceiptNumber = () => `RCPT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

const markBookingPaid = async (bookingId, status) => {
  await Booking.findByIdAndUpdate(bookingId, { paymentStatus: status });
};

exports.createPayment = async (req, res) => {
  try {
    const { bookingId, method, savedCardId, notes } = req.body;
    if (!bookingId || !['saved_card', 'new_card', 'cash'].includes(method)) {
      return res.status(400).json({ message: 'Booking and valid payment method are required' });
    }

    const booking = await Booking.findOne({ _id: bookingId, traveler: req.user.id })
      .populate('trip')
      .populate('vehicle');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!['accepted', 'completed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Only accepted bookings can be paid' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking is already paid' });
    }

    const existingPayment = await Payment.findOne({ booking: booking._id, status: { $in: ['pending', 'paid'] } });
    if (existingPayment) {
      return res.status(400).json({ message: 'This booking already has an active payment' });
    }

    let savedCard = null;
    let gatewayToken = null;
    if (method === 'saved_card') {
      savedCard = await SavedCard.findOne({ _id: savedCardId, user: req.user.id });
      if (!savedCard) return res.status(404).json({ message: 'Saved card not found' });
      gatewayToken = savedCard.gatewayToken;
    }

    const isCash = method === 'cash';
    const payment = await Payment.create({
      booking: booking._id,
      trip: booking.trip._id,
      traveler: req.user.id,
      driver: booking.driver,
      amount: booking.totalAmount,
      method,
      savedCard: savedCard?._id,
      status: isCash ? 'pending' : 'paid',
      transactionId: isCash ? undefined : `txn_${uuidv4()}`,
      gatewayToken,
      receiptNumber: buildReceiptNumber(),
      paidAt: isCash ? undefined : new Date(),
      notes: notes || '',
    });

    await markBookingPaid(booking._id, isCash ? 'unpaid' : 'paid');
    const populatedPayment = await populatePayment(Payment.findById(payment._id));

    res.status(201).json({ success: true, payment: populatedPayment });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getTravelerPayments = async (req, res) => {
  try {
    const payments = await populatePayment(Payment.find({ traveler: req.user.id }).sort({ createdAt: -1 }));
    res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getDriverPayments = async (req, res) => {
  try {
    const payments = await populatePayment(Payment.find({ driver: req.user.id }).sort({ createdAt: -1 }));
    const paidTotal = payments
      .filter((payment) => payment.status === 'paid')
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);

    res.status(200).json({ success: true, count: payments.length, paidTotal, payments });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'traveler') query.traveler = req.user.id;
    if (req.user.role === 'driver') query.driver = req.user.id;

    const payment = await populatePayment(Payment.findOne(query));
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    res.status(200).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.completePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, traveler: req.user.id });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status === 'paid') return res.status(400).json({ message: 'Payment is already paid' });
    if (payment.status === 'refunded') return res.status(400).json({ message: 'Refunded payments cannot be completed' });

    payment.status = 'paid';
    payment.transactionId = payment.transactionId || `txn_${uuidv4()}`;
    payment.paidAt = new Date();
    await payment.save();
    await markBookingPaid(payment.booking, 'paid');

    const populatedPayment = await populatePayment(Payment.findById(payment._id));
    res.status(200).json({ success: true, payment: populatedPayment });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'paid') return res.status(400).json({ message: 'Only paid payments can be refunded' });

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.notes = req.body.reason || payment.notes;
    await payment.save();
    await markBookingPaid(payment.booking, 'refunded');

    const populatedPayment = await populatePayment(Payment.findById(payment._id));
    res.status(200).json({ success: true, payment: populatedPayment });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, traveler: req.user.id });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status === 'paid') return res.status(400).json({ message: 'Paid payments cannot be deleted. Refund them instead.' });

    await payment.deleteOne();
    await markBookingPaid(payment.booking, 'unpaid');
    res.status(200).json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const payments = await populatePayment(Payment.find().sort({ createdAt: -1 }));
    res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getPaymentSummary = async (req, res) => {
  try {
    const [paid, pending, refunded] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.countDocuments({ status: 'pending' }),
      Payment.aggregate([{ $match: { status: 'refunded' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);

    res.status(200).json({
      success: true,
      summary: {
        paidTotal: paid[0]?.total || 0,
        paidCount: paid[0]?.count || 0,
        pendingCount: pending,
        refundedTotal: refunded[0]?.total || 0,
        refundedCount: refunded[0]?.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

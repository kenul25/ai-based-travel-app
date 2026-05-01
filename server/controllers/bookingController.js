const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');

// Traveler submits booking request
exports.createBooking = async (req, res) => {
  try {
    const { tripId, vehicleId } = req.body;
    
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (!vehicle.isAvailable) return res.status(400).json({ message: 'Vehicle is not available for booking' });

    const trip = await Trip.findOne({ _id: tripId, user: req.user.id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    if (Number(vehicle.capacity) < Number(trip.passengers || 1)) {
      return res.status(400).json({ message: 'Vehicle capacity is too small for this trip' });
    }

    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return res.status(400).json({ message: 'Trip has invalid booking dates' });
    }

    const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
    const totalAmount = Number(vehicle.pricePerDay || 0) * days;

    const existingBooking = await Booking.findOne({
      trip: tripId,
      traveler: req.user.id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'This trip already has an active vehicle booking request' });
    }

    const booking = await Booking.create({
      trip: tripId,
      vehicle: vehicleId,
      traveler: req.user.id,
      driver: vehicle.driver,
      startDate,
      endDate,
      totalAmount
    });

    trip.status = 'confirmed';
    await trip.save();

    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Driver gets their booking requests
exports.getDriverBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ driver: req.user.id })
      .populate('traveler', 'name avatar')
      .populate('trip')
      .populate('vehicle', 'brand model regNumber type')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Traveler gets their bookings
exports.getTravelerBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ traveler: req.user.id })
      .populate('driver', 'name avatar')
      .populate('trip')
      .populate('vehicle')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Driver updates status (accept/reject)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted', 'rejected'
    const allowedStatuses = ['accepted', 'rejected', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid booking status' });
    }

    const booking = await Booking.findOne({ _id: req.params.id, driver: req.user.id });
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    booking.status = status;
    await booking.save();

    if (status === 'accepted') {
      await Trip.findByIdAndUpdate(booking.trip, { status: 'confirmed' });
    }

    if (status === 'completed') {
      await Trip.findByIdAndUpdate(booking.trip, { status: 'completed' });
    }
    
    res.status(200).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

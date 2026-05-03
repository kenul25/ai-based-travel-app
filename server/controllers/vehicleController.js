const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const { deleteCloudinaryAssets } = require('../utils/cloudinaryAssets');

const vehicleTypes = ['Car', 'Van', 'Bus', 'Tuk-Tuk'];

const validateVehiclePayload = ({ brand, model, type, capacity, regNumber, pricePerDay }) => {
  if (!brand || !model || !type || !capacity || !regNumber || !pricePerDay) {
    const error = new Error('Please fill in all vehicle specifications');
    error.statusCode = 400;
    throw error;
  }

  if (!vehicleTypes.includes(type)) {
    const error = new Error('Invalid vehicle type');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(Number(capacity)) || Number(capacity) < 1) {
    const error = new Error('Capacity must be a valid number');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(Number(pricePerDay)) || Number(pricePerDay) <= 0) {
    const error = new Error('Price per day must be a valid amount');
    error.statusCode = 400;
    throw error;
  }
};

exports.addVehicle = async (req, res) => {
  try {
    const { brand, model, type, capacity, regNumber, pricePerDay } = req.body;
    validateVehiclePayload({ brand, model, type, capacity, regNumber, pricePerDay });
    
    // Check if regNumber already exists
    const exists = await Vehicle.findOne({ regNumber: regNumber.trim().toUpperCase() });
    if (exists) return res.status(400).json({ message: 'Vehicle registration number already in use' });

    // Handle Multer payload
    const images = [];
    if (req.file) {
      images.push(req.file.path);
    }

    const vehicle = await Vehicle.create({
      driver: req.user.id,
      brand: brand.trim(),
      model: model.trim(),
      type,
      capacity: Number(capacity),
      regNumber: regNumber.trim().toUpperCase(),
      pricePerDay: Number(pricePerDay),
      images
    });

    res.status(201).json({ success: true, vehicle });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server Error', error: error.message });
  }
};

exports.getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ driver: req.user.id });
    res.status(200).json({ success: true, count: vehicles.length, vehicles });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getAllVehicles = async (req, res) => {
  try {
    // Travelers use this to browse (could pass filters like type)
    const { type, isAvailable } = req.query;
    let query = {};
    if (type) query.type = type;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';

    const vehicles = await Vehicle.find(query).populate('driver', 'name avatar isVerified rating totalRatings');
    
    res.status(200).json({ success: true, count: vehicles.length, vehicles });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, driver: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    const previousImages = [...(vehicle.images || [])];

    res.status(200).json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { brand, model, type, capacity, regNumber, pricePerDay } = req.body;
    validateVehiclePayload({ brand, model, type, capacity, regNumber, pricePerDay });

    const vehicle = await Vehicle.findOne({ _id: req.params.id, driver: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const normalizedRegNumber = regNumber.trim().toUpperCase();
    const exists = await Vehicle.findOne({ regNumber: normalizedRegNumber, _id: { $ne: vehicle._id } });
    if (exists) return res.status(400).json({ message: 'Vehicle registration number already in use' });

    vehicle.brand = brand.trim();
    vehicle.model = model.trim();
    vehicle.type = type;
    vehicle.capacity = Number(capacity);
    vehicle.regNumber = normalizedRegNumber;
    vehicle.pricePerDay = Number(pricePerDay);

    if (req.file) {
      vehicle.images = [req.file.path];
    }

    await vehicle.save();
    if (req.file) {
      await deleteCloudinaryAssets(previousImages.filter((image) => image !== req.file.path));
    }
    res.status(200).json({ success: true, vehicle });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server Error', error: error.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, driver: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const activeBooking = await Booking.findOne({
      vehicle: vehicle._id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (activeBooking) {
      return res.status(400).json({ message: 'Cannot delete a vehicle with pending or accepted bookings' });
    }

    const imagesToDelete = [...(vehicle.images || [])];
    await vehicle.deleteOne();
    await deleteCloudinaryAssets(imagesToDelete);
    res.status(200).json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.toggleVehicleAvailability = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, driver: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    vehicle.isAvailable = !vehicle.isAvailable;
    await vehicle.save();
    
    res.status(200).json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

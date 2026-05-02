const { Destination, DESTINATION_CATEGORIES } = require('../models/Destination');

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const normalizeCategories = (value) => {
  const raw = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  return [...new Set(raw)]
    .map((item) => DESTINATION_CATEGORIES.find((category) => category.toLowerCase() === String(item).toLowerCase()))
    .filter(Boolean);
};

const buildImageUrl = (req) => {
  if (!req.file) return undefined;
  return `${req.protocol}://${req.get('host')}/uploads/destinations/${req.file.filename}`;
};

const validateDestinationPayload = ({ name, description, categories }) => {
  if (!name || !description) {
    const error = new Error('Destination name and detailed description are required.');
    error.statusCode = 400;
    throw error;
  }

  if (!categories.length) {
    const error = new Error('Select at least one destination category.');
    error.statusCode = 400;
    throw error;
  }
};

exports.getDestinationCategories = (_req, res) => {
  res.status(200).json({ success: true, categories: DESTINATION_CATEGORIES });
};

exports.getDestinations = async (req, res) => {
  try {
    const { search = '', category, featured, includeInactive } = req.query;
    const canSeeInactive = ['admin', 'superadmin'].includes(req.user?.role);
    const query = {};

    if (!canSeeInactive || !parseBoolean(includeInactive)) query.isActive = true;
    if (category) query.categories = category;
    if (featured !== undefined) query.isFeatured = parseBoolean(featured);
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const limit = Math.min(Number(req.query.limit || 100), 100);
    const destinations = await Destination.find(query)
      .populate('createdBy', 'name email role')
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(limit);

    res.status(200).json({ success: true, count: destinations.length, destinations });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load destinations', error: error.message });
  }
};

exports.getDestinationById = async (req, res) => {
  try {
    const canSeeInactive = ['admin', 'superadmin'].includes(req.user?.role);
    const destination = await Destination.findById(req.params.id).populate('createdBy', 'name email role');
    if (!destination || (!destination.isActive && !canSeeInactive)) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    res.status(200).json({ success: true, destination });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load destination', error: error.message });
  }
};

exports.createDestination = async (req, res) => {
  try {
    const categories = normalizeCategories(req.body.categories);
    validateDestinationPayload({ name: req.body.name, description: req.body.description, categories });

    const destination = await Destination.create({
      name: req.body.name.trim(),
      location: req.body.location?.trim() || '',
      categories,
      shortDescription: req.body.shortDescription?.trim() || '',
      description: req.body.description.trim(),
      image: buildImageUrl(req) || '',
      isFeatured: parseBoolean(req.body.isFeatured),
      isActive: parseBoolean(req.body.isActive, true),
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, destination });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to create destination' });
  }
};

exports.updateDestination = async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) return res.status(404).json({ message: 'Destination not found' });

    const categories = normalizeCategories(req.body.categories);
    validateDestinationPayload({ name: req.body.name, description: req.body.description, categories });

    destination.name = req.body.name.trim();
    destination.location = req.body.location?.trim() || '';
    destination.categories = categories;
    destination.shortDescription = req.body.shortDescription?.trim() || '';
    destination.description = req.body.description.trim();
    destination.isFeatured = parseBoolean(req.body.isFeatured);
    destination.isActive = parseBoolean(req.body.isActive, true);
    if (req.file) destination.image = buildImageUrl(req);

    await destination.save();
    res.status(200).json({ success: true, destination });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to update destination' });
  }
};

exports.deleteDestination = async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) return res.status(404).json({ message: 'Destination not found' });

    await destination.deleteOne();
    res.status(200).json({ success: true, message: 'Destination deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete destination', error: error.message });
  }
};

const Booking = require('../models/Booking');
const Review = require('../models/Review');
const User = require('../models/User');
const { deleteCloudinaryAssets } = require('../utils/cloudinaryAssets');

const populateReview = (query) => query
  .populate('traveler', 'name email')
  .populate('driver', 'name rating totalRatings')
  .populate('trip', 'destinationArea startDate endDate')
  .populate('booking', 'status paymentStatus startDate endDate totalAmount');

const updateDriverRating = async (driverId) => {
  const summary = await Review.aggregate([
    { $match: { driver: driverId, isApproved: true } },
    { $group: { _id: '$driver', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await User.findByIdAndUpdate(driverId, {
    rating: Number((summary[0]?.average || 0).toFixed(1)),
    totalRatings: summary[0]?.count || 0,
  });
};

const canEditReview = (review) => {
  const hoursSinceCreated = (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceCreated <= 48;
};

exports.createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment = '', photos = [] } = req.body;
    const numericRating = Number(rating);

    if (!bookingId || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Booking and a rating from 1 to 5 are required' });
    }

    const booking = await Booking.findOne({ _id: bookingId, traveler: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Reviews are available only after the booking is completed' });
    }

    const existing = await Review.findOne({ booking: booking._id });
    if (existing) return res.status(400).json({ message: 'This booking already has a review' });

    const review = await Review.create({
      booking: booking._id,
      trip: booking.trip,
      traveler: req.user.id,
      driver: booking.driver,
      rating: numericRating,
      comment: comment.trim(),
      photos: Array.isArray(photos) ? photos : [],
    });

    await updateDriverRating(booking.driver);
    const populatedReview = await populateReview(Review.findById(review._id));
    res.status(201).json({ success: true, review: populatedReview });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit review', error: error.message });
  }
};

exports.getTripReviews = async (req, res) => {
  try {
    const reviews = await populateReview(
      Review.find({ trip: req.params.tripId, isApproved: true }).sort({ createdAt: -1 })
    );
    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load trip reviews', error: error.message });
  }
};

exports.getDriverReviews = async (req, res) => {
  try {
    const reviews = await populateReview(
      Review.find({ driver: req.params.driverId, isApproved: true }).sort({ createdAt: -1 })
    );
    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load driver reviews', error: error.message });
  }
};

exports.getAdminReviews = async (req, res) => {
  try {
    const { status, search = '' } = req.query;
    const query = {};
    if (status === 'approved') query.isApproved = true;
    if (status === 'hidden') query.isApproved = false;

    let reviews = await populateReview(Review.find(query).sort({ createdAt: -1 }).limit(200));
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      reviews = reviews.filter((review) => (
        review.traveler?.name?.toLowerCase().includes(needle)
        || review.driver?.name?.toLowerCase().includes(needle)
        || review.trip?.destinationArea?.toLowerCase().includes(needle)
        || review.comment?.toLowerCase().includes(needle)
      ));
    }

    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load reviews', error: error.message });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await populateReview(
      Review.find({ traveler: req.user.id }).sort({ createdAt: -1 })
    );
    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load your reviews', error: error.message });
  }
};

exports.uploadReviewPhotos = async (req, res) => {
  try {
    const files = req.files || [];
    const photos = files.map((file) => file.path);
    res.status(201).json({ success: true, photos });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload review photos', error: error.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, traveler: req.user.id });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!canEditReview(review)) {
      return res.status(400).json({ message: 'Reviews can be edited only within 48 hours' });
    }

    if (req.body.rating !== undefined) {
      const numericRating = Number(req.body.rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: 'Rating must be from 1 to 5' });
      }
      review.rating = numericRating;
    }
    if (req.body.comment !== undefined) review.comment = String(req.body.comment).trim();
    const previousPhotos = [...(review.photos || [])];
    if (Array.isArray(req.body.photos)) review.photos = req.body.photos;

    await review.save();
    if (Array.isArray(req.body.photos)) {
      const removedPhotos = previousPhotos.filter((photo) => !review.photos.includes(photo));
      await deleteCloudinaryAssets(removedPhotos);
    }
    await updateDriverRating(review.driver);
    const populatedReview = await populateReview(Review.findById(review._id));
    res.status(200).json({ success: true, review: populatedReview });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update review', error: error.message });
  }
};

exports.toggleApproveReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.isApproved = typeof req.body.isApproved === 'boolean' ? req.body.isApproved : !review.isApproved;
    await review.save();
    await updateDriverRating(review.driver);

    const populatedReview = await populateReview(Review.findById(review._id));
    res.status(200).json({ success: true, review: populatedReview });
  } catch (error) {
    res.status(500).json({ message: 'Failed to moderate review', error: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'traveler') query.traveler = req.user.id;

    const review = await Review.findOne(query);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const driverId = review.driver;
    const photosToDelete = [...(review.photos || [])];
    await review.deleteOne();
    await deleteCloudinaryAssets(photosToDelete);
    await updateDriverRating(driverId);

    res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete review', error: error.message });
  }
};

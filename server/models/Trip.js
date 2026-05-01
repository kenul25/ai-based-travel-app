const mongoose = require('mongoose');

const DayItinerarySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  date: { type: Date },
  title: { type: String, required: true },
  accommodation: String,
  meals: [String],
  estimatedDailyCost: Number,
  activities: [{
    time: String,
    placeName: String,
    description: String,
    location: String,
    estimatedCost: Number,
    duration: String,
    tips: String
  }]
}, { _id: false });

const AIRecommendedPlaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  reason: String,
  estimatedEntryFee: { type: Number, default: 0 },
  bestTimeToVisit: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  confidenceNote: String
}, { _id: false });

const TripSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destinationArea: { type: String, trim: true },
  startingPoint: { type: String, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  budget: { type: Number, required: true },
  passengers: { type: Number, default: 1 },
  tripType: { type: String, enum: ['adventure', 'relaxing', 'cultural', 'hybrid'], default: 'hybrid' },
  pace: { type: String, enum: ['relaxed', 'balanced', 'packed'], default: 'balanced' },
  preferences: [String],
  constraints: String,
  aiRecommendedPlaces: [AIRecommendedPlaceSchema],
  aiItinerary: [DayItinerarySchema],
  aiPlanSummary: String,
  totalEstimatedCost: Number,
  routeSummary: String,
  status: { type: String, enum: ['draft', 'planning', 'confirmed', 'completed', 'cancelled'], default: 'planning' }
}, { timestamps: true });

module.exports = mongoose.model('Trip', TripSchema);

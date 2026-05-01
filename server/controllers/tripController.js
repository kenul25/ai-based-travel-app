const Trip = require('../models/Trip');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const getTripDayCount = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

const validateAITripInputs = ({ destinationArea, startDate, endDate, budget }) => {
  if (!destinationArea || !startDate || !endDate || !budget) {
    const error = new Error('Destination area, dates, and budget are required.');
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const numericBudget = Number(budget);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error('Please provide valid start and end dates.');
    error.statusCode = 400;
    throw error;
  }

  if (end < start) {
    const error = new Error('End date must be after the start date.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
    const error = new Error('Please provide a valid budget.');
    error.statusCode = 400;
    throw error;
  }
};

const parseGroqJson = (rawText) => {
  const cleaned = rawText
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw error;
    return JSON.parse(jsonMatch[0]);
  }
};

const normalizeAIPlan = (aiPlan) => {
  const recommendedPlaces = Array.isArray(aiPlan.recommendedPlaces)
    ? aiPlan.recommendedPlaces
    : [];
  const days = Array.isArray(aiPlan.days) ? aiPlan.days : [];

  if (!recommendedPlaces.length || !days.length) {
    throw new Error('AI response must include recommendedPlaces and days arrays.');
  }

  return {
    ...aiPlan,
    recommendedPlaces: recommendedPlaces.map((place) => ({
      name: place.name,
      category: place.category || 'Other',
      reason: place.reason || '',
      estimatedEntryFee: Number(place.estimatedEntryFee || 0),
      bestTimeToVisit: place.bestTimeToVisit || '',
      coordinates: {
        lat: typeof place.coordinates?.lat === 'number' ? place.coordinates.lat : undefined,
        lng: typeof place.coordinates?.lng === 'number' ? place.coordinates.lng : undefined,
      },
      confidenceNote: place.confidenceNote || '',
    })),
    days: days.map((day, index) => ({
      day: Number(day.day || index + 1),
      date: day.date,
      title: day.title || `Day ${index + 1}`,
      accommodation: day.accommodation || '',
      meals: Array.isArray(day.meals) ? day.meals : [],
      estimatedDailyCost: Number(day.estimatedDailyCost || 0),
      activities: Array.isArray(day.activities)
        ? day.activities.map((activity) => ({
            time: activity.time || '',
            placeName: activity.placeName || activity.location || activity.place || '',
            location: activity.location || activity.placeName || activity.place || '',
            description: activity.description || '',
            estimatedCost: Number(activity.estimatedCost || 0),
            duration: activity.duration || '',
            tips: activity.tips || '',
          }))
        : [],
    })),
  };
};

const requestAIPlan = async ({
  destinationArea,
  startingPoint,
  startDate,
  endDate,
  budget,
  passengers,
  preferences,
  pace,
  constraints,
}) => {
  const safePreferences = Array.isArray(preferences) ? preferences : [];
  const days = getTripDayCount(startDate, endDate);
  if (!Number.isFinite(days) || days < 1 || days > 30) {
    const error = new Error('Please provide a valid trip date range between 1 and 30 days.');
    error.statusCode = 400;
    throw error;
  }

  const prompt = `
You are a professional travel planning API for Sri Lanka and international travel.
Recommend the best places first, then create a practical ${days}-day itinerary.

Traveler request:
- Destination area: ${destinationArea}
- Starting point: ${startingPoint || 'not provided'}
- Dates: ${startDate} to ${endDate}
- Budget: LKR ${budget}
- People: ${passengers}
- Preferences: ${safePreferences.join(', ') || 'balanced'}
- Pace: ${pace}
- Constraints: ${constraints || 'none'}

Rules:
- Return only valid JSON. No markdown.
- Recommend realistic places for the destination area.
- Include coordinates only when confident; otherwise use null.
- Keep total cost close to the budget.
- Use Sri Lankan local names where relevant.

Return this JSON shape:
{
  "summary": "brief trip overview",
  "destinationArea": "${destinationArea}",
  "totalEstimatedCost": 0,
  "routeSummary": "brief route summary",
  "recommendedPlaces": [
    {
      "name": "Place name",
      "category": "Beach | Cultural | Nature | Food | Adventure | City | Other",
      "reason": "Why this place fits the traveler",
      "estimatedEntryFee": 0,
      "bestTimeToVisit": "Morning/Afternoon/Evening",
      "coordinates": { "lat": null, "lng": null },
      "confidenceNote": ""
    }
  ],
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day title",
      "activities": [
        {
          "time": "09:00 AM",
          "placeName": "Place name",
          "description": "What to do here",
          "estimatedCost": 0,
          "duration": "2 hours",
          "tips": "Practical tip"
        }
      ],
      "accommodation": "Suggested accommodation",
      "meals": ["Breakfast suggestion", "Lunch suggestion", "Dinner suggestion"],
      "estimatedDailyCost": 0
    }
  ]
}`;

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 6000,
    response_format: { type: 'json_object' },
  });

  return normalizeAIPlan(parseGroqJson(response.choices[0]?.message?.content || '{}'));
};

exports.createTrip = async (req, res) => {
  try {
    const { destinationArea, startingPoint, startDate, endDate, budget, passengers, tripType, pace, preferences, constraints } = req.body;
    const trip = await Trip.create({
      user: req.user.id,
      destinationArea,
      startingPoint,
      startDate,
      endDate,
      budget,
      passengers,
      tripType,
      pace,
      preferences,
      constraints
    });
    res.status(201).json({ success: true, trip });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create trip', error: error.message });
  }
};

exports.getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.status(200).json({ success: true, trip });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.generateAITripPlan = async (req, res) => {
  try {
    const {
      destinationArea,
      startingPoint,
      startDate,
      endDate,
      budget,
      passengers = 1,
      preferences = [],
      pace = 'balanced',
      constraints = '',
    } = req.body;

    validateAITripInputs({ destinationArea, startDate, endDate, budget });

    const aiPlan = await requestAIPlan({
      destinationArea,
      startingPoint,
      startDate,
      endDate,
      budget,
      passengers: Number(passengers),
      preferences: Array.isArray(preferences) ? preferences : [],
      pace,
      constraints,
    });

    const trip = await Trip.create({
      user: req.user.id,
      destinationArea,
      startingPoint,
      startDate,
      endDate,
      budget: Number(budget),
      passengers: Number(passengers),
      preferences,
      pace,
      constraints,
      aiRecommendedPlaces: aiPlan.recommendedPlaces,
      aiItinerary: aiPlan.days,
      aiPlanSummary: aiPlan.summary,
      totalEstimatedCost: Number(aiPlan.totalEstimatedCost || 0),
      routeSummary: aiPlan.routeSummary || '',
      status: 'draft',
    });

    res.status(201).json({ success: true, trip, aiPlan });
  } catch (error) {
    console.error('AI Trip Plan Error:', error);
    res.status(error.statusCode || 500).json({ message: 'Failed to generate AI trip plan', error: error.message });
  }
};

exports.getAITripPlan = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    res.status(200).json({
      success: true,
      aiPlan: {
        summary: trip.aiPlanSummary,
        destinationArea: trip.destinationArea,
        totalEstimatedCost: trip.totalEstimatedCost,
        routeSummary: trip.routeSummary,
        recommendedPlaces: trip.aiRecommendedPlaces,
        days: trip.aiItinerary,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.regenerateAITripPlan = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const inputs = {
      destinationArea: req.body.destinationArea || trip.destinationArea,
      startingPoint: req.body.startingPoint || trip.startingPoint,
      startDate: req.body.startDate || trip.startDate,
      endDate: req.body.endDate || trip.endDate,
      budget: req.body.budget || trip.budget,
      passengers: Number(req.body.passengers || trip.passengers),
      preferences: req.body.preferences || trip.preferences || [],
      pace: req.body.pace || trip.pace || 'balanced',
      constraints: req.body.constraints || trip.constraints || '',
    };

    validateAITripInputs(inputs);

    const aiPlan = await requestAIPlan(inputs);

    Object.assign(trip, {
      ...inputs,
      budget: Number(inputs.budget),
      aiRecommendedPlaces: aiPlan.recommendedPlaces,
      aiItinerary: aiPlan.days,
      aiPlanSummary: aiPlan.summary,
      totalEstimatedCost: Number(aiPlan.totalEstimatedCost || 0),
      routeSummary: aiPlan.routeSummary || '',
      status: 'draft',
    });

    await trip.save();
    res.status(200).json({ success: true, trip, aiPlan });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: 'Failed to regenerate AI trip plan', error: error.message });
  }
};

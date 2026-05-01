const { v4: uuidv4 } = require('uuid');
const SavedCard = require('../models/SavedCard');

const normalizeCardPayload = ({ cardHolderName, last4, brand, expiryMonth, expiryYear, nickname }) => ({
  cardHolderName: String(cardHolderName || '').trim(),
  last4: String(last4 || '').replace(/\D/g, '').slice(-4),
  brand: String(brand || '').trim(),
  expiryMonth: Number(expiryMonth),
  expiryYear: Number(expiryYear),
  nickname: String(nickname || '').trim(),
});

const validateCardPayload = (payload) => {
  const currentYear = new Date().getFullYear();
  if (!payload.cardHolderName || !payload.brand || payload.last4.length !== 4) {
    const error = new Error('Card holder, brand, and last 4 digits are required');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(payload.expiryMonth) || payload.expiryMonth < 1 || payload.expiryMonth > 12) {
    const error = new Error('Expiry month must be between 1 and 12');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(payload.expiryYear) || payload.expiryYear < currentYear) {
    const error = new Error('Expiry year is invalid');
    error.statusCode = 400;
    throw error;
  }
};

exports.createCard = async (req, res) => {
  try {
    const payload = normalizeCardPayload(req.body);
    validateCardPayload(payload);

    const existingCount = await SavedCard.countDocuments({ user: req.user.id });
    if (req.body.isDefault || existingCount === 0) {
      await SavedCard.updateMany({ user: req.user.id }, { isDefault: false });
    }

    const card = await SavedCard.create({
      user: req.user.id,
      ...payload,
      isDefault: req.body.isDefault || existingCount === 0,
      gatewayToken: `tok_${uuidv4()}`,
    });

    res.status(201).json({ success: true, card });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server Error', error: error.message });
  }
};

exports.getCards = async (req, res) => {
  try {
    const cards = await SavedCard.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: cards.length, cards });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.setDefaultCard = async (req, res) => {
  try {
    const card = await SavedCard.findOne({ _id: req.params.id, user: req.user.id });
    if (!card) return res.status(404).json({ message: 'Card not found' });

    await SavedCard.updateMany({ user: req.user.id }, { isDefault: false });
    card.isDefault = true;
    await card.save();

    res.status(200).json({ success: true, card });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateCardNickname = async (req, res) => {
  try {
    const card = await SavedCard.findOne({ _id: req.params.id, user: req.user.id });
    if (!card) return res.status(404).json({ message: 'Card not found' });

    card.nickname = String(req.body.nickname || '').trim();
    await card.save();

    res.status(200).json({ success: true, card });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.deleteCard = async (req, res) => {
  try {
    const card = await SavedCard.findOne({ _id: req.params.id, user: req.user.id });
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const wasDefault = card.isDefault;
    await card.deleteOne();

    if (wasDefault) {
      const nextCard = await SavedCard.findOne({ user: req.user.id }).sort({ createdAt: -1 });
      if (nextCard) {
        nextCard.isDefault = true;
        await nextCard.save();
      }
    }

    res.status(200).json({ success: true, message: 'Card removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

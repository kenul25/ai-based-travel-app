const express = require('express');
const router = express.Router();
const {
  createCard,
  getCards,
  setDefaultCard,
  updateCardNickname,
  deleteCard,
} = require('../controllers/savedCardController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole('traveler'));

router.post('/', createCard);
router.get('/', getCards);
router.put('/:id/set-default', setDefaultCard);
router.put('/:id/nickname', updateCardNickname);
router.delete('/:id', deleteCard);

module.exports = router;

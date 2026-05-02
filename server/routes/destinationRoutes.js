const express = require('express');
const {
  createDestination,
  deleteDestination,
  getDestinationById,
  getDestinationCategories,
  getDestinations,
  updateDestination,
} = require('../controllers/destinationController');
const { optionalVerifyToken, verifyToken, requireRole } = require('../middleware/authMiddleware');
const { destinationUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', optionalVerifyToken, getDestinations);
router.get('/categories', getDestinationCategories);
router.get('/:id', optionalVerifyToken, getDestinationById);

router.use(verifyToken, requireRole('admin', 'superadmin'));
router.post('/', destinationUpload.single('image'), createDestination);
router.put('/:id', destinationUpload.single('image'), updateDestination);
router.delete('/:id', deleteDestination);

module.exports = router;

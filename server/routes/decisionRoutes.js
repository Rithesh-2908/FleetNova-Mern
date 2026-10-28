import express from 'express';
import {
  getDecisions,
  createDecision,
  overrideDecision,
  updateDecision,
  deleteDecision
} from '../controllers/decisionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getDecisions)
  .post(protect, authorize('admin', 'fleet_manager'), createDecision);

router.route('/:id')
  .put(protect, authorize('admin', 'fleet_manager'), updateDecision)
  .delete(protect, authorize('admin'), deleteDecision);

// Admin-only route to edit or change the decisions made by manager
router.put('/:id/override', protect, authorize('admin'), overrideDecision);

export default router;

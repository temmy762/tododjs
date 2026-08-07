import express from 'express';
import { getOverview } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
import { reconcileSubscriptions } from '../services/subscriptionReconciler.js';

const router = express.Router();

router.get('/overview', protect, authorize('admin'), getOverview);

// Manually trigger a Stripe->DB subscription reconciliation. The job also runs
// on a timer, but this lets an admin resolve a "I paid and I'm still on Free"
// complaint immediately instead of waiting for the next scheduled pass.
// ?dryRun=1 reports what would change without writing.
router.post('/reconcile-subscriptions', protect, authorize('admin'), async (req, res) => {
  try {
    const report = await reconcileSubscriptions({ dryRun: req.query.dryRun === '1' });
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error('[reconcile-subscriptions]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

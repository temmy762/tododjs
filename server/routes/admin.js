import express from 'express';
import { getOverview } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
import { reconcileSubscriptions } from '../services/subscriptionReconciler.js';
import { detectAccessDrift } from '../services/accessDriftMonitor.js';

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

// The reverse of reconcile: which accounts does our record grant that Stripe
// was never paid for? Read-only — it reports and never revokes. The scheduled
// job runs this daily; this endpoint is for looking on demand.
router.get('/access-drift', protect, authorize('admin'), async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const report = await detectAccessDrift({ limit });
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error('[access-drift]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

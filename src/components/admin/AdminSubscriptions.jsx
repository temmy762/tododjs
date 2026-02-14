import { useState, useEffect } from 'react';
import { Edit, TrendingUp, Users, DollarSign, Loader, CreditCard } from 'lucide-react';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authHeaders = () => {
  const h = {};
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
};

export default function AdminSubscriptions() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, premiumCount: 0, proCount: 0, freeCount: 0, newThisMonth: 0 });
  const [editingPlan, setEditingPlan] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/users?limit=1`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          const s = data.stats;
          setStats({
            ...s,
            freeCount: s.totalUsers - s.premiumCount - s.proCount
          });
        }
      } catch (err) {
        console.error('Failed to fetch subscription stats:', err.message || err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      subscribers: stats.freeCount,
      features: ['5 downloads/day', 'MP3 quality', 'Basic support'],
      color: 'from-gray-500 to-gray-600',
      active: true
    },
    {
      id: 'premium',
      name: 'Premium',
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      subscribers: stats.premiumCount,
      features: ['50 downloads/day', 'WAV/MP3 quality', 'Priority support', 'Exclusive content'],
      color: 'from-purple-500 to-pink-500',
      active: true
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      subscribers: stats.proCount,
      features: ['Unlimited downloads', 'WAV/FLAC quality', '24/7 support', 'Early access', 'API access'],
      color: 'from-orange-500 to-red-500',
      active: true
    }
  ];

  const estimatedRevenue = (stats.premiumCount * 9.99 + stats.proCount * 19.99).toFixed(0);
  const paidPercent = stats.totalUsers > 0
    ? ((stats.premiumCount + stats.proCount) / stats.totalUsers * 100).toFixed(1)
    : '0';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Membership Management</h2>
        <p className="text-brand-text-tertiary">Manage pricing plans and membership settings</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 text-accent animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-8 h-8 text-accent" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">${Number(estimatedRevenue).toLocaleString()}</h3>
              <p className="text-sm text-brand-text-tertiary">Est. Monthly Revenue</p>
            </div>
            <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 text-accent" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{stats.totalUsers.toLocaleString()}</h3>
              <p className="text-sm text-brand-text-tertiary">Total Members</p>
            </div>
            <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-8 h-8 text-accent" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{paidPercent}%</h3>
              <p className="text-sm text-brand-text-tertiary">Paid Conversion</p>
            </div>
            <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <CreditCard className="w-8 h-8 text-accent" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{stats.newThisMonth.toLocaleString()}</h3>
              <p className="text-sm text-brand-text-tertiary">New This Month</p>
            </div>
          </div>

          {/* Subscription Plans */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Membership Plans</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-dark-elevated rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300">
                  {/* Plan Header */}
                  <div className={`bg-gradient-to-br ${plan.color} p-6 text-center`}>
                    <h4 className="text-2xl font-bold text-white mb-2">{plan.name}</h4>
                    <div className="text-4xl font-bold text-white mb-1">
                      ${plan.monthlyPrice}
                    </div>
                    <p className="text-white/80 text-sm">per month</p>
                    {plan.yearlyPrice > 0 && (
                      <p className="text-white/60 text-xs mt-2">
                        ${plan.yearlyPrice}/year (Save {Math.round((1 - (plan.yearlyPrice / (plan.monthlyPrice * 12))) * 100)}%)
                      </p>
                    )}
                  </div>

                  {/* Plan Details */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                      <div>
                        <p className="text-sm text-brand-text-tertiary">Members</p>
                        <p className="text-xl font-bold text-white">{plan.subscribers.toLocaleString()}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        plan.active 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {plan.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <p className="text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider mb-3">Features</p>
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-white">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-white/10 text-white font-medium transition-all duration-200"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Plan</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-elevated rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-2xl font-bold text-white">Edit {editingPlan.name} Plan</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Monthly Price ($)</label>
                  <input
                    type="number"
                    defaultValue={editingPlan.monthlyPrice}
                    className="w-full px-4 py-2.5 bg-dark-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Yearly Price ($)</label>
                  <input
                    type="number"
                    defaultValue={editingPlan.yearlyPrice}
                    className="w-full px-4 py-2.5 bg-dark-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Features (one per line)</label>
                <textarea
                  rows={5}
                  defaultValue={editingPlan.features.join('\n')}
                  className="w-full px-4 py-2.5 bg-dark-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  defaultChecked={editingPlan.active}
                  className="w-4 h-4 rounded border-white/20 bg-dark-surface"
                />
                <label htmlFor="active" className="text-sm font-medium text-white">Active Plan</label>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2.5 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-white/10 text-white font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-all duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

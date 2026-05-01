import { useState, useEffect } from 'react';
import { Crown, Calendar, CreditCard, Users, Smartphone, Trash2, Share2, Loader, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

export default function SubscriptionDashboard({ user, onUpdate }) {
  const { t, i18n } = useTranslation();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
    fetchDevices();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/subscriptions/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubscriptionData(data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setError(t('subscriptionMgmt.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/subscriptions/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDevices(data.data);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm(t('subscriptionMgmt.cancelConfirm'))) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/subscriptions/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchSubscriptionData();
        if (onUpdate) onUpdate();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert(t('subscriptionMgmt.failedToCancel'));
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    if (!confirm(t('subscriptionMgmt.removeDeviceConfirm'))) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/subscriptions/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchDevices();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error removing device:', error);
      alert(t('subscriptionMgmt.failedToCancel'));
    }
  };

  const handleShareSubscription = async (e) => {
    e.preventDefault();
    setShareLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/subscriptions/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: shareEmail })
      });
      const data = await res.json();
      if (data.success) {
        alert(t('subscriptionMgmt.sharedSuccess'));
        setShareEmail('');
        fetchSubscriptionData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error sharing subscription:', error);
      alert(t('subscriptionMgmt.failedToShare'));
    } finally {
      setShareLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!subscriptionData?.hasSubscription) {
    return (
      <div className="text-center py-12">
        <Crown className="w-16 h-16 text-brand-text-tertiary mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{t('subscriptionMgmt.noActiveSubscription')}</h3>
        <p className="text-brand-text-tertiary mb-6">{t('subscriptionMgmt.subscribeToUnlock')}</p>
        <button
          onClick={() => window.location.href = '/pricing'}
          className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-150"
        >
          {t('subscription.viewPlans')}
        </button>
      </div>
    );
  }

  const { subscription, plan, daysRemaining } = subscriptionData;

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <Crown className="w-16 h-16 text-brand-text-tertiary mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{t('subscriptionMgmt.noActiveSubscription')}</h3>
        <p className="text-brand-text-tertiary mb-6">{t('subscriptionMgmt.subscribeToUnlock')}</p>
        <button onClick={() => window.location.href = '/pricing'} className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-150">
          {t('subscription.viewPlans')}
        </button>
      </div>
    );
  }

  const isSpanish = i18n.language === 'es';
  // For admin-granted plans, plan document is null — derive name from subscription.plan
  const normalizePlanName = (raw) => {
    if (!raw || raw === 'free') return 'Free';
    if (['premium', 'individual-monthly', 'individual-quarterly'].includes(raw)) return 'Premium';
    if (['pro', 'shared-monthly', 'shared-quarterly'].includes(raw)) return 'Pro';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const planName = plan ? (isSpanish ? plan.nameEs : plan.name) : normalizePlanName(subscription?.plan);

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{t('subscription.currentPlan')}</h2>
            <p className="text-sm text-brand-text-tertiary">{t('subscription.subscriptionDetails')}</p>
          </div>
          <div className={`self-start px-4 py-2 rounded-full border whitespace-nowrap ${
            subscription.status === 'active' ? 'bg-green-500/10 border-green-500/20' :
            subscription.status === 'cancelled' ? 'bg-yellow-500/10 border-yellow-500/20' :
            'bg-red-500/10 border-red-500/20'
          }`}>
            <span className={`text-sm font-semibold capitalize ${
              subscription.status === 'active' ? 'text-green-400' :
              subscription.status === 'cancelled' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {t(`subscription.${subscription.status}`)}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Plan Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm text-brand-text-tertiary">{t('subscription.currentPlan')}</p>
                <p className="text-lg font-semibold text-white">{planName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm text-brand-text-tertiary">{t('subscription.expiresOn')}</p>
                <p className="text-lg font-semibold text-white">
                  {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm text-brand-text-tertiary">{t('subscription.daysRemaining')}</p>
                <p className="text-lg font-semibold text-white">{daysRemaining === -1 ? t('subscription.unlimited', 'Unlimited') : `${daysRemaining} ${t('admin.days')}`}</p>
              </div>
            </div>
          </div>

          {/* Actions — only show cancel for Stripe-managed (non-admin-granted) plans */}
          <div className="space-y-3">
            {subscription.status === 'active' && !subscription.grantedByAdmin && (
              <button
                onClick={handleCancelSubscription}
                className="w-full py-3 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                {t('subscription.cancelSubscription')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Device Management */}
      {plan?.type === 'shared' && (
        <div className="bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-accent" />
            {t('subscription.devices')}
          </h3>
          <p className="text-sm text-brand-text-tertiary mb-4">
            {t('subscriptionMgmt.devicesRegistered', { current: devices.length, max: plan?.features?.maxDevices ?? '—' })}
          </p>

          {devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.deviceId}
                  className="flex items-center justify-between p-4 bg-dark-elevated rounded-lg border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-brand-text-tertiary" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {typeof device.deviceInfo === 'object'
                          ? (device.deviceInfo?.deviceName || device.deviceInfo?.browser || 'Unknown Device')
                          : (device.deviceInfo || 'Unknown Device')}
                      </p>
                      <p className="text-xs text-brand-text-tertiary">
                        {t('subscriptionMgmt.lastActive')} {new Date(device.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDevice(device.deviceId)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-text-tertiary">{t('subscriptionMgmt.noDevicesYet')}</p>
          )}
        </div>
      )}

    </div>
  );
}

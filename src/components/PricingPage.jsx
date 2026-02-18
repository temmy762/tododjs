import { useState, useEffect } from 'react';
import { Check, Zap, Users, Crown, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

export default function PricingPage({ onSelectPlan, user }) {
  const { t, i18n } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/subscriptions/plans`);
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (type) => {
    switch (type) {
      case 'shared':
        return <Users className="w-6 h-6" />;
      default:
        return <Crown className="w-6 h-6" />;
    }
  };

  const getPlanFeatures = (plan) => {
    const isSpanish = i18n.language === 'es';
    const features = [];

    if (plan.features.fullWebAccess) {
      features.push(t('subscription.fullWebAccess'));
    }
    if (plan.features.unlimitedDownloads) {
      features.push(t('subscription.unlimitedDownloads'));
    }
    if (plan.type === 'shared') {
      features.push(t('subscription.twoUsers'));
      features.push(t('subscription.twoDevices'));
    }
    if (plan.features.whatsappSupport) {
      features.push(t('subscription.whatsappSupport'));
    }
    if (plan.features.noCommitment) {
      features.push(t('subscription.noCommitment'));
    }
    if (plan.duration === 'quarterly') {
      features.push(t('subscription.singlePayment'));
      features.push(`${plan.durationDays} ${t('subscription.daysAccess')}`);
      features.push(plan.type === 'shared' ? t('subscription.doubleAccessLessCost') : t('subscription.moreAccessLessCost'));
    }

    return features;
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan.planId);
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  const individualPlans = plans.filter(p => p.type === 'individual');
  const sharedPlans = plans.filter(p => p.type === 'shared');

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('subscription.choosePlan')}
          </h1>
          <p className="text-lg text-brand-text-tertiary max-w-2xl mx-auto">
            {t('subscription.subscribeToDownload')}
          </p>
        </div>

        {/* Individual Plans */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Crown className="w-6 h-6 text-accent" />
            {t('subscription.individual')}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {individualPlans.map((plan) => (
              <PlanCard
                key={plan.planId}
                plan={plan}
                features={getPlanFeatures(plan)}
                icon={getPlanIcon(plan.type)}
                onSelect={() => handleSelectPlan(plan)}
                isSelected={selectedPlan === plan.planId}
                t={t}
                i18n={i18n}
              />
            ))}
          </div>
        </div>

        {/* Shared Plans */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" />
            {t('subscription.shared')}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {sharedPlans.map((plan) => (
              <PlanCard
                key={plan.planId}
                plan={plan}
                features={getPlanFeatures(plan)}
                icon={getPlanIcon(plan.type)}
                onSelect={() => handleSelectPlan(plan)}
                isSelected={selectedPlan === plan.planId}
                t={t}
                i18n={i18n}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, features, icon, onSelect, isSelected, t, i18n }) {
  const isSpanish = i18n.language === 'es';
  const planName = isSpanish ? plan.nameEs : plan.name;
  const badge = isSpanish ? plan.badgeEs : plan.badge;
  const periodText = plan.duration === 'monthly' ? t('subscription.perMonth') : t('subscription.per3Months');

  return (
    <div
      className={`relative bg-dark-surface/95 backdrop-blur-xl rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
        isSelected
          ? 'border-accent shadow-2xl shadow-accent/30'
          : plan.isBestOption
          ? 'border-accent/50 shadow-xl shadow-accent/20'
          : 'border-white/10 hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-accent to-accent-hover rounded-full text-white text-sm font-bold shadow-lg">
          {badge}
        </div>
      )}

      <div className="p-8">
        {/* Icon and Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{planName}</h3>
            <p className="text-sm text-brand-text-tertiary capitalize">
              {t(`subscription.${plan.duration}`)}
            </p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">€{plan.price}</span>
            <span className="text-brand-text-tertiary">{periodText}</span>
          </div>
          {plan.duration === 'quarterly' && (
            <p className="text-sm text-green-400 mt-1">
              {t('subscription.moreAccessLessCost')}
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <span className="text-sm text-brand-text-secondary">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
            isSelected
              ? 'bg-white text-black'
              : 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40'
          }`}
        >
          {isSelected ? t('common.selected') : t('subscription.subscribe')}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Trash2, Check, Loader, AlertCircle, CheckCircle, X } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

function AddCardForm({ onSuccess, onCancel, isSpanish }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError('');

    const { error: submitErr } = await elements.submit();
    if (submitErr) { setError(submitErr.message); setSaving(false); return; }

    const { setupIntent, error: confirmErr } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required'
    });

    if (confirmErr) { setError(confirmErr.message); setSaving(false); return; }

    if (setupIntent?.payment_method) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/subscriptions/payment-method`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paymentMethodId: setupIntent.payment_method })
        });
        const data = await res.json();
        if (data.success) onSuccess();
        else setError(data.message || 'Failed to save card');
      } catch { setError('Network error. Please try again.'); }
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={!stripe || saving}
          className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
          {saving && <Loader className="w-4 h-4 animate-spin" />}
          {saving
            ? (isSpanish ? 'Guardando…' : 'Saving…')
            : (isSpanish ? 'Guardar tarjeta' : 'Save card')}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 border border-white/10 text-brand-text-tertiary hover:text-white rounded-lg transition-colors text-sm">
          {isSpanish ? 'Cancelar' : 'Cancel'}
        </button>
      </div>
    </form>
  );
}

function CardBrandBadge({ brand }) {
  const b = (brand || '').toLowerCase();
  if (b === 'visa') return (
    <span className="inline-flex items-center justify-center w-10 h-6 bg-blue-700 rounded text-white text-[10px] font-black tracking-widest shrink-0">VISA</span>
  );
  if (b === 'mastercard') return (
    <span className="inline-flex items-center justify-center w-10 h-6 rounded overflow-hidden shrink-0">
      <span className="w-5 h-5 bg-red-500 rounded-full -mr-2 opacity-90" />
      <span className="w-5 h-5 bg-yellow-400 rounded-full opacity-90" />
    </span>
  );
  if (b === 'amex') return (
    <span className="inline-flex items-center justify-center w-10 h-6 bg-sky-600 rounded text-white text-[9px] font-bold shrink-0">AMEX</span>
  );
  return <CreditCard className="w-5 h-5 text-brand-text-tertiary shrink-0" />;
}

export default function PaymentMethods({ user }) {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language?.startsWith('es');

  const [cards, setCards] = useState([]);
  const [defaultId, setDefaultId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddCard, setShowAddCard] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  const [removingId, setRemovingId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  const token = localStorage.getItem('token');
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/subscriptions/payment-methods`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setCards(data.data.cards);
        setDefaultId(data.data.defaultId);
      }
    } catch {
      setError(isSpanish ? 'Error al cargar las tarjetas' : 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const openAddCard = async () => {
    setSetupLoading(true);
    setShowAddCard(true);
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/subscriptions/setup-intent`, {
        method: 'POST', headers: authHeaders
      });
      const data = await res.json();
      if (data.success) setSetupClientSecret(data.clientSecret);
      else { setShowAddCard(false); setError(data.message); }
    } catch {
      setShowAddCard(false);
      setError(isSpanish ? 'Error al conectar con Stripe' : 'Failed to connect to Stripe');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCardAdded = async () => {
    setShowAddCard(false);
    setSetupClientSecret('');
    await fetchCards();
    showSuccess(isSpanish ? 'Tarjeta añadida correctamente.' : 'Card added successfully.');
  };

  const handleSetDefault = async (pmId) => {
    setSettingDefaultId(pmId);
    try {
      const res = await fetch(`${API_URL}/subscriptions/payment-method`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: pmId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchCards();
        showSuccess(isSpanish ? 'Tarjeta predeterminada actualizada.' : 'Default card updated.');
      } else setError(data.message);
    } catch { setError(isSpanish ? 'Error al actualizar' : 'Failed to update'); }
    finally { setSettingDefaultId(null); }
  };

  const handleRemove = async (pmId) => {
    if (!confirm(isSpanish ? '¿Eliminar esta tarjeta?' : 'Remove this card?')) return;
    setRemovingId(pmId);
    try {
      const res = await fetch(`${API_URL}/subscriptions/payment-method/${pmId}`, {
        method: 'DELETE', headers: authHeaders
      });
      const data = await res.json();
      if (data.success) {
        await fetchCards();
        showSuccess(isSpanish ? 'Tarjeta eliminada.' : 'Card removed.');
      } else setError(data.message);
    } catch { setError(isSpanish ? 'Error al eliminar' : 'Failed to remove'); }
    finally { setRemovingId(null); }
  };

  const showSuccess = (msg) => {
    setError('');
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const isPastDue = user?.subscription?.status === 'past_due';

  return (
    <div className="space-y-4">

      {/* Payment failure banner */}
      {isPastDue && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400 font-medium">
            {isSpanish
              ? 'Tu último cobro falló. Añade o actualiza tu tarjeta para recuperar el acceso a las descargas.'
              : 'Your last charge failed. Add or update your card below to regain download access.'}
          </p>
        </div>
      )}

      {/* Success / error banners */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {/* Card list */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-accent" />
            {isSpanish ? 'Métodos de pago' : 'Payment methods'}
          </h3>
          <button onClick={openAddCard} disabled={setupLoading || showAddCard}
            className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-white transition-colors disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" />
            {isSpanish ? 'Añadir tarjeta' : 'Add card'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : cards.length === 0 && !showAddCard ? (
          <div className="text-center py-8 px-4">
            <CreditCard className="w-8 h-8 text-brand-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-brand-text-tertiary mb-3">
              {isSpanish ? 'No tienes ninguna tarjeta guardada.' : 'No saved cards yet.'}
            </p>
            <button onClick={openAddCard}
              className="text-sm text-accent hover:text-white font-semibold transition-colors flex items-center gap-1.5 mx-auto">
              <Plus className="w-4 h-4" />
              {isSpanish ? 'Añadir tarjeta' : 'Add a card'}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {cards.map(card => (
              <li key={card.id} className="flex items-center gap-3 px-4 py-3.5">
                <CardBrandBadge brand={card.brand} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">
                    •••• •••• •••• {card.last4}
                  </p>
                  <p className="text-xs text-brand-text-tertiary">
                    {isSpanish ? 'Vence' : 'Expires'} {String(card.expMonth).padStart(2, '0')} / {card.expYear}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {card.isDefault ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                      <Check className="w-3 h-3" />
                      {isSpanish ? 'Predeterminada' : 'Default'}
                    </span>
                  ) : (
                    <button onClick={() => handleSetDefault(card.id)} disabled={!!settingDefaultId}
                      className="text-xs text-brand-text-tertiary hover:text-accent transition-colors font-medium flex items-center gap-1 disabled:opacity-50">
                      {settingDefaultId === card.id ? <Loader className="w-3 h-3 animate-spin" /> : null}
                      {isSpanish ? 'Usar como predeterminada' : 'Set as default'}
                    </button>
                  )}
                  <button onClick={() => handleRemove(card.id)} disabled={removingId === card.id}
                    className="p-1.5 rounded hover:bg-red-500/10 text-brand-text-tertiary hover:text-red-400 transition-colors disabled:opacity-50">
                    {removingId === card.id
                      ? <Loader className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Inline add card form */}
        {showAddCard && (
          <div className="px-4 py-4 border-t border-white/5">
            <p className="text-sm font-semibold text-white mb-3">
              {isSpanish ? 'Nueva tarjeta' : 'New card'}
            </p>
            {setupLoading || !setupClientSecret ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-accent animate-spin" />
              </div>
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#e50914' } } }}>
                <AddCardForm
                  onSuccess={handleCardAdded}
                  onCancel={() => { setShowAddCard(false); setSetupClientSecret(''); }}
                  isSpanish={isSpanish}
                />
              </Elements>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-brand-text-tertiary px-1">
        {isSpanish
          ? 'Tus datos de pago están protegidos por Stripe. No almacenamos información de tarjetas.'
          : 'Your payment details are secured by Stripe. We never store card data.'}
      </p>
    </div>
  );
}

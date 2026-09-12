import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Ticket, Plus, X, Loader, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import API_URL from '../../config/api';

const API = API_URL;
const authHeaders = (json = false) => {
  const h = {};
  const token = localStorage.getItem('token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

export default function AdminCoupons() {
  const { t, i18n } = useTranslation();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/coupons`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setCodes(data.data || []);
      else setError(data.message || t('coupons.loadFailed', 'Could not load discount codes'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleToggle = async (row) => {
    setBusyId(row.id);
    try {
      const res = await fetch(`${API}/coupons/${row.id}`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ active: !row.active }),
      });
      const data = await res.json();
      if (data.success) fetchCodes();
      else setError(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row) => {
    setBusyId(row.id);
    try {
      const res = await fetch(`${API}/coupons/${row.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) { setConfirmDelete(null); fetchCodes(); }
      else setError(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  const isExhausted = (row) => row.maxRedemptions != null && row.timesRedeemed >= row.maxRedemptions;
  const isExpired = (row) => row.expiresAt && new Date(row.expiresAt) <= new Date();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{t('coupons.title', 'Discount Codes')}</h2>
          <p className="text-brand-text-tertiary">
            {t('coupons.subtitle', 'Codes customers can enter at checkout. Managed in Stripe.')}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('coupons.create', 'New code')}
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 text-accent animate-spin" />
        </div>
      )}

      {!loading && codes.length === 0 && (
        <div className="text-center py-20">
          <Ticket className="w-16 h-16 mx-auto mb-4 text-brand-text-tertiary opacity-30" />
          <p className="text-brand-text-tertiary text-lg">{t('coupons.empty', 'No discount codes yet')}</p>
        </div>
      )}

      {!loading && codes.length > 0 && (
        <div className="bg-dark-elevated rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-dark-surface">
                  {[
                    t('coupons.code', 'Code'),
                    t('coupons.discount', 'Discount'),
                    t('coupons.used', 'Used'),
                    t('coupons.expires', 'Expires'),
                    t('coupons.status', 'Status'),
                    t('admin.actions'),
                  ].map((h) => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {codes.map((row) => {
                  const dead = isExpired(row) || isExhausted(row);
                  return (
                    <tr key={row.id} className="hover:bg-dark-surface transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-semibold text-white tracking-wider">{row.code}</span>
                        {row.firstTimeOnly && (
                          <div className="text-[10px] text-brand-text-tertiary mt-0.5">
                            {t('coupons.firstTimeOnly', 'New customers only')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{row.description}</td>
                      <td className="px-6 py-4 text-sm text-brand-text-tertiary">
                        {row.timesRedeemed}
                        {row.maxRedemptions != null ? ` / ${row.maxRedemptions}` : ''}
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-text-tertiary">{fmtDate(row.expiresAt)}</td>
                      <td className="px-6 py-4">
                        {isExpired(row) ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            {t('coupons.expired', 'Expired')}
                          </span>
                        ) : isExhausted(row) ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            {t('coupons.usedUp', 'Used up')}
                          </span>
                        ) : row.active ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                            {t('coupons.active', 'Active')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            {t('coupons.disabled', 'Disabled')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(row)}
                            disabled={busyId === row.id || dead}
                            title={row.active ? t('coupons.disable', 'Disable') : t('coupons.enable', 'Enable')}
                            className="p-2 hover:bg-dark-elevated rounded-lg transition-colors text-brand-text-tertiary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {row.active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(row)}
                            disabled={busyId === row.id}
                            title={t('coupons.retire', 'Retire')}
                            className="p-2 hover:bg-dark-elevated rounded-lg transition-colors text-brand-text-tertiary hover:text-red-400 disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateCodeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchCodes(); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-dark-surface rounded-2xl border border-white/10 p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">{t('coupons.retireTitle', 'Retire this code?')}</h3>
            <p className="font-mono text-accent font-semibold mb-4">{confirmDelete.code}</p>
            <p className="text-brand-text-tertiary text-sm mb-6">
              {t('coupons.retireBody', 'The code stops working immediately. Customers already receiving this discount keep it — retiring a code never raises an existing subscriber’s price.')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={busyId === confirmDelete.id}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {t('coupons.retire', 'Retire')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateCodeModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    code: '',
    kind: 'percent',
    percentOff: '',
    amountOff: '',
    duration: 'once',
    durationInMonths: '3',
    maxRedemptions: '',
    expiresAt: '',
    firstTimeOnly: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        code: form.code,
        duration: form.duration,
        ...(form.kind === 'percent'
          ? { percentOff: form.percentOff }
          : { amountOff: form.amountOff }),
        ...(form.duration === 'repeating' ? { durationInMonths: form.durationInMonths } : {}),
        ...(form.maxRedemptions ? { maxRedemptions: form.maxRedemptions } : {}),
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
        firstTimeOnly: form.firstTimeOnly,
      };
      const res = await fetch(`${API}/coupons`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) onCreated();
      else setError(data.message || t('coupons.createFailed', 'Could not create the code'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-4 py-2.5 bg-dark-elevated border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent';
  const label = 'block text-sm font-medium text-brand-text-tertiary mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-dark-surface rounded-2xl border border-white/10 p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{t('coupons.createTitle', 'New discount code')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className={label}>{t('coupons.code', 'Code')}</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="SUMMER20"
              className={`${field} font-mono tracking-wider`}
            />
            <p className="text-[10px] text-brand-text-tertiary mt-1">
              {t('coupons.codeHint', 'This is what the customer types. Letters and numbers only.')}
            </p>
          </div>

          <div>
            <label className={label}>{t('coupons.discountType', 'Discount')}</label>
            <div className="flex gap-2">
              <select value={form.kind} onChange={(e) => set('kind', e.target.value)} className={`${field} flex-1`}>
                <option value="percent">{t('coupons.percentOff', 'Percentage off')}</option>
                <option value="amount">{t('coupons.amountOff', 'Fixed amount off')}</option>
              </select>
              {form.kind === 'percent' ? (
                <input
                  type="number" min="1" max="100"
                  value={form.percentOff}
                  onChange={(e) => set('percentOff', e.target.value)}
                  placeholder="20"
                  className={`${field} w-28`}
                />
              ) : (
                <input
                  type="number" min="0.01" step="0.01"
                  value={form.amountOff}
                  onChange={(e) => set('amountOff', e.target.value)}
                  placeholder="10.00"
                  className={`${field} w-28`}
                />
              )}
            </div>
          </div>

          <div>
            <label className={label}>{t('coupons.appliesTo', 'Applies to')}</label>
            <select value={form.duration} onChange={(e) => set('duration', e.target.value)} className={field}>
              <option value="once">{t('coupons.durationOnce', 'The first payment only')}</option>
              <option value="repeating">{t('coupons.durationRepeating', 'The first few months')}</option>
              <option value="forever">{t('coupons.durationForever', 'Every renewal, forever')}</option>
            </select>
            {form.duration === 'repeating' && (
              <input
                type="number" min="1"
                value={form.durationInMonths}
                onChange={(e) => set('durationInMonths', e.target.value)}
                className={`${field} mt-2`}
                placeholder={t('coupons.months', 'Number of months')}
              />
            )}
            {form.duration === 'forever' && (
              <p className="text-[10px] text-yellow-400/80 mt-1">
                {t('coupons.foreverWarning', 'Every renewal is discounted for as long as the customer stays subscribed.')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>{t('coupons.maxRedemptions', 'Usage limit')}</label>
              <input
                type="number" min="1"
                value={form.maxRedemptions}
                onChange={(e) => set('maxRedemptions', e.target.value)}
                placeholder={t('coupons.unlimited', 'Unlimited')}
                className={field}
              />
            </div>
            <div>
              <label className={label}>{t('coupons.expiresAt', 'Expiry date')}</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => set('expiresAt', e.target.value)}
                className={field}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.firstTimeOnly}
              onChange={(e) => set('firstTimeOnly', e.target.checked)}
              className="accent-accent w-4 h-4"
            />
            <span className="text-sm text-white">{t('coupons.firstTimeOnly', 'New customers only')}</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader className="w-4 h-4 animate-spin" />}
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

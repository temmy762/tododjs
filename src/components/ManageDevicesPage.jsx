import { useState, useEffect, useCallback } from 'react';
import { Monitor, Smartphone, Tablet, Loader, Trash2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import API_URL from '../config/api';

/**
 * Standalone device-management page, reached only from the emailed link sent
 * when a login is refused by the device limit.
 *
 * The person who needs to act is at the BLOCKED device, which has no session —
 * so this page authenticates with the emailed token alone and is deliberately
 * inert otherwise: no navigation, no downloads, no profile, no subscription,
 * no music, no admin. It can list this account's devices and remove one.
 */
export default function ManageDevicesPage() {
  const token = new URLSearchParams(window.location.search).get('token');

  const [state, setState] = useState('loading'); // loading | ready | expired | error
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [removed, setRemoved] = useState(false);

  const load = useCallback(async () => {
    if (!token) { setState('expired'); return; }
    try {
      const res = await fetch(`${API_URL}/devices/manage?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setState(json.expired ? 'expired' : 'error');
        setError(json.message || 'Could not load your devices.');
        return;
      }
      setData(json.data);
      setState('ready');
    } catch {
      setState('error');
      setError('Network error. Please check your connection and try again.');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (deviceId) => {
    setRemovingId(deviceId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/devices/manage/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.expired) { setState('expired'); return; }
        setError(json.message || 'Could not remove the device.');
        return;
      }
      setData(d => ({ ...d, ...json.data }));
      setRemoved(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const iconFor = (type) => (type === 'mobile' ? Smartphone : type === 'tablet' ? Tablet : Monitor);

  const timeAgo = (d) => {
    if (!d) return 'Never used';
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'Active now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl p-7 shadow-2xl">
        {children}
      </div>
    </div>
  );

  if (state === 'loading') {
    return <Shell><div className="flex flex-col items-center py-10 gap-3">
      <Loader className="w-7 h-7 text-red-500 animate-spin" />
      <p className="text-white/50 text-sm">Loading your devices…</p>
    </div></Shell>;
  }

  if (state === 'expired') {
    return <Shell>
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">This link has expired</h1>
        <p className="text-sm text-white/50 leading-relaxed mb-6">
          For your security these links are only valid for 30 minutes. Try signing in again
          and we&apos;ll email you a fresh one.
        </p>
        <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
          Go to sign in <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </Shell>;
  }

  if (state === 'error') {
    return <Shell>
      <div className="text-center py-6">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-white/50 mb-5">{error}</p>
        <button onClick={load} className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl transition-colors">
          Try again
        </button>
      </div>
    </Shell>;
  }

  const full = data.slotsFree === 0;

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1.5">Manage your devices</h1>
        <p className="text-sm text-white/50 leading-relaxed">
          {data.email} · {data.devices.length} of {data.maxDevices} device{data.maxDevices > 1 ? 's' : ''} in use
        </p>
      </div>

      {removed && (
        <div className="mb-5 p-4 rounded-xl bg-green-500/10 border border-green-500/25">
          <div className="flex items-start gap-2.5 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-300">Device removed</p>
              <p className="text-xs text-green-200/60 mt-0.5">
                That device has been signed out. You can now sign in on this one.
              </p>
            </div>
          </div>
          <a href="/" className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Continue to sign in <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {!removed && full && (
        <p className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 mb-4">
          Your plan allows {data.maxDevices} device{data.maxDevices > 1 ? 's' : ''}. Remove one below to free a slot.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-4">{error}</p>
      )}

      <div className="space-y-2.5">
        {data.devices.map((d) => {
          const Icon = iconFor(d.deviceType);
          return (
            <div key={d.deviceId} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-white/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{d.deviceName}</p>
                <p className="text-xs text-white/40 truncate">{d.browser} · {d.os} · {timeAgo(d.lastActive)}</p>
              </div>
              <button
                onClick={() => handleRemove(d.deviceId)}
                disabled={removingId === d.deviceId}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {removingId === d.deviceId
                  ? <Loader className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
                Remove
              </button>
            </div>
          );
        })}
        {data.devices.length === 0 && (
          <p className="text-sm text-white/40 text-center py-8">No devices registered. You can sign in normally.</p>
        )}
      </div>

      <p className="text-[11px] text-white/25 text-center mt-6 leading-relaxed">
        This page can only view and remove devices on your account.
        The link expires 30 minutes after it was sent.
      </p>
    </Shell>
  );
}

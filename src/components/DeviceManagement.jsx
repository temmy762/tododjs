import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Monitor, Tablet, Trash2, Edit2, LogOut, Loader, AlertTriangle, CheckCircle, X, Fingerprint } from 'lucide-react';
import API_URL from '../config/api';
import { verifyUserForAction, isPlatformAuthenticatorAvailable } from '../services/passkeyService';

const API = API_URL;
const getToken = () => localStorage.getItem('token');
const authHeaders = (json = false) => {
  const h = {};
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

export default function DeviceManagement() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [maxDevices, setMaxDevices] = useState(2);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [showSignOutAll, setShowSignOutAll] = useState(false);
  const [notification, setNotification] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    fetchDevices();
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    const available = await isPlatformAuthenticatorAvailable();
    setBiometricAvailable(available);
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/devices`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setDevices(data.data.devices);
        setMaxDevices(data.data.maxDevices);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      showNotification(t('deviceMgmt.failedLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    // Verify user with biometric authentication
    const verified = await verifyUserForAction('remove this device');
    if (!verified) {
      showNotification(t('deviceMgmt.authRequired'), 'error');
      return;
    }

    setActionLoading(deviceId);
    try {
      const res = await fetch(`${API}/devices/${deviceId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotification(t('deviceMgmt.deviceRemoved'), 'success');
        fetchDevices();
      } else {
        showNotification(data.message || t('deviceMgmt.failedRemove'), 'error');
      }
    } catch (err) {
      showNotification(t('deviceMgmt.failedRemove'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenameDevice = async (deviceId) => {
    if (!newDeviceName.trim()) {
      showNotification(t('deviceMgmt.emptyName'), 'error');
      return;
    }

    setActionLoading(deviceId);
    try {
      const res = await fetch(`${API}/devices/${deviceId}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ deviceName: newDeviceName })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(t('deviceMgmt.deviceRenamed'), 'success');
        setEditingDevice(null);
        setNewDeviceName('');
        fetchDevices();
      } else {
        showNotification(data.message || t('deviceMgmt.failedRename'), 'error');
      }
    } catch (err) {
      showNotification(t('deviceMgmt.failedRename'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignOutAll = async () => {
    // Verify user with biometric authentication
    const verified = await verifyUserForAction('sign out from all devices');
    if (!verified) {
      showNotification(t('deviceMgmt.authRequired'), 'error');
      setShowSignOutAll(false);
      return;
    }

    setActionLoading('signout-all');
    try {
      const res = await fetch(`${API}/devices/signout-all`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotification(t('deviceMgmt.signedOutAll'), 'success');
        setShowSignOutAll(false);
        fetchDevices();
      } else {
        showNotification(data.message || t('deviceMgmt.failedSignOut'), 'error');
      }
    } catch (err) {
      showNotification(t('deviceMgmt.failedSignOut'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanup = async () => {
    setActionLoading('cleanup');
    try {
      const res = await fetch(`${API}/devices/cleanup`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, 'success');
        fetchDevices();
      } else {
        showNotification(data.message || t('deviceMgmt.failedCleanup'), 'error');
      }
    } catch (err) {
      showNotification(t('deviceMgmt.failedCleanup'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      case 'desktop': return Monitor;
      default: return Monitor;
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('deviceMgmt.justNow');
    if (minutes < 60) return t('deviceMgmt.minutesAgo', { count: minutes });
    if (hours < 24) return t('deviceMgmt.hoursAgo', { count: hours });
    if (days < 30) return t('deviceMgmt.daysAgo', { count: days });
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Device Usage Info - Only show for paid accounts */}
      {maxDevices > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-dark-surface border border-white/10">
          <div className="flex items-center justify-between">
            <p className="text-sm text-brand-text-tertiary">
              {t('deviceMgmt.usingDevices')} <span className="font-semibold text-white">{devices.length}</span> {t('deviceMgmt.ofDevices')} <span className="font-semibold text-white">{maxDevices}</span> {t('deviceMgmt.availableDevices')}
            </p>
            {biometricAvailable && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                <Fingerprint className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400">{t('deviceMgmt.biometricEnabled')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
          notification.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="flex-1">{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleCleanup}
          disabled={actionLoading === 'cleanup'}
          className="px-4 py-2 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
        >
          {actionLoading === 'cleanup' ? <Loader className="w-4 h-4 animate-spin" /> : null}
          {t('deviceMgmt.cleanUpInactive')}
        </button>
        <button
          onClick={() => setShowSignOutAll(true)}
          disabled={devices.length === 0}
          className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {t('deviceMgmt.signOutAll')}
        </button>
      </div>

      {/* Devices List */}
      {devices.length === 0 ? (
        <div className="bg-dark-elevated rounded-xl border border-white/10 p-12 text-center">
          <Monitor className="w-16 h-16 text-brand-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">{t('deviceMgmt.noDevices')}</h3>
          <p className="text-brand-text-tertiary">{t('deviceMgmt.noDevicesDesc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.deviceType);
            const isEditing = editingDevice === device.deviceId;

            return (
              <div
                key={device.deviceId}
                className={`bg-dark-elevated rounded-xl border transition-all duration-200 ${
                  device.isCurrentDevice 
                    ? 'border-accent shadow-lg shadow-accent/20' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Device Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      device.isCurrentDevice ? 'bg-accent/20' : 'bg-dark-surface'
                    }`}>
                      <DeviceIcon className={`w-6 h-6 ${device.isCurrentDevice ? 'text-accent' : 'text-white'}`} />
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={newDeviceName}
                            onChange={(e) => setNewDeviceName(e.target.value)}
                            placeholder={device.deviceName || `${device.browser} on ${device.os}`}
                            className="flex-1 px-3 py-2 bg-dark-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameDevice(device.deviceId)}
                            disabled={actionLoading === device.deviceId}
                            className="px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-all duration-200 disabled:opacity-50"
                          >
                            {actionLoading === device.deviceId ? <Loader className="w-4 h-4 animate-spin" /> : t('actions.save')}
                          </button>
                          <button
                            onClick={() => {
                              setEditingDevice(null);
                              setNewDeviceName('');
                            }}
                            className="px-3 py-2 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-white/10 text-white transition-all duration-200"
                          >
                            {t('actions.cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {device.deviceName || `${device.browser} on ${device.os}`}
                          </h3>
                          {device.isCurrentDevice && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/20 text-accent border border-accent/30">
                              {t('deviceMgmt.thisDevice')}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="space-y-1 text-sm text-brand-text-tertiary">
                        <p className="capitalize">{device.deviceType} • {device.browser}</p>
                        <p>{t('deviceMgmt.ip')}: {device.ipAddress || 'Unknown'}</p>
                        <p>{t('deviceMgmt.lastActive')}: {formatDate(device.lastActive)}</p>
                        <p className="text-xs">{t('deviceMgmt.added')}: {new Date(device.addedAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingDevice(device.deviceId);
                            setNewDeviceName(device.deviceName || '');
                          }}
                          className="p-2 hover:bg-dark-surface rounded-lg transition-colors text-brand-text-tertiary hover:text-white"
                          title={t('deviceMgmt.renameDevice')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveDevice(device.deviceId)}
                          disabled={actionLoading === device.deviceId}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-brand-text-tertiary hover:text-red-400 disabled:opacity-50"
                          title={t('deviceMgmt.removeDevice')}
                        >
                          {actionLoading === device.deviceId ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sign Out All Confirmation Modal */}
      {showSignOutAll && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-elevated rounded-2xl border border-white/10 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">{t('deviceMgmt.signOutAllConfirm')}</h3>
            </div>
            <p className="text-brand-text-tertiary mb-6">
              {t('deviceMgmt.signOutAllDesc')}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSignOutAll(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-white/10 text-white font-medium transition-all duration-200"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={handleSignOutAll}
                disabled={actionLoading === 'signout-all'}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'signout-all' ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {t('deviceMgmt.signingOut')}
                  </>
                ) : (
                  t('deviceMgmt.signOutAllBtn')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

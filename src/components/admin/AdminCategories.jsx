import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, Save, X, Tag,
  Loader, AlertCircle, CheckCircle, RefreshCw, Hash,
  Inbox, Music, ChevronDown
} from 'lucide-react';
import API_URL from '../../config/api';

const PRESET_COLORS = [
  '#7C3AED', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#EC4899', '#F97316', '#06B6D4',
  '#84CC16', '#6366F1', '#14B8A6', '#F43F5E'
];

const DEFAULT_FORM = {
  name: '', description: '', thumbnail: '', color: '#7C3AED', sortOrder: 0, isActive: true
};

export default function AdminCategories() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'review'
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/categories?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setCategories(data.data || []);
    } catch {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const flash = (msg, type = 'success') => {
    if (type === 'success') setSuccess(msg);
    else setError(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 3500);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, sortOrder: categories.length });
    setShowForm(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat._id);
    setForm({
      name: cat.name,
      description: cat.description || '',
      thumbnail: cat.thumbnail || '',
      color: cat.color || '#7C3AED',
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive ?? true
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { flash(t('categories.nameRequired'), 'error'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingId
        ? `${API_URL}/categories/${editingId}`
        : `${API_URL}/categories`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      flash(editingId ? t('categories.updated') : t('categories.created'));
      setShowForm(false);
      if (editingId) {
        setCategories(prev => prev.map(c => c._id === editingId ? { ...c, ...data.data } : c));
      } else {
        setCategories(prev => [...prev, { ...data.data, trackCount: 0 }]);
      }
      fetchCategories();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      flash(t('categories.deleted'));
      setDeleteConfirm(null);
      fetchCategories();
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/categories/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      flash(t('categories.seeded', { count: data.created }));
      fetchCategories();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const toggleActive = async (cat) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/categories/${cat._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !cat.isActive })
      });
      fetchCategories();
    } catch { /* ignore */ }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Tag className="text-accent" size={24} /> {t('categories.title')}
          </h1>
          <p className="text-brand-text-tertiary text-sm mt-1">
            {t('categories.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'manage' && categories.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all">
              {seeding ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {t('categories.seedDefaults')}
            </button>
          )}
          {activeTab === 'manage' && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-medium rounded-lg transition-all">
              <Plus size={16} /> {t('categories.newCategory')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-surface p-1 rounded-xl w-fit">
        {[
          { id: 'manage', label: t('categories.manage'), icon: Tag },
          { id: 'review', label: t('categories.reviewQueue'), icon: Inbox },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-accent text-white' : 'text-brand-text-tertiary hover:text-white'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'review' && <ReviewQueue categories={categories} flash={flash} />}

      {activeTab === 'manage' && (<>
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="mb-6 bg-dark-elevated border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingId ? t('categories.editCategory') : t('categories.newCategory')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-brand-text-tertiary mb-1">{t('categories.name')} *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Latin Box"
                className="w-full bg-dark-surface text-white px-3 py-2 rounded-lg border border-white/10 focus:border-accent focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-text-tertiary mb-1">{t('categories.sortOrder')}</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full bg-dark-surface text-white px-3 py-2 rounded-lg border border-white/10 focus:border-accent focus:outline-none text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-brand-text-tertiary mb-1">{t('categories.description')}</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('categories.descriptionPlaceholder')}
                className="w-full bg-dark-surface text-white px-3 py-2 rounded-lg border border-white/10 focus:border-accent focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-text-tertiary mb-1">{t('categories.thumbnailUrl')}</label>
              <input
                value={form.thumbnail}
                onChange={e => setForm(f => ({ ...f, thumbnail: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-dark-surface text-white px-3 py-2 rounded-lg border border-white/10 focus:border-accent focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-text-tertiary mb-2">{t('categories.accentColor')}</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-7 h-7 rounded-full cursor-pointer bg-transparent border border-white/20"
                  title="Custom color"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <label className="text-xs text-brand-text-tertiary">{t('categories.activeVisible')}</label>
              <button
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-accent' : 'bg-white/20'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isActive ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
            >
              {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              {editingId ? t('categories.update') : t('categories.create')}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all"
            >
              <X size={14} /> {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader size={32} className="animate-spin text-accent" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-dark-elevated rounded-2xl border border-white/5">
          <Tag size={40} className="mx-auto text-white/20 mb-3" />
          <p className="text-brand-text-tertiary mb-2">{t('categories.noCategories')}</p>
          <p className="text-xs text-brand-text-tertiary/60 mb-4">
            {t('categories.noCategoriesHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                cat.isActive
                  ? 'bg-dark-elevated border-white/10 hover:border-white/20'
                  : 'bg-dark-surface border-white/5 opacity-60'
              }`}
            >
              {/* Color chip + name */}
              <div
                className="w-4 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color || '#7C3AED' }}
              />
              {cat.thumbnail && (
                <img src={cat.thumbnail} alt={cat.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{cat.name}</span>
                  {!cat.isActive && (
                    <span className="px-1.5 py-0.5 bg-white/10 text-white/40 text-xs rounded">{t('categories.hidden')}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-brand-text-tertiary text-xs flex items-center gap-1">
                    <Hash size={10} /> {cat.slug}
                  </span>
                  <span className="text-brand-text-tertiary text-xs">
                    {(cat.trackCount || 0).toLocaleString()} {t('admin.tracks')}
                  </span>
                  {cat.description && (
                    <span className="text-brand-text-tertiary/60 text-xs truncate max-w-xs">{cat.description}</span>
                  )}
                </div>
              </div>
              {/* Sort order badge */}
              <span className="text-xs text-white/30 w-6 text-center">{cat.sortOrder}</span>
              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(cat)}
                  title={cat.isActive ? t('categories.hideFromHome') : t('categories.showOnHome')}
                  className={`p-2 rounded-lg text-xs transition-all ${
                    cat.isActive ? 'text-green-400 hover:bg-green-500/10' : 'text-white/30 hover:bg-white/10'
                  }`}
                >
                  {cat.isActive ? '●' : '○'}
                </button>
                <button
                  onClick={() => openEdit(cat)}
                  className="p-2 rounded-lg text-brand-text-tertiary hover:text-white hover:bg-white/10 transition-all"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(cat)}
                  className="p-2 rounded-lg text-brand-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-elevated border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-white font-semibold mb-2">{t('categories.deleteConfirmTitle', { name: deleteConfirm.name })}</h3>
            <p className="text-brand-text-tertiary text-sm mb-5">
              {t('categories.deleteConfirmDesc')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm._id)}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all"
              >
                {t('common.delete')}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}

// ─── TrackThumb — always shows cover or gradient fallback ────────────────────
function TrackThumb({ src, alt }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img
        src={src}
        alt={alt || ''}
        onError={() => setErr(true)}
        className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-dark-surface"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg flex-shrink-0 bg-gradient-to-br from-accent/30 to-purple-900 flex items-center justify-center">
      <Music size={14} className="text-white/50" />
    </div>
  );
}

// ─── Review Queue sub-component ─────────────────────────────────────────────
function ReviewQueue({ categories, flash }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [assignTarget, setAssignTarget] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const token = localStorage.getItem('token');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/categories/uncategorized/count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success) setStats(d);
    } catch { /* ignore */ }
  }, [token]);

  const fetchTracks = useCallback(async () => {
    setLoadingTracks(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (selectedLabel) params.set('rawLabel', selectedLabel);
      const res = await fetch(`${API_URL}/categories/uncategorized/tracks?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success) {
        setTracks(d.data);
        setTotalPages(d.pagination.pages || 1);
      }
    } catch { /* ignore */ }
    finally { setLoadingTracks(false); }
  }, [page, selectedLabel, token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchTracks(); setSelected(new Set()); }, [fetchTracks]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(tracks.map(t => t._id)));
  const clearSelect = () => setSelected(new Set());

  const handleBulkAssign = async () => {
    if (!assignTarget) { flash(t('categories.selectTargetCategory'), 'error'); return; }
    if (!selected.size) { flash(t('categories.selectAtLeastOne'), 'error'); return; }
    setAssigning(true);
    try {
      const res = await fetch(`${API_URL}/categories/bulk-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trackIds: [...selected], categoryName: assignTarget })
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);
      flash(t('categories.tracksAssigned', { count: d.updated, name: assignTarget }));
      setSelected(new Set());
      setAssignTarget('');
      fetchStats();
      fetchTracks();
    } catch (e) { flash(e.message, 'error'); }
    finally { setAssigning(false); }
  };

  if (!stats) return <div className="flex items-center justify-center py-20"><Loader size={32} className="animate-spin text-accent" /></div>;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-elevated border border-white/10 rounded-xl p-4">
          <p className="text-xs text-brand-text-tertiary mb-1">{t('categories.tracksNeedingAssignment')}</p>
          <p className="text-3xl font-bold text-amber-400">{stats.count.toLocaleString()}</p>
        </div>
        <div className="bg-dark-elevated border border-white/10 rounded-xl p-4">
          <p className="text-xs text-brand-text-tertiary mb-1">{t('categories.uniqueLabels')}</p>
          <p className="text-3xl font-bold text-white">{stats.rawLabels?.length || 0}</p>
        </div>
      </div>

      {/* Detected raw labels */}
      {stats.rawLabels?.length > 0 && (
        <div className="bg-dark-elevated border border-white/10 rounded-xl p-4">
          <p className="text-xs text-brand-text-tertiary mb-3 font-semibold uppercase tracking-wider">{t('categories.labelsDetected')}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedLabel(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${!selectedLabel ? 'bg-accent text-white' : 'bg-white/10 text-brand-text-tertiary hover:text-white'}`}>
              {t('common.all')}
            </button>
            {stats.rawLabels.map(({ _id, count }) => (
              <button key={_id} onClick={() => { setSelectedLabel(_id === selectedLabel ? null : _id); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedLabel === _id ? 'bg-accent text-white' : 'bg-white/10 text-brand-text-tertiary hover:text-white'}`}>
                {_id}
                <span className="bg-white/20 rounded-full px-1.5">{count}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-brand-text-tertiary/60 mt-3">
            {t('categories.autoAssignHint')}
          </p>
        </div>
      )}

      {/* Bulk assign bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent/10 border border-accent/20 rounded-xl">
          <span className="text-sm text-white font-medium">{t('categories.selectedCount', { count: selected.size })}</span>
          <select
            value={assignTarget}
            onChange={e => setAssignTarget(e.target.value)}
            className="flex-1 bg-dark-surface text-white text-sm px-3 py-2 rounded-lg border border-white/10 focus:border-accent focus:outline-none"
          >
            <option value="">{t('categories.chooseCategory')}</option>
            {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={handleBulkAssign} disabled={assigning}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50">
            {assigning ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            {t('categories.assign')}
          </button>
          <button onClick={clearSelect} className="p-2 text-brand-text-tertiary hover:text-white rounded-lg transition-all">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Track list */}
      <div className="bg-dark-elevated border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-white/5">
          <span className="text-xs text-brand-text-tertiary">
            {selectedLabel ? t('categories.showingLabel', { label: selectedLabel }) : t('categories.allUncategorized')}
          </span>
          <button onClick={selectAll} className="text-xs text-accent hover:text-accent/80 transition-all">{t('common.selectAll')}</button>
        </div>
        {loadingTracks ? (
          <div className="flex items-center justify-center py-12"><Loader size={24} className="animate-spin text-accent" /></div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle size={36} className="text-green-400 mb-2" />
            <p className="text-white font-medium">{t('categories.allCaughtUp')}</p>
            <p className="text-xs text-brand-text-tertiary mt-1">{t('categories.noUncategorized')}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tracks.map(t => (
              <div key={t._id} onClick={() => toggleSelect(t._id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${selected.has(t._id) ? 'bg-accent/10' : 'hover:bg-white/5'}`}>
                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-all ${selected.has(t._id) ? 'bg-accent border-accent' : 'border-white/30'}`}>
                  {selected.has(t._id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <TrackThumb src={t.coverArt} alt={t.title} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{t.title}</p>
                  <p className="text-xs text-brand-text-tertiary truncate">{t.artist}</p>
                </div>
                {t.categoryRaw && (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full flex-shrink-0">{t.categoryRaw}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-white/5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="text-xs text-brand-text-tertiary hover:text-white disabled:opacity-30 transition-all">← {t('actions.back')}</button>
            <span className="text-xs text-brand-text-tertiary">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="text-xs text-brand-text-tertiary hover:text-white disabled:opacity-30 transition-all">{t('actions.next')} →</button>
          </div>
        )}
      </div>
    </div>
  );
}

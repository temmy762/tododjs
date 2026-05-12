import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Save, X, Music2,
  Loader, AlertCircle, CheckCircle, RefreshCw, Hash
} from 'lucide-react';
import API_URL from '../../config/api';

const PRESET_COLORS = [
  '#FF6B6B', '#FF9B4A', '#FFE066', '#C86BFA',
  '#4DD8FF', '#86F0B0', '#F59E0B', '#6366F1',
  '#10B981', '#7C3AED', '#EC4899', '#3B82F6',
];

const DEFAULT_FORM = {
  name: '', description: '', thumbnail: '', color: '#7C3AED', sortOrder: 0, isActive: true
};

export default function AdminMashupCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const token = localStorage.getItem('token');

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/mashup-categories?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setCategories(data.data || []);
    } catch {
      setError('Failed to load mashup categories');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const flash = (msg, type = 'success') => {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
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
      name:        cat.name,
      description: cat.description || '',
      thumbnail:   cat.thumbnail   || '',
      color:       cat.color       || '#7C3AED',
      sortOrder:   cat.sortOrder   ?? 0,
      isActive:    cat.isActive    ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { flash('Category name is required', 'error'); return; }
    setSaving(true);
    try {
      const url    = editingId ? `${API_URL}/mashup-categories/${editingId}` : `${API_URL}/mashup-categories`;
      const method = editingId ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      flash(editingId ? 'Category updated' : 'Category created');
      setShowForm(false);
      fetchCategories();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/mashup-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      flash('Category deleted');
      setDeleteConfirm(null);
      fetchCategories();
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${API_URL}/mashup-categories/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      flash(`Seeded ${data.created} default mashup categories`);
      fetchCategories();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const toggleActive = async (cat) => {
    try {
      const res = await fetch(`${API_URL}/mashup-categories/${cat._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      fetchCategories();
    } catch (e) { flash(e.message, 'error'); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Music2 className="text-accent" size={24} /> Mashup Categories
          </h1>
          <p className="text-brand-text-tertiary text-sm mt-1">
            Manage genre categories for the Live Mashups page — independent from Record Pool categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all"
            title="Seed the 9 default genre categories"
          >
            {seeding ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Seed Defaults
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-medium rounded-lg transition-all"
          >
            <Plus size={16} /> New Category
          </button>
        </div>
      </div>

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
            {editingId ? 'Edit Mashup Category' : 'New Mashup Category'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-brand-text-tertiary mb-1">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Reggaeton"
                className="w-full bg-dark-surface text-white px-3 py-2 rounded-lg border border-white/10 focus:border-accent focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-text-tertiary mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full bg-dark-surface text-white px-3 py-2 rounded-lg border border-white/10 focus:border-accent focus:outline-none text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-brand-text-tertiary mb-1">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description of this genre category"
                className="w-full bg-dark-surface text-white px-3 py-2 rounded-lg border border-white/10 focus:border-accent focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-text-tertiary mb-1">Thumbnail URL</label>
              <input
                value={form.thumbnail}
                onChange={e => setForm(f => ({ ...f, thumbnail: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-dark-surface text-white px-3 py-2 rounded-lg border border-white/10 focus:border-accent focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-text-tertiary mb-2">Accent Color</label>
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
              <label className="text-xs text-brand-text-tertiary">Active / Visible</label>
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
              {editingId ? 'Update' : 'Create'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader size={32} className="animate-spin text-accent" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-dark-elevated rounded-2xl border border-white/5">
          <Music2 size={40} className="mx-auto text-white/20 mb-3" />
          <p className="text-brand-text-tertiary mb-2">No mashup categories yet</p>
          <p className="text-xs text-brand-text-tertiary/60 mb-4">
            Click <strong>Seed Defaults</strong> to add the 9 default genre categories.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-medium rounded-lg transition-all"
          >
            {seeding ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Seed Defaults
          </button>
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
              <div className="w-4 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || '#7C3AED' }} />
              {cat.thumbnail && (
                <img src={cat.thumbnail} alt={cat.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{cat.name}</span>
                  {!cat.isActive && (
                    <span className="px-1.5 py-0.5 bg-white/10 text-white/40 text-xs rounded">Hidden</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-brand-text-tertiary text-xs flex items-center gap-1">
                    <Hash size={10} /> {cat.slug}
                  </span>
                  <span className="text-brand-text-tertiary text-xs">
                    {(cat.mashupCount || 0).toLocaleString()} mashups
                  </span>
                  {cat.description && (
                    <span className="text-brand-text-tertiary/60 text-xs truncate max-w-xs">{cat.description}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-white/30 w-6 text-center">{cat.sortOrder}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(cat)}
                  title={cat.isActive ? 'Hide from Live Mashups' : 'Show on Live Mashups'}
                  className={`p-2 rounded-lg text-xs transition-all ${cat.isActive ? 'text-green-400 hover:bg-green-500/10' : 'text-white/30 hover:bg-white/10'}`}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-elevated border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-white font-semibold mb-2">Delete &ldquo;{deleteConfirm.name}&rdquo;?</h3>
            <p className="text-brand-text-tertiary text-sm mb-5">
              Existing mashups tagged with this category will become uncategorized.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm._id)}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

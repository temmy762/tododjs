import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, Edit, Trash2, Shield, Crown, User, Loader, X, ChevronLeft, ChevronRight, Users } from 'lucide-react';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authHeaders = (json = false) => {
  const h = {};
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, pages: 1 });
  const [stats, setStats] = useState({ totalUsers: 0, premiumCount: 0, proCount: 0, newThisMonth: 0 });
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`${API}/users?${params}`, { headers: authHeaders() });
      if (!res.ok) {
        console.error('Users API HTTP error:', res.status, await res.text());
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setPagination(data.pagination);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err.message || err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  const handleDelete = async (userId) => {
    try {
      const res = await fetch(`${API}/users/${userId}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirm(null);
        fetchUsers(pagination.page);
      }
    } catch (err) { console.error('Delete failed:', err); }
  };

  const handleEditSave = async (userId, updates) => {
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        fetchUsers(pagination.page);
      }
    } catch (err) { console.error('Update failed:', err); }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return Shield;
      default: return User;
    }
  };

  const getPlanLabel = (u) => {
    if (u.role === 'admin') return 'Admin';
    return (u.subscription?.plan || 'free').charAt(0).toUpperCase() + (u.subscription?.plan || 'free').slice(1);
  };

  const getRoleColor = (u) => {
    if (u.role === 'admin') return 'from-red-500 to-pink-500';
    const plan = u.subscription?.plan || 'free';
    if (plan === 'pro') return 'from-orange-500 to-red-500';
    if (plan === 'premium') return 'from-purple-500 to-pink-500';
    return 'from-gray-500 to-gray-600';
  };

  const timeAgo = (date) => {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const startIdx = (pagination.page - 1) * pagination.limit + 1;
  const endIdx = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Member Management</h2>
          <p className="text-brand-text-tertiary">Manage all members and their permissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
          <div className="text-3xl font-bold text-white mb-1">{stats.totalUsers.toLocaleString()}</div>
          <p className="text-sm text-brand-text-tertiary">Total Members</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
          <div className="text-3xl font-bold text-white mb-1">{stats.premiumCount.toLocaleString()}</div>
          <p className="text-sm text-brand-text-tertiary">Premium Members</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
          <div className="text-3xl font-bold text-white mb-1">{stats.proCount.toLocaleString()}</div>
          <p className="text-sm text-brand-text-tertiary">Pro Members</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
          <div className="text-3xl font-bold text-white mb-1">{stats.newThisMonth.toLocaleString()}</div>
          <p className="text-sm text-brand-text-tertiary">New This Month</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-dark-elevated rounded-xl p-4 border border-white/10 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-tertiary" />
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-surface border border-white/10 rounded-lg text-white placeholder-brand-text-tertiary focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 text-accent animate-spin" />
        </div>
      )}

      {/* Users Table */}
      {!loading && users.length > 0 && (
        <div className="bg-dark-elevated rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-dark-surface">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Member</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Role / Plan</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Joined</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Last Login</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Downloads</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  return (
                    <tr key={user._id} className="hover:bg-dark-surface transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRoleColor(user)} flex items-center justify-center`}>
                            <span className="text-white font-bold text-sm">{(user.name || '?').charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-white">{user.name}</div>
                            <div className="text-sm text-brand-text-tertiary">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <RoleIcon className="w-4 h-4 text-accent" />
                          <span className="text-sm font-medium text-white">{getPlanLabel(user)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-text-tertiary">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-text-tertiary">{timeAgo(user.lastLogin)}</td>
                      <td className="px-6 py-4 text-sm text-white">{user.downloads?.total || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.isActive !== false
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingUser(user)} className="p-2 hover:bg-dark-elevated rounded-lg transition-colors text-brand-text-tertiary hover:text-white">
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.role !== 'admin' && (
                            <button onClick={() => setDeleteConfirm(user)} className="p-2 hover:bg-dark-elevated rounded-lg transition-colors text-brand-text-tertiary hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-sm text-brand-text-tertiary">
              Showing <span className="font-semibold text-white">{startIdx}-{endIdx}</span> of <span className="font-semibold text-white">{pagination.total.toLocaleString()}</span> members
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-white/10 text-white text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-sm text-white font-medium px-2">{pagination.page} / {pagination.pages}</span>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-white/10 text-white text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && users.length === 0 && (
        <div className="text-center py-20">
          <Users className="w-16 h-16 mx-auto mb-4 text-brand-text-tertiary opacity-30" />
          <p className="text-brand-text-tertiary text-lg">{debouncedSearch ? 'No members match your search' : 'No members yet'}</p>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-dark-surface rounded-2xl border border-white/10 p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-2">Delete Member</h3>
            <p className="text-brand-text-tertiary mb-1">Are you sure you want to delete:</p>
            <p className="text-white font-semibold mb-6">{deleteConfirm.name} ({deleteConfirm.email})</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white font-medium transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm._id)} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleEditSave} />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSave }) {
  const [role, setRole] = useState(user.role || 'user');
  const [plan, setPlan] = useState(user.subscription?.plan || 'free');
  const [isActive, setIsActive] = useState(user.isActive !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-dark-surface rounded-2xl border border-white/10 p-8 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Edit Member</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
        </div>
        <div className="mb-4">
          <p className="text-white font-semibold">{user.name}</p>
          <p className="text-sm text-brand-text-tertiary">{user.email}</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-tertiary mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2.5 bg-dark-elevated border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-tertiary mb-1">Subscription Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value)} className="w-full px-4 py-2.5 bg-dark-elevated border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent">
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-brand-text-tertiary">Active</label>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white font-medium transition-colors">Cancel</button>
          <button onClick={() => onSave(user._id, { role, plan, isActive })} className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Edit, TrendingUp, Users, DollarSign, Loader, CreditCard,
  Search, RefreshCw, ChevronUp, ChevronDown, CheckCircle,
  XCircle, Clock, AlertTriangle, Monitor, Hash, Download,
  Filter, ArrowUpDown, Calendar, Phone, Mail
} from 'lucide-react';
import API_URL from '../../config/api';

const API = API_URL;
const getToken = () => localStorage.getItem('token');
const authHeaders = () => {
  const h = {};
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
};

const fmt = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const timeAgo = (date) => {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const StatusBadge = ({ status }) => {
  const map = {
    active:    'bg-green-500/20 text-green-400 border-green-500/30',
    inactive:  'bg-white/5 text-brand-text-tertiary border-white/10',
    expired:   'bg-red-500/20 text-red-400 border-red-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    past_due:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };
  const icons = {
    active: <CheckCircle className="w-3 h-3" />,
    inactive: <XCircle className="w-3 h-3" />,
    expired: <XCircle className="w-3 h-3" />,
    cancelled: <XCircle className="w-3 h-3" />,
    past_due: <AlertTriangle className="w-3 h-3" />,
  };
  const cls = map[status] || map.inactive;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {icons[status] || <XCircle className="w-3 h-3" />}
      {status ? status.replace('_', ' ') : 'none'}
    </span>
  );
};

const PlanBadge = ({ plan }) => {
  const map = {
    premium: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    pro:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${map[plan] || 'bg-white/5 text-brand-text-tertiary border-white/10'}`}>
      {plan || 'Free'}
    </span>
  );
};

export default function AdminSubscriptions() {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, activeCount: 0, freeCount: 0, individualMonthlyCount: 0, individualQuarterlyCount: 0, sharedMonthlyCount: 0, sharedQuarterlyCount: 0, newThisMonth: 0, estimatedRevenue: 0 });
  const [editingPlan, setEditingPlan] = useState(null);
  const [plans, setPlans] = useState([]);

  // Customers table state
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchData(); }, []);

  const fetchCustomers = useCallback(async (page = 1) => {
    setCustomersLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25, sort: `${sortDir === 'desc' ? '-' : ''}${sortField}` });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterPlan) params.set('plan', filterPlan);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`${API}/users?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setCustomersLoading(false);
    }
  }, [debouncedSearch, filterPlan, filterStatus, sortField, sortDir]);

  useEffect(() => {
    if (tab === 'customers') fetchCustomers(1);
  }, [tab, fetchCustomers]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => (
    sortField === field
      ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
      : <ArrowUpDown className="w-3 h-3 opacity-40" />
  );

  const exportCSV = () => {
    const headers = ['Name','Email','Phone','Plan','Status','Start Date','End Date','Auto Renew','Devices','Stripe Customer ID','Stripe Subscription ID','Last Login','Member Since'];
    const rows = customers.map(u => [
      u.name, u.email, u.phoneNumber || '',
      u.subscription?.plan || 'free',
      u.subscription?.status || 'inactive',
      fmt(u.subscription?.startDate),
      fmt(u.subscription?.endDate),
      u.subscription?.autoRenew ? 'Yes' : 'No',
      u.subscription?.devices?.length || 0,
      u.subscription?.stripeCustomerId || '',
      u.subscription?.stripeSubscriptionId || '',
      fmt(u.lastLogin),
      fmt(u.createdAt)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const fetchData = async () => {
    try {
      // Fetch user stats
      const statsRes = await fetch(`${API}/users?limit=1`, { headers: authHeaders() });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }

      // Fetch subscription plans
      const plansRes = await fetch(`${API}/subscriptions/plans`);
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        if (plansData.success) {
          setPlans(plansData.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const estimatedRevenue = stats.estimatedRevenue || 0;
  const paidPercent = stats.totalUsers > 0
    ? ((stats.activeCount / stats.totalUsers) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-4 md:p-8">
      {/* Header + Tabs */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">Membership Management</h2>
        <p className="text-brand-text-tertiary text-sm mb-5">Manage pricing plans, memberships and customer leads</p>
        <div className="flex rounded-xl border border-white/10 overflow-hidden p-1 bg-dark-elevated w-fit gap-1">
          <button onClick={() => setTab('overview')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${ tab === 'overview' ? 'bg-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white' }`}>
            <TrendingUp className="w-4 h-4" /> Overview & Plans
          </button>
          <button onClick={() => setTab('customers')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${ tab === 'customers' ? 'bg-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white' }`}>
            <Users className="w-4 h-4" /> Customers & Leads
            {pagination.total > 0 && <span className="bg-white/10 text-xs px-1.5 py-0.5 rounded-full">{pagination.total}</span>}
          </button>
        </div>
      </div>

      {/* ─── CUSTOMERS TABLE TAB ─── */}
      {tab === 'customers' && (
        <div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-tertiary" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or email..."
                className="w-full pl-9 pr-4 py-2.5 bg-dark-elevated border border-white/10 rounded-xl text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); }}
              className="px-3 py-2.5 bg-dark-elevated border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent">
              <option value="">All Plans</option>
              <option value="individual-monthly">Individual Monthly</option>
              <option value="individual-quarterly">Individual Quarterly</option>
              <option value="shared-monthly">Shared Monthly</option>
              <option value="shared-quarterly">Shared Quarterly</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 bg-dark-elevated border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="past_due">Past Due</option>
            </select>
            <button onClick={() => fetchCustomers(1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-elevated border border-white/10 text-sm text-brand-text-secondary hover:text-white transition-colors">
              <RefreshCw className={`w-4 h-4 ${customersLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="bg-dark-elevated rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-dark-surface">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide w-52">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-white">
                        Customer <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide">
                      <button onClick={() => toggleSort('subscription.plan')} className="flex items-center gap-1 hover:text-white">
                        Plan <SortIcon field="subscription.plan" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide">
                      <button onClick={() => toggleSort('subscription.startDate')} className="flex items-center gap-1 hover:text-white">
                        Start <SortIcon field="subscription.startDate" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide">
                      <button onClick={() => toggleSort('subscription.endDate')} className="flex items-center gap-1 hover:text-white">
                        Expires <SortIcon field="subscription.endDate" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide">Devices</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide">
                      <button onClick={() => toggleSort('lastLogin')} className="flex items-center gap-1 hover:text-white">
                        Last Login <SortIcon field="lastLogin" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide">
                      <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-white">
                        Joined <SortIcon field="createdAt" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customersLoading && (
                    <tr><td colSpan={9} className="text-center py-12">
                      <Loader className="w-6 h-6 text-accent animate-spin mx-auto" />
                    </td></tr>
                  )}
                  {!customersLoading && customers.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-12 text-brand-text-tertiary">No customers found</td></tr>
                  )}
                  {!customersLoading && customers.map(u => (
                    <Fragment key={u._id}>
                      <tr
                        onClick={() => setExpandedRow(expandedRow === u._id ? null : u._id)}
                        className={`hover:bg-white/5 cursor-pointer transition-colors ${ expandedRow === u._id ? 'bg-white/5' : '' }`}
                      >
                        {/* Customer */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-accent font-bold text-xs">{u.name?.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate max-w-[140px]">{u.name}</p>
                              <p className="text-xs text-brand-text-tertiary truncate max-w-[140px]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        {/* Plan */}
                        <td className="px-4 py-3"><PlanBadge plan={u.subscription?.plan} /></td>
                        {/* Status */}
                        <td className="px-4 py-3"><StatusBadge status={u.subscription?.status} /></td>
                        {/* Start */}
                        <td className="px-4 py-3 text-xs text-brand-text-secondary whitespace-nowrap">{fmt(u.subscription?.startDate)}</td>
                        {/* Expires */}
                        <td className="px-4 py-3">
                          <span className={`text-xs whitespace-nowrap ${
                            u.subscription?.endDate && new Date(u.subscription.endDate) < new Date()
                              ? 'text-red-400' : 'text-brand-text-secondary'
                          }`}>{fmt(u.subscription?.endDate)}</span>
                        </td>
                        {/* Devices */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-brand-text-secondary">
                            <Monitor className="w-3 h-3" />{u.subscription?.devices?.length || 0}
                          </span>
                        </td>
                        {/* Last Login */}
                        <td className="px-4 py-3 text-xs text-brand-text-secondary whitespace-nowrap">{timeAgo(u.lastLogin)}</td>
                        {/* Joined */}
                        <td className="px-4 py-3 text-xs text-brand-text-secondary whitespace-nowrap">{fmt(u.createdAt)}</td>
                        {/* Expand */}
                        <td className="px-4 py-3 text-center">
                          {expandedRow === u._id
                            ? <ChevronUp className="w-4 h-4 text-brand-text-tertiary mx-auto" />
                            : <ChevronDown className="w-4 h-4 text-brand-text-tertiary mx-auto" />}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedRow === u._id && (
                        <tr key={`${u._id}-detail`} className="bg-dark-surface">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Contact */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide mb-2">Contact</p>
                                <div className="flex items-center gap-2 text-xs">
                                  <Mail className="w-3 h-3 text-brand-text-tertiary" />
                                  <span className="text-white break-all">{u.email}</span>
                                </div>
                                {u.phoneNumber && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <Phone className="w-3 h-3 text-brand-text-tertiary" />
                                    <span className="text-white">{u.phoneNumber}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-xs">
                                  <Calendar className="w-3 h-3 text-brand-text-tertiary" />
                                  <span className="text-brand-text-secondary">Joined {fmt(u.createdAt)}</span>
                                </div>
                              </div>

                              {/* Subscription */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide mb-2">Subscription</p>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-brand-text-tertiary w-16">Auto Renew</span>
                                  <span className={u.subscription?.autoRenew ? 'text-green-400' : 'text-brand-text-tertiary'}>
                                    {u.subscription?.autoRenew ? '✓ Yes' : '✗ No'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-brand-text-tertiary w-16">Start</span>
                                  <span className="text-white">{fmt(u.subscription?.startDate)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-brand-text-tertiary w-16">End</span>
                                  <span className={`${ u.subscription?.endDate && new Date(u.subscription.endDate) < new Date() ? 'text-red-400' : 'text-white' }`}>
                                    {fmt(u.subscription?.endDate)}
                                  </span>
                                </div>
                              </div>

                              {/* Stripe */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" /> Stripe
                                </p>
                                <div>
                                  <p className="text-xs text-brand-text-tertiary">Customer ID</p>
                                  <p className="text-xs font-mono text-white break-all">{u.subscription?.stripeCustomerId || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-brand-text-tertiary">Subscription ID</p>
                                  <p className="text-xs font-mono text-white break-all">{u.subscription?.stripeSubscriptionId || '—'}</p>
                                </div>
                              </div>

                              {/* Devices summary */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-brand-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1">
                                  <Monitor className="w-3 h-3" /> Devices ({u.subscription?.devices?.length || 0})
                                </p>
                                {(u.subscription?.devices || []).slice(0, 3).map(d => (
                                  <div key={d.deviceId} className="text-xs">
                                    <p className="text-white">{d.deviceName || `${d.browser} / ${d.os}`}</p>
                                    <p className="text-brand-text-tertiary font-mono">{d.ipAddress || 'No IP'}</p>
                                  </div>
                                ))}
                                {(u.subscription?.devices?.length || 0) > 3 && (
                                  <p className="text-xs text-brand-text-tertiary">+{u.subscription.devices.length - 3} more</p>
                                )}
                                {(u.subscription?.devices?.length || 0) === 0 && (
                                  <p className="text-xs text-brand-text-tertiary">No devices registered</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                <p className="text-xs text-brand-text-tertiary">{pagination.total} total customers</p>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(pagination.pages, 8) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => fetchCustomers(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${ p === pagination.page ? 'bg-accent text-white' : 'bg-dark-surface border border-white/10 text-brand-text-secondary hover:text-white' }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── OVERVIEW TAB ─── */}
      {tab === 'overview' && loading && (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 text-accent animate-spin" />
        </div>
      )}

      {tab === 'overview' && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-8 h-8 text-accent" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">€{Number(estimatedRevenue).toLocaleString()}</h3>
              <p className="text-sm text-brand-text-tertiary">Est. Monthly Revenue</p>
            </div>
            <div className="bg-dark-elevated rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 text-accent" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{(stats.totalUsers || 0).toLocaleString()}</h3>
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
              <h3 className="text-2xl font-bold text-white mb-1">{(stats.newThisMonth || 0).toLocaleString()}</h3>
              <p className="text-sm text-brand-text-tertiary">New This Month</p>
            </div>
          </div>

          {/* Subscription Usage Breakdown */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-6">Subscription Usage</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'No Plan', count: stats.freeCount, color: 'bg-gray-500' },
                { label: 'Active Subs', count: stats.activeCount, color: 'bg-green-500' },
                { label: 'Indiv. Monthly', count: stats.individualMonthlyCount, color: 'bg-blue-500' },
                { label: 'Indiv. Quarterly', count: stats.individualQuarterlyCount, color: 'bg-indigo-500' },
                { label: 'Shared Monthly', count: stats.sharedMonthlyCount, color: 'bg-purple-500' },
                { label: 'Shared Quarterly', count: stats.sharedQuarterlyCount, color: 'bg-pink-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className="bg-dark-elevated rounded-xl p-5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">{label}</h4>
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{(count || 0).toLocaleString()}</div>
                  <div className="text-xs text-brand-text-tertiary">
                    {stats.totalUsers > 0 ? (((count || 0) / stats.totalUsers) * 100).toFixed(1) : '0'}% of members
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Plans */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Membership Plans</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <div key={plan.planId} className="bg-dark-elevated rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300">
                  {/* Plan Header */}
                  <div className="bg-gradient-to-br from-accent to-purple-500 p-6 text-center">
                    <h4 className="text-xl font-bold text-white mb-2">{plan.name}</h4>
                    <div className="text-3xl font-bold text-white mb-1">
                      €{plan.price}
                    </div>
                    <p className="text-white/80 text-xs capitalize">{plan.duration}</p>
                    <p className="text-white/60 text-xs mt-1 capitalize">{plan.type}</p>
                  </div>

                  {/* Plan Details */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                      <div>
                        <p className="text-xs text-brand-text-tertiary">Duration</p>
                        <p className="text-lg font-bold text-white">{plan.durationDays} days</p>
                      </div>
                      <div className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                        Active
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <p className="text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider mb-3">Features</p>
                      {plan.features.unlimitedDownloads && (
                        <div className="flex items-center gap-2 text-xs text-white">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                          <span>Unlimited Downloads</span>
                        </div>
                      )}
                      {plan.features.fullWebAccess && (
                        <div className="flex items-center gap-2 text-xs text-white">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                          <span>Full Web Access</span>
                        </div>
                      )}
                      {plan.features.whatsappSupport && (
                        <div className="flex items-center gap-2 text-xs text-white">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                          <span>WhatsApp Support</span>
                        </div>
                      )}
                      {plan.type === 'shared' && (
                        <>
                          <div className="flex items-center gap-2 text-xs text-white">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                            <span>2 Users</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                            <span>2 Devices/IP</span>
                          </div>
                        </>
                      )}
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
              <p className="text-sm text-brand-text-tertiary mt-1">Plan ID: {editingPlan.planId}</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={editingPlan.price}
                    className="w-full px-4 py-2.5 bg-dark-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Duration (days)</label>
                  <input
                    type="number"
                    defaultValue={editingPlan.durationDays}
                    className="w-full px-4 py-2.5 bg-dark-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Type</label>
                  <select
                    defaultValue={editingPlan.type}
                    className="w-full px-4 py-2.5 bg-dark-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                  >
                    <option value="individual">Individual</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Duration Type</label>
                  <select
                    defaultValue={editingPlan.duration}
                    className="w-full px-4 py-2.5 bg-dark-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-3">Features</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked={editingPlan.features?.unlimitedDownloads}
                      className="w-4 h-4 rounded border-white/20 bg-dark-surface"
                    />
                    <span className="text-sm text-white">Unlimited Downloads</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked={editingPlan.features?.fullWebAccess}
                      className="w-4 h-4 rounded border-white/20 bg-dark-surface"
                    />
                    <span className="text-sm text-white">Full Web Access</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked={editingPlan.features?.whatsappSupport}
                      className="w-4 h-4 rounded border-white/20 bg-dark-surface"
                    />
                    <span className="text-sm text-white">WhatsApp Support</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked={editingPlan.features?.noCommitment}
                      className="w-4 h-4 rounded border-white/20 bg-dark-surface"
                    />
                    <span className="text-sm text-white">No Commitment</span>
                  </label>
                </div>
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

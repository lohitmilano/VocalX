'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  overview: {
    totalAffiliates: number;
    activeAffiliates: number;
    totalCustomers: number;
    totalCommissions: number;
    totalCommissionEvents: number;
    avgCommissionPerEvent: number;
  };
  currentMonth: {
    commissions: number;
    events: number;
  };
  recent: {
    commissions: number;
    events: number;
  };
  pendingPayouts: {
    total: number;
    count: number;
  };
  topAffiliates: Array<{
    id: string;
    name: string;
    email: string;
    totalCommissions: number;
    totalRevenue: number;
    affiliateTier: string;
    _count: { customers: number };
  }>;
  monthlyTrend: Array<{
    month: string;
    monthName: string;
    commissions: number;
    count: number;
  }>;
  tierDistribution: Array<{
    tier: string;
    count: number;
  }>;
}

const TIER_COLORS = {
  silver: '#94a3b8',
  gold: '#fbbf24',
  platinum: '#8b5cf6',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('affiliate_token');
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const result = await response.json();
      setStats(result.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-24 bg-slate-200"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card h-80 bg-slate-200"></div>
            <div className="card h-80 bg-slate-200"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !stats) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600">{error || 'Failed to load dashboard'}</p>
          <button onClick={fetchStats} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Overview of your affiliate program performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-brand-100 rounded-lg">
                <span className="text-xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Affiliates</p>
                <p className="text-2xl font-bold text-slate-900">{stats.overview.totalAffiliates}</p>
                <p className="text-xs text-green-600">{stats.overview.activeAffiliates} active</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Commissions</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.overview.totalCommissions)}</p>
                <p className="text-xs text-slate-500">{stats.overview.totalCommissionEvents} events</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-xl">📅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">This Month</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.currentMonth.commissions)}</p>
                <p className="text-xs text-slate-500">{stats.currentMonth.events} events</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-xl">💸</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.pendingPayouts.total)}</p>
                <p className="text-xs text-slate-500">{stats.pendingPayouts.count} affiliates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Commission Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthName" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Commissions']} />
                <Line type="monotone" dataKey="commissions" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tier Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Affiliate Tiers</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.tierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ tier, count }) => `${tier}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.tierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.tier as keyof typeof TIER_COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Affiliates */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Performing Affiliates</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Affiliate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Commissions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.topAffiliates.map((affiliate) => (
                  <tr key={affiliate.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{affiliate.name}</div>
                        <div className="text-sm text-slate-500">{affiliate.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${
                        affiliate.affiliateTier === 'platinum' ? 'badge-info' :
                        affiliate.affiliateTier === 'gold' ? 'badge-warning' : 'badge-secondary'
                      }`}>
                        {affiliate.affiliateTier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {affiliate._count.customers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatCurrency(affiliate.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatCurrency(affiliate.totalCommissions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

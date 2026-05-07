import React, { useEffect, useState } from 'react';
import {
  Package,
  Layers,
  Clock,
  Activity,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get('/dashboard/summary');
        setData(response.data);
        
      } catch (error) {
        console.error('Error fetching dashboard summary:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          <p className="text-white/60 mt-6 text-center">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  const cards = [
    {
      title: 'Total Categories',
      value: metrics.total_products ?? 0,
      icon: Package,
      color: 'from-blue-500 to-cyan-500',
      bgGlow: 'bg-blue-500/10'
    },
    {
      title: 'Active Records',
      value: metrics.running_batches ?? 0,
      icon: Layers,
      color: 'from-purple-500 to-pink-500',
      bgGlow: 'bg-purple-500/10'
    },
    {
      title: 'Shifts Today',
      value: metrics.shifts_today ?? 0,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      bgGlow: 'bg-amber-500/10'
    },
    {
      title: 'Total Output Units',
      value: metrics.total_output_units ?? 0,
      icon: Activity,
      color: 'from-emerald-500 to-teal-500',
      bgGlow: 'bg-emerald-500/10'
    },
    {
      title: 'Avg Cost per Unit',
      value: metrics.avg_cost_per_unit ?? '$0.00',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      bgGlow: 'bg-green-500/10'
    },
    {
      title: 'Productivity Ratio',
      value: metrics.productivity_ratio ?? '0.00',
      icon: TrendingUp,
      color: 'from-teal-500 to-green-500',
      bgGlow: 'bg-teal-500/10'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-lg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            {data?.title || 'Dashboard Analytics'}
          </h1>
          <p className="text-white/40 text-sm">
            {data?.subtitle || 'Real-time insights into your production metrics'}
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10"
              >
                <div
                  className={`absolute inset-0 ${card.bgGlow} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                ></div>
                <div className="relative flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${card.color}`}
                    >
                      <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm mb-2">{card.title}</p>
                    <p className="text-3xl font-bold text-white tracking-tight">
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

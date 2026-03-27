import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  Package, 
  ExternalLink, 
  Zap, 
  RefreshCw,
  Play,
  CheckCircle,
  AlertCircle
} from '../components/Icons';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [automationStatus, setAutomationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [automationMessage, setAutomationMessage] = useState('');
  const [stats, setStats] = useState<any>({
    clicks: 0,
    products: 0,
    conversions: 0,
    estimatedProfit: 0,
    topProducts: [],
    weeklyData: []
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  React.useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerAutomation = async () => {
    setAutomationStatus('running');
    try {
      const res = await fetch('/api/automation/trigger', { 
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setAutomationStatus('success');
        setAutomationMessage(data.message);
        fetchStats(); // Refresh stats after automation
        setTimeout(() => setAutomationStatus('idle'), 5000);
      } else {
        setAutomationStatus('error');
        setAutomationMessage(data.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Automation trigger failed:', err);
      setAutomationStatus('error');
      setAutomationMessage('Falha na conexão com o servidor');
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-zinc-400 text-sm md:text-base">Bem-vindo de volta ao seu centro de comando.</p>
        </div>
        <div className="w-full md:w-auto flex flex-col items-end gap-2">
          {automationStatus === 'success' && (
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
              <CheckCircle size={14} /> {automationMessage}
            </span>
          )}
          {automationStatus === 'error' && (
            <span className="text-rose-500 text-xs font-bold flex items-center gap-1">
              <AlertCircle size={14} /> {automationMessage}
            </span>
          )}
          <button 
            onClick={triggerAutomation}
            disabled={automationStatus === 'running'}
            className="w-full md:w-auto bg-yellow-400 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-400/20"
          >
            {automationStatus === 'running' ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
            {automationStatus === 'running' ? 'Processando...' : 'Iniciar Automação'}
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total de Cliques', value: stats.clicks.toLocaleString(), icon: <TrendingUp className="text-yellow-400" /> },
          { label: 'Conversões', value: stats.conversions.toLocaleString(), icon: <Zap className="text-yellow-400" /> },
          { label: 'Produtos Ativos', value: stats.products.toLocaleString(), icon: <Package className="text-yellow-400" /> },
          { label: 'Lucro Estimado', value: `R$ ${stats.estimatedProfit.toFixed(2)}`, icon: <RefreshCw className="text-yellow-400" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 md:p-6 rounded-3xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 md:p-3 bg-zinc-800 rounded-2xl">
                {stat.icon}
              </div>
            </div>
            <p className="text-zinc-400 text-xs md:text-sm font-medium">{stat.label}</p>
            <h3 className="text-xl md:text-2xl font-bold text-white mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-5 md:p-8 rounded-3xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h3 className="text-lg md:text-xl font-bold text-white">Desempenho Semanal</h3>
          </div>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.weeklyData}>
                <defs>
                  <linearGradient id="colorCliques" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#facc15' }}
                />
                <Area type="monotone" dataKey="cliques" stroke="#facc15" fillOpacity={1} fill="url(#colorCliques)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 md:p-8 rounded-3xl">
          <h3 className="text-lg md:text-xl font-bold text-white mb-6">Top Produtos</h3>
          <div className="space-y-4 md:space-y-6">
            {stats.topProducts.length > 0 ? stats.topProducts.map((product: any, i: number) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm md:text-base font-medium group-hover:text-yellow-400 transition-colors truncate">{product.name}</p>
                    <p className="text-[10px] md:text-xs text-zinc-500">{product.platform}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-sm md:text-base font-bold">{product.clicks}</p>
                  <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Cliques</p>
                </div>
              </div>
            )) : (
              <p className="text-zinc-500 text-sm italic">Nenhum dado disponível ainda.</p>
            )}
          </div>
          <button className="w-full mt-6 md:mt-8 py-3 md:py-4 border border-zinc-800 rounded-2xl text-zinc-400 text-xs md:text-sm font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
            Ver todos
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

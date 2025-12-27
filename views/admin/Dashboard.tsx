
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';

const Dashboard: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
  const [stats, setStats] = useState({
    albums: 0,
    clients: 0,
    photos: 0,
    revenue: 0,
    ticketMedio: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{label: string, value: number}[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { count: albumsCount } = await supabase.from('albums').select('*', { count: 'exact', head: true });
      const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
      const { count: photosCount } = await supabase.from('photos').select('*', { count: 'exact', head: true });
      
      const { data: selections } = await supabase
        .from('selections')
        .select(`
          created_at,
          album:album_id(preco_por_foto)
        `);

      let totalRevenue = 0;
      const dailyMap: { [key: string]: number } = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
        dailyMap[dateStr] = 0;
      }

      if (selections) {
        selections.forEach((sel: any) => {
          const price = sel.album?.preco_por_foto || 15;
          totalRevenue += price;
          const dateLabel = new Date(sel.created_at).toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
          if (dailyMap[dateLabel] !== undefined) {
            dailyMap[dateLabel] += 1;
          }
        });
      }

      const formattedChartData = Object.entries(dailyMap).map(([label, value]) => ({
        label,
        value
      }));

      setChartData(formattedChartData);
      setStats({
        albums: albumsCount || 0,
        clients: clientsCount || 0,
        photos: photosCount || 0,
        revenue: totalRevenue,
        ticketMedio: clientsCount ? totalRevenue / clientsCount : 0
      });

    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Álbuns Ativos', value: stats.albums, icon: ICONS.Albums, color: 'bg-red-500/10 text-red-500' },
    { label: 'Base de Clientes', value: stats.clients, icon: ICONS.Clients, color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Ticket Médio', value: stats.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: ICONS.Orders, color: 'bg-red-500/10 text-red-500' },
    { label: 'Faturamento Total', value: stats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: ICONS.Check, color: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Painel de Controle</h2>
          <p className="text-slate-500 font-medium text-sm">Dados reais do estúdio em tempo real.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl border-white/10 text-[10px] uppercase font-black tracking-widest text-slate-400" onClick={fetchDashboardData}>
          {loading ? 'Sincronizando...' : 'Sincronizar Dados'}
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2rem] flex items-center gap-6 shadow-2xl hover:border-red-500/20 transition-all group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300 ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-xl md:text-2xl font-black text-white">{loading ? '...' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
           <div className="flex justify-between items-center mb-16">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Atividade Semanal</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Fotos selecionadas por dia</p>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Real</span>
              </div>
           </div>
           
           <div className="relative h-72 w-full flex items-end justify-between gap-4 md:gap-8 px-2">
              <div className="absolute inset-0 flex flex-col justify-between opacity-[0.05] pointer-events-none">
                 {[1,2,3,4].map(i => <div key={i} className="w-full border-t border-white"></div>)}
              </div>

              {chartData.map((data, i) => {
                const maxVal = Math.max(...chartData.map(d => d.value), 10);
                const heightPercent = (data.value / maxVal) * 100;
                
                return (
                  <div key={i} className="relative flex-1 group flex flex-col items-center h-full justify-end">
                    <div 
                      className="w-full bg-gradient-to-t from-red-950 via-red-600 to-red-500 rounded-t-xl transition-all duration-1000 group-hover:brightness-125 shadow-[0_0_20px_rgba(255,0,0,0.1)] group-hover:shadow-[0_0_40px_rgba(255,0,0,0.3)]" 
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    >
                      {data.value > 0 && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-10">
                          {data.value} FOTOS
                        </div>
                      )}
                    </div>
                    <span className="mt-6 text-[10px] font-black text-slate-600 group-hover:text-red-500 transition-colors tracking-tighter">
                      {data.label}
                    </span>
                  </div>
                );
              })}
           </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-red-600 p-10 rounded-[2.5rem] flex flex-col justify-between text-white shadow-2xl shadow-red-900/20 flex-1 group hover:scale-[1.02] transition-transform duration-500">
             <div className="space-y-4">
                <div className="w-12 h-12 bg-black/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/10">
                  {ICONS.Plus}
                </div>
                <h3 className="text-2xl font-black leading-tight tracking-tighter uppercase">Novo Projeto</h3>
                <p className="text-white/80 font-bold text-sm leading-relaxed">Pronto para mais um evento de sucesso? Crie sua galeria agora.</p>
             </div>
             <Button 
               variant="primary" 
               className="bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] w-full mt-8 shadow-xl border border-white/5 active:scale-95 transition-all"
               onClick={onAction}
             >
               Criar Álbum
             </Button>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                   {ICONS.Check}
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest">Insight de Venda</h4>
             </div>
             <p className="text-slate-500 text-xs font-medium leading-relaxed">
               O faturamento via <span className="text-emerald-500 font-bold">WhatsApp</span> converte 3x mais rápido. Mantenha o contato próximo!
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

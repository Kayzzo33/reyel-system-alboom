
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';

const Dashboard: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
  const [counts, setCounts] = useState({ albums: 0, clients: 0, photos: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<number[]>([10, 25, 15, 40, 30, 60, 45]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { count: albumsCount } = await supabase.from('albums').select('*', { count: 'exact', head: true });
      const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
      const { count: photosCount } = await supabase.from('photos').select('*', { count: 'exact', head: true });
      
      const { data: selections } = await supabase.from('selections').select('created_at');
      
      setCounts({
        albums: albumsCount || 0,
        clients: clientsCount || 0,
        photos: photosCount || 0,
        revenue: (selections?.length || 0) * 15 // Exemplo de cálculo
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const stats = [
    { label: 'Álbuns Ativos', value: counts.albums, icon: ICONS.Albums, color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Base de Clientes', value: counts.clients, icon: ICONS.Clients, color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Fotos no Cloud', value: counts.photos, icon: ICONS.Photo, color: 'bg-orange-500/10 text-orange-500' },
    { label: 'Volume Seleções', value: counts.revenue / 15, icon: ICONS.Check, color: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-white tracking-tighter">Visão Geral</h2>
        <p className="text-slate-500 font-medium">Bem-vindo ao centro de comando ReyelProduções.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-slate-900 border border-white/5 p-8 rounded-[2rem] flex items-center gap-6 shadow-2xl hover:border-white/10 transition-all">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-white">{loading ? '...' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-white">Fluxo de Atividade</h3>
              <div className="flex gap-2">
                 <div className="w-3 h-3 rounded-full bg-[#d4af37]"></div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fotos Selecionadas</span>
              </div>
           </div>
           
           {/* Gráfico SVG Simples */}
           <div className="relative h-64 w-full flex items-end justify-between gap-4 px-4">
              <div className="absolute inset-0 flex flex-col justify-between opacity-5">
                 {[1,2,3,4].map(i => <div key={i} className="w-full border-t border-white"></div>)}
              </div>
              {chartData.map((val, i) => (
                <div key={i} className="relative flex-1 group">
                   <div 
                     className="w-full bg-gradient-to-t from-[#d4af37]/20 to-[#d4af37] rounded-t-xl transition-all duration-1000 group-hover:brightness-125" 
                     style={{ height: `${val}%` }}
                   ></div>
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-[9px] font-black px-2 py-1 rounded-md">
                      {val} pts
                   </div>
                </div>
              ))}
           </div>
           <div className="flex justify-between mt-6 px-4 text-[9px] font-black text-slate-600 uppercase tracking-tighter">
              <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
           </div>
        </div>

        <div className="bg-[#d4af37] p-10 rounded-[3rem] flex flex-col justify-between text-black shadow-2xl shadow-[#d4af37]/10">
           <div className="space-y-4">
              <h3 className="text-2xl font-black leading-tight">Comece um novo projeto agora</h3>
              <p className="text-black/60 font-bold text-sm">Crie uma galeria e envie o link para o cliente começar a escolher as fotos.</p>
           </div>
           <Button 
             variant="primary" 
             className="bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] w-full"
             onClick={onAction}
           >
             Criar Álbum
           </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

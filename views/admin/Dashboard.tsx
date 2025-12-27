
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ICONS } from '../../constants';
import Button from '../../components/ui/Button';

interface DashboardProps {
  onAction?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onAction }) => {
  const [counts, setCounts] = useState({ albums: 0, clients: 0, photos: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { count: albumsCount } = await supabase.from('albums').select('*', { count: 'exact', head: true });
      const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
      const { count: photosCount } = await supabase.from('photos').select('*', { count: 'exact', head: true });
      
      setCounts({
        albums: albumsCount || 0,
        clients: clientsCount || 0,
        photos: photosCount || 0,
        revenue: 0 
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const stats = [
    { label: 'Total de Álbuns', value: counts.albums, icon: ICONS.Albums, color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Total de Clientes', value: counts.clients, icon: ICONS.Clients, color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Fotos Armazenadas', value: counts.photos, icon: ICONS.Photo, color: 'bg-orange-500/10 text-orange-500' },
    { label: 'Receita Total', value: `R$ ${counts.revenue.toFixed(2)}`, icon: ICONS.Orders, color: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Dashboard Principal</h2>
          <p className="text-slate-400">Visão geral do seu estúdio e atividades recentes.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl flex items-center gap-4 shadow-xl hover:border-white/10 transition-colors">
            <div className={`p-4 rounded-xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/20 border border-slate-800 p-12 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-500">
          {ICONS.Photo}
        </div>
        <div className="max-w-md">
          <h3 className="text-xl font-bold text-white mb-2">Pronto para começar?</h3>
          <p className="text-slate-400">
            Seus dados do Supabase estão conectados. Agora você pode criar um álbum e começar a subir suas fotos para o Cloudflare R2.
          </p>
        </div>
        <Button variant="primary" className="px-8" onClick={onAction}>Criar Novo Álbum agora</Button>
      </div>
    </div>
  );
};

export default Dashboard;


import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { R2_CONFIG } from '../../lib/r2';
import { ICONS, COLORS } from '../../constants';
import Button from '../../components/ui/Button';

interface OrderGroup {
  album_id: string;
  client_id: string;
  album_nome: string;
  client_nome: string;
  client_whatsapp: string;
  client_email: string;
  photo_count: number;
  preco_por_foto: number;
  latest_date: string;
  photos: any[];
  status: string;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'andamento' | 'pago'>('andamento');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data: selections, error } = await supabase
        .from('selections')
        .select(`
          id,
          created_at,
          album_id (id, nome_galeria, preco_por_foto),
          client_id (id, nome, whatsapp, email),
          photo:photo_id (*)
        `);

      if (error) throw error;

      const { data: statuses } = await supabase.from('order_status').select('*');
      const groups: { [key: string]: OrderGroup } = {};

      selections?.forEach((sel: any) => {
        const album = sel.album_id;
        const client = sel.client_id;
        if (!album || !client) return;

        const key = `${album.id}-${client.id}`;
        const orderStatus = statuses?.find(s => s.album_id === album.id && s.client_id === client.id)?.status || 'pendente';

        if (!groups[key]) {
          groups[key] = {
            album_id: album.id,
            client_id: client.id,
            album_nome: album.nome_galeria,
            client_nome: client.nome,
            client_whatsapp: client.whatsapp || '',
            client_email: client.email || '',
            preco_por_foto: album.preco_por_foto || 15.00,
            photo_count: 0,
            latest_date: sel.created_at || new Date().toISOString(),
            photos: [],
            status: orderStatus
          };
        }
        groups[key].photo_count += 1;
        if (sel.photo) groups[key].photos.push(sel.photo);
      });

      setOrders(Object.values(groups).sort((a, b) => new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime()));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpdateStatus = async (order: OrderGroup, newStatus: string) => {
    try {
      const { error } = await supabase.from('order_status').upsert({ 
        album_id: order.album_id, 
        client_id: order.client_id, 
        status: newStatus 
      }, { onConflict: 'album_id,client_id' });
      if (error) throw error;
      alert(newStatus === 'pago' ? "Pagamento Aprovado!" : "Status alterado.");
      fetchOrders();
    } catch (err) { alert("Erro ao atualizar."); }
  };

  const filteredOrders = orders.filter(o => o.status === activeTab);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter leading-none">Vendas e Seleções</h2>
          <p className="text-slate-500 font-medium">Controle de faturamento e aprovação de downloads.</p>
        </div>
        <div className="flex bg-slate-900 p-2 rounded-2xl border border-white/5">
           <button className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'andamento' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-slate-500'}`} onClick={() => setActiveTab('andamento')}>Pendente</button>
           <button className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pago' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-slate-500'}`} onClick={() => setActiveTab('pago')}>Pago</button>
        </div>
      </header>

      {loading ? <div className="h-64 bg-slate-900 rounded-[3rem] animate-pulse"></div> : filteredOrders.length === 0 ? (
        <div className="py-24 text-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center gap-6">
           <div className="w-16 h-16 bg-slate-850 rounded-2xl flex items-center justify-center text-slate-700">{ICONS.Orders}</div>
           <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.3rem]">Nenhuma atividade recente</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredOrders.map((order, idx) => (
            <div key={idx} className={`bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden transition-all duration-500 ${expandedOrder === `${order.album_id}-${order.client_id}` ? 'ring-2 ring-[#d4af37]/40 shadow-3xl' : 'hover:border-white/10'}`}>
                <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-[#d4af37]/10 text-[#d4af37] rounded-[2rem] flex items-center justify-center font-black text-2xl border border-[#d4af37]/20 shadow-2xl">
                      {order.photo_count}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter">{order.client_nome}</h3>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Álbum: {order.album_nome}</p>
                      <p className="text-[10px] text-slate-700 font-bold mt-1">EM {new Date(order.latest_date).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="text-right">
                       <p className="text-3xl font-black text-white tracking-tighter">{(order.photo_count * order.preco_por_foto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Valor do Pedido</p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setExpandedOrder(expandedOrder === `${order.album_id}-${order.client_id}` ? null : `${order.album_id}-${order.client_id}`)} className="p-5 bg-slate-850 text-slate-400 rounded-2xl hover:text-white transition-all shadow-xl">{ICONS.View}</button>
                      <button onClick={() => window.open(`https://wa.me/55${order.client_whatsapp.replace(/\D/g, '')}`, '_blank')} className="p-5 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl">{ICONS.Orders}</button>
                    </div>
                  </div>
                </div>
                {expandedOrder === `${order.album_id}-${order.client_id}` && (
                  <div className="px-10 pb-10 animate-in slide-in-from-top-4 duration-500 space-y-10">
                     <div className="flex justify-between items-center border-t border-white/5 pt-10">
                        <h4 className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.3rem]">Fotos Escolhidas</h4>
                        <Button variant="primary" size="sm" className="rounded-2xl px-10 py-4 font-black text-[10px] uppercase tracking-widest" onClick={() => handleUpdateStatus(order, order.status === 'pago' ? 'andamento' : 'pago')}>
                           {order.status === 'pago' ? 'Revogar Acesso' : 'Aprovar e Liberar Download'}
                        </Button>
                     </div>
                     <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 bg-black/40 p-8 rounded-[3rem] border border-white/5">
                        {order.photos.map((photo, pIdx) => (
                          <div key={pIdx} className="aspect-square rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-[#d4af37]/50 transition-all">
                             <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                     </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;

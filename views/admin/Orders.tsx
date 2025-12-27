
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
  photos: any[]; // Detalhes das fotos
  status: string; // 'pendente' | 'pago'
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
      
      // Busca seleções e fotos vinculadas
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

      // Busca status de pagamento
      const { data: statuses } = await supabase.from('order_status').select('*');

      const groups: { [key: string]: OrderGroup } = {};

      selections?.forEach((sel: any) => {
        const album = sel.album_id;
        const client = sel.client_id;
        if (!album || !client) return;

        const key = `${album.id}-${client.id}`;
        
        // Determina status
        const orderStatus = statuses?.find(s => s.album_id === album.id && s.client_id === client.id)?.status || 'pendente';

        if (!groups[key]) {
          groups[key] = {
            album_id: album.id,
            client_id: client.id,
            album_nome: album.nome_galeria,
            client_nome: client.nome,
            client_whatsapp: client.whatsapp || '',
            client_email: client.email || '',
            preco_por_foto: album.preco_por_foto || 0,
            photo_count: 0,
            latest_date: sel.created_at,
            photos: [],
            status: orderStatus
          };
        }
        groups[key].photo_count += 1;
        if (sel.photo) groups[key].photos.push(sel.photo);
      });

      setOrders(Object.values(groups).sort((a, b) => new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime()));
    } catch (err) {
      console.error("Erro pedidos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (order: OrderGroup, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_status')
        .upsert({ 
          album_id: order.album_id, 
          client_id: order.client_id, 
          status: newStatus 
        }, { onConflict: 'album_id,client_id' });
      
      if (error) throw error;
      alert(newStatus === 'pago' ? "Pagamento aprovado! O cliente agora pode baixar as fotos." : "Status atualizado.");
      fetchOrders();
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  };

  const handleChargeWhatsApp = (order: OrderGroup) => {
    const total = (order.photo_count * order.preco_por_foto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const message = `Olá ${order.client_nome}! 👋%0A%0AVi que você escolheu *${order.photo_count} fotos* do álbum *${order.album_nome}*.%0A%0AO total é de *${total}*. Aguardo o PIX para liberar seu acesso! 📸`;
    window.open(`https://wa.me/55${order.client_whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const filteredOrders = orders.filter(o => o.status === activeTab);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Seleções e Pedidos</h2>
          <p className="text-slate-400 font-medium">Acompanhe as escolhas dos seus clientes em tempo real.</p>
        </div>
        
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-inner">
           <button 
             className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'andamento' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
             onClick={() => setActiveTab('andamento')}
           >
             Em Aberto
           </button>
           <button 
             className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'pago' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
             onClick={() => setActiveTab('pago')}
           >
             Finalizados
           </button>
        </div>
      </header>

      {loading ? (
        <div className="h-64 bg-slate-900/50 rounded-[3rem] animate-pulse"></div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-24 text-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center gap-4">
           <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600">{ICONS.Orders}</div>
           <p className="text-slate-500 font-bold">Nenhum pedido nesta categoria.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredOrders.map((order, idx) => {
            const isExpanded = expandedOrder === `${order.album_id}-${order.client_id}`;
            return (
              <div key={idx} className={`bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-500 ${isExpanded ? 'ring-2 ring-[#d4af37]/40 shadow-2xl shadow-[#d4af37]/5' : 'hover:border-white/10'}`}>
                <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#d4af37]/10 text-[#d4af37] rounded-2xl flex items-center justify-center font-black text-xl border border-[#d4af37]/20">
                      {order.photo_count}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{order.client_nome}</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Álbum: <span className="text-slate-200">{order.album_nome}</span></p>
                      <p className="text-[10px] text-slate-600 font-black uppercase mt-1">Sessão: {new Date(order.latest_date).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-2xl font-black text-white">{(order.photo_count * order.preco_por_foto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                       <p className="text-[9px] text-slate-500 font-bold uppercase">Valor Estimado</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setExpandedOrder(isExpanded ? null : `${order.album_id}-${order.client_id}`)}
                        className={`p-4 rounded-xl transition-all border ${isExpanded ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-slate-850 text-slate-400 border-white/5 hover:text-white'}`}
                      >
                        {ICONS.View}
                      </button>
                      <button onClick={() => handleChargeWhatsApp(order)} className="p-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all">
                        {ICONS.Orders}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-8 pb-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="border-t border-white/5 pt-8 space-y-8">
                       <div className="flex justify-between items-end">
                          <h4 className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest">Fotos Selecionadas ({order.photo_count})</h4>
                          {order.status === 'pendente' && (
                            <Button variant="primary" size="sm" className="rounded-xl px-6 py-3 font-black uppercase text-[10px] tracking-widest" onClick={() => handleUpdateStatus(order, 'pago')}>
                              Aprovar Pagamento e Liberar Download
                            </Button>
                          )}
                          {order.status === 'pago' && (
                            <Button variant="outline" size="sm" className="rounded-xl px-6 py-3 font-black uppercase text-[10px] tracking-widest text-emerald-500 border-emerald-500/30" onClick={() => handleUpdateStatus(order, 'andamento')}>
                              Revogar Acesso (Marcar como Pendente)
                            </Button>
                          )}
                       </div>
                       
                       <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 bg-slate-950/50 p-6 rounded-3xl border border-white/5">
                          {order.photos.map((photo, pIdx) => (
                            <div key={pIdx} className="aspect-square rounded-xl overflow-hidden ring-1 ring-white/10 group cursor-pointer hover:ring-[#d4af37]/50 transition-all">
                               <img src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;

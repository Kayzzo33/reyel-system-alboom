
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { R2_CONFIG } from '../../lib/r2';
import { ICONS } from '../../constants';
import Button from '../../components/ui/Button';
import { Profile } from '../../types';

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'andamento' | 'pago'>('andamento');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile(data);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Força a busca de dados novos ignorando cache se possível
      const { data: selections, error } = await supabase
        .from('selections')
        .select(`
          id,
          created_at,
          album:album_id!inner(id, nome_galeria, preco_por_foto, photographer_id),
          client:client_id!inner(id, nome, whatsapp, email),
          photo:photo_id(*)
        `)
        .eq('album.photographer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: statuses } = await supabase.from('order_status').select('*');
      const groups: { [key: string]: OrderGroup } = {};

      selections?.forEach((sel: any) => {
        const albumData = sel.album;
        const clientData = sel.client;
        if (!albumData || !clientData) return;

        const key = `${albumData.id}-${clientData.id}`;
        const currentStatus = statuses?.find(s => s.album_id === albumData.id && s.client_id === clientData.id)?.status || 'pendente';

        if (!groups[key]) {
          groups[key] = {
            album_id: albumData.id,
            client_id: clientData.id,
            album_nome: albumData.nome_galeria,
            client_nome: clientData.nome,
            client_whatsapp: clientData.whatsapp || '',
            client_email: clientData.email || '',
            preco_por_foto: profile?.default_price_per_photo || albumData.preco_por_foto || 15.00,
            photo_count: 0,
            latest_date: sel.created_at,
            photos: [],
            status: currentStatus
          };
        }
        
        groups[key].photo_count += 1;
        if (sel.photo) groups[key].photos.push(sel.photo);
      });

      setOrders(Object.values(groups).sort((a, b) => new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime()));
    } catch (err) { 
      console.error(err);
    } finally { 
      setLoading(false); 
    }
  };

  const handleUpdateStatus = async (order: OrderGroup, newStatus: string) => {
    try {
      const { error } = await supabase.from('order_status').upsert({ 
        album_id: order.album_id, 
        client_id: order.client_id, 
        status: newStatus 
      }, { onConflict: 'album_id,client_id' });
      if (error) throw error;
      fetchOrders();
    } catch (err) { alert("Erro ao atualizar status."); }
  };

  const openWhatsApp = (order: OrderGroup) => {
    const total = (order.photo_count * (profile?.default_price_per_photo || order.preco_por_foto)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const message = `Olá ${order.client_nome.split(' ')[0]}! 👋%0A%0AConferi aqui sua seleção de *${order.photo_count} fotos* no álbum *${order.album_nome}*.%0A%0A💰 O valor total ficou em *${total}*.%0A%0A🔑 *Chave PIX:* ${profile?.pix_key || 'Favor solicitar chave pix'}%0A%0AFico no aguardo do comprovante para liberar o download das fotos originais em alta resolução! 😊`;
    window.open(`https://wa.me/55${order.client_whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const filteredOrders = orders.filter(o => activeTab === 'andamento' ? o.status === 'pendente' : o.status === 'pago');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Vendas e Seleções</h2>
          <p className="text-slate-500 font-medium">Controle de faturamento em tempo real.</p>
        </div>
        <div className="flex bg-slate-900 p-2 rounded-2xl border border-white/5 shadow-inner">
           <button className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'andamento' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`} onClick={() => setActiveTab('andamento')}>Pendentes ({orders.filter(o => o.status === 'pendente').length})</button>
           <button className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pago' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`} onClick={() => setActiveTab('pago')}>Pagos ({orders.filter(o => o.status === 'pago').length})</button>
        </div>
      </header>

      <div className="grid gap-6">
        {filteredOrders.map((order) => {
          const isExpanded = expandedOrder === `${order.album_id}-${order.client_id}`;
          const currentPrice = profile?.default_price_per_photo || order.preco_por_foto;
          
          return (
            <div key={`${order.album_id}-${order.client_id}`} className={`bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden transition-all duration-500 ${isExpanded ? 'ring-2 ring-[#d4af37]/20 shadow-3xl bg-slate-850' : 'hover:border-white/10'}`}>
                <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#d4af37]/10 text-[#d4af37] rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border border-[#d4af37]/10">{order.photo_count}</div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tighter">{order.client_nome}</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{order.album_nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                       <p className="text-2xl font-black text-white tracking-tighter">{(order.photo_count * currentPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                       <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">R$ {currentPrice.toFixed(2)} / foto</p>
                    </div>
                    <div className="flex gap-3">
                       <button onClick={() => setExpandedOrder(isExpanded ? null : `${order.album_id}-${order.client_id}`)} className={`p-4 rounded-xl transition-all shadow-xl ${isExpanded ? 'bg-[#d4af37] text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{ICONS.View}</button>
                       <button onClick={() => openWhatsApp(order)} className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl">{ICONS.Orders}</button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-10 pb-10 border-t border-white/5 pt-10 space-y-8 animate-in slide-in-from-top-4 duration-500">
                     <div className="flex justify-between items-center bg-black/20 p-6 rounded-3xl">
                        <p className="text-slate-400 text-sm font-bold">{order.client_email} • {order.client_whatsapp}</p>
                        <Button variant="primary" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest" onClick={() => handleUpdateStatus(order, order.status === 'pago' ? 'pendente' : 'pago')}>
                          {order.status === 'pago' ? 'Revogar Acesso' : 'Aprovar e Liberar Downloads'}
                        </Button>
                     </div>
                     <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 bg-black/40 p-8 rounded-[3rem] border border-white/5">
                        {order.photos.map(p => (
                          <div key={p.id} className="aspect-square rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-[#d4af37]/40 transition-all shadow-lg">
                             <img src={`${R2_CONFIG.publicUrl}/${p.r2_key_thumbnail}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                     </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Orders;

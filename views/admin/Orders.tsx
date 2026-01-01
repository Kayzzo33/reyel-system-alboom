
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase">Vendas e Seleções</h2>
          <p className="text-slate-500 font-medium text-sm">Controle de faturamento em tempo real.</p>
        </div>
        <div className="flex bg-[#0a0a0a] p-1.5 md:p-2 rounded-2xl border border-white/5 shadow-inner">
           <button className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'andamento' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-600 hover:text-white'}`} onClick={() => setActiveTab('andamento')}>Pendentes ({orders.filter(o => o.status === 'pendente').length})</button>
           <button className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pago' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-600 hover:text-white'}`} onClick={() => setActiveTab('pago')}>Pagos ({orders.filter(o => o.status === 'pago').length})</button>
        </div>
      </header>

      <div className="grid gap-4 md:gap-6">
        {filteredOrders.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-white/5 p-20 rounded-[3rem] text-center">
             <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Nenhum pedido nesta categoria.</p>
          </div>
        ) : filteredOrders.map((order) => {
          const key = `${order.album_id}-${order.client_id}`;
          const isExpanded = expandedOrder === key;
          const currentPrice = profile?.default_price_per_photo || order.preco_por_foto;
          
          return (
            <div key={key} className={`bg-[#0a0a0a] border border-white/5 rounded-[2rem] md:rounded-[3rem] overflow-hidden transition-all duration-500 ${isExpanded ? 'ring-1 ring-red-600/30 shadow-3xl' : 'hover:border-white/10'}`}>
                <div className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                  <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500/10 text-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl shadow-inner border border-emerald-500/10">{order.photo_count}</div>
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-black text-white tracking-tighter truncate max-w-[150px] md:max-w-none uppercase">{order.client_nome}</h3>
                      <p className="text-[8px] md:text-[10px] text-slate-600 uppercase font-black tracking-widest truncate max-w-[150px] md:max-w-none">{order.album_nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 md:gap-8 border-t border-white/5 md:border-none pt-4 md:pt-0">
                    <div className="text-left md:text-right">
                       <p className="text-xl md:text-2xl font-black text-white tracking-tighter">{(order.photo_count * currentPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                       <p className="text-[8px] md:text-[9px] text-slate-600 uppercase font-black tracking-widest">R$ {currentPrice.toFixed(2)}/foto</p>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                       <button onClick={() => setExpandedOrder(isExpanded ? null : key)} className={`p-3 md:p-4 rounded-xl transition-all ${isExpanded ? 'bg-red-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}>{ICONS.View}</button>
                       <button onClick={() => openWhatsApp(order)} className="p-3 md:p-4 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all">{ICONS.Orders}</button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/40 p-6 md:p-10 animate-in slide-in-from-top duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fotos Selecionadas ({order.photo_count})</h4>
                       <div className="flex gap-2">
                          <Button 
                            variant={order.status === 'pago' ? 'ghost' : 'primary'} 
                            size="sm" 
                            className="rounded-xl px-6"
                            onClick={() => handleUpdateStatus(order, order.status === 'pago' ? 'pendente' : 'pago')}
                          >
                            {order.status === 'pago' ? 'Reverter para Pendente' : 'Marcar como Pago'}
                          </Button>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {order.photos.map((photo: any) => (
                        <div key={photo.id} className="flex flex-col gap-2">
                          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 bg-[#0a0a0a] shadow-lg">
                            <img 
                              src={`${R2_CONFIG.publicUrl}/${photo.r2_key_thumbnail}`} 
                              className="w-full h-full object-cover" 
                              loading="lazy"
                            />
                          </div>
                          <div className="bg-white/5 rounded-lg py-2 px-3 text-center border border-white/5">
                            <p className="text-[10px] font-black text-white/70 uppercase tracking-tighter truncate">{photo.filename}</p>
                          </div>
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


import React from 'react';
import { ICONS, COLORS } from '../../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard },
    { id: 'albums', label: 'Álbuns', icon: ICONS.Albums },
    { id: 'clients', label: 'Clientes', icon: ICONS.Clients },
    { id: 'orders', label: 'Pedidos', icon: ICONS.Orders },
    { id: 'config', label: 'Configurações', icon: ICONS.Config },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col border-r border-slate-800 fixed left-0 top-0">
      <div className="p-6">
        <h1 className={`text-2xl font-bold text-[${COLORS.primary}] tracking-tight`}>
          REYEL<span className="text-white font-light">PROD</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id 
                ? `bg-[${COLORS.primary}] text-black shadow-md` 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          {ICONS.Logout}
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

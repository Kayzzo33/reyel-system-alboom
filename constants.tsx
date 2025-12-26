
import React from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  Users, 
  ShoppingBag, 
  Settings, 
  LogOut,
  Image as ImageIcon,
  Share2,
  Trash2,
  Download,
  CheckCircle,
  Eye,
  Plus,
  ArrowLeft,
  Search,
  Check
} from 'lucide-react';

export const COLORS = {
  primary: '#d4af37', // Gold for a premium feel
  secondary: '#1e293b',
  bg: '#0f172a',
  accent: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444'
};

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Albums: <Camera size={20} />,
  Clients: <Users size={20} />,
  Orders: <ShoppingBag size={20} />,
  Config: <Settings size={20} />,
  Logout: <LogOut size={20} />,
  Photo: <ImageIcon size={20} />,
  Share: <Share2 size={20} />,
  Delete: <Trash2 size={20} />,
  Download: <Download size={20} />,
  Check: <CheckCircle size={20} />,
  CheckSmall: <Check size={16} />,
  View: <Eye size={20} />,
  Plus: <Plus size={20} />,
  Back: <ArrowLeft size={20} />,
  Search: <Search size={20} />
};

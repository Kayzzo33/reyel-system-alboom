
import React from 'react';
import * as LucideIcons from 'lucide-react';

// Função de segurança para garantir que o ícone existe antes de tentar renderizar
const safeIcon = (iconName: keyof typeof LucideIcons, size = 20) => {
  const IconComponent = LucideIcons[iconName] as any;
  if (!IconComponent) {
    // Retorna um fallback visual caso o ícone falhe
    return <div style={{ width: size, height: size, border: '1px solid currentColor', opacity: 0.5, borderRadius: '4px' }} />;
  }
  return <IconComponent size={size} />;
};

export const COLORS = {
  primary: '#d4af37',
  secondary: '#1e293b',
  bg: '#020617',
  accent: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444'
};

export const ICONS = {
  Dashboard: safeIcon('LayoutDashboard'),
  Albums: safeIcon('Camera'),
  Clients: safeIcon('Users'),
  Orders: safeIcon('ShoppingBag'),
  Config: safeIcon('Settings'),
  Logout: safeIcon('LogOut'),
  Photo: safeIcon('Image'),
  Share: safeIcon('Share2'),
  Delete: safeIcon('Trash2'),
  Download: safeIcon('Download'),
  Check: safeIcon('CheckCircle'),
  CheckSmall: safeIcon('Check', 16),
  View: safeIcon('Eye'),
  Plus: safeIcon('Plus'),
  Back: safeIcon('ArrowLeft'),
  Search: safeIcon('Search')
};


import React from 'react';
import * as LucideIcons from 'lucide-react';

const safeIcon = (iconName: string, size = 20) => {
  try {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) {
      return <div style={{ width: size, height: size, background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />;
    }
    return <IconComponent size={size} />;
  } catch (e) {
    return <div style={{ width: size, height: size, background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />;
  }
};

export const COLORS = {
  primary: '#ff0000',
  secondary: '#0a0a0a',
  bg: '#000000',
  accent: '#ff3333',
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

import React from 'react';
import { Menu, Bell, Shield, User, Clock, Utensils } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';

export const Header = ({ onToggleSidebar }) => {
  const { user, isAdmin } = useAuth();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & breadcrumb/restaurant indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{today}</span>
            <span className="text-slate-300 mx-1">|</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">POS Terminal Online</span>
          </div>
        </div>
      </div>

      {/* Right: Quick stats & User Info */}
      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <Badge
          variant={isAdmin ? 'brand' : 'info'}
          size="md"
          className="hidden sm:inline-flex capitalize font-semibold tracking-wide"
        >
          {isAdmin ? 'Admin Terminal' : 'Cashier Counter'}
        </Badge>

        {/* User Chip */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
            <p className="text-[11px] text-slate-400 leading-tight">@{user?.username}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

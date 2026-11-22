import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  BookOpen,
  Receipt,
  CreditCard,
  BarChart3,
  LogOut,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, logout } = useAuth();

  const navigationItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, adminOnly: false },
    { name: 'Tables & Orders', to: '/tables', icon: UtensilsCrossed, adminOnly: false },
    { name: 'Billing', to: '/billing', icon: CreditCard, adminOnly: false },
    { name: 'Menu Management', to: '/menu', icon: BookOpen, adminOnly: true },
    { name: 'Bill History', to: '/bills', icon: Receipt, adminOnly: false },
    { name: 'Reports', to: '/reports', icon: BarChart3, adminOnly: true },
  ];

  const filteredNav = navigationItems.filter(
    (item) => !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-charcoal-900 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div>
          <div className="h-14 px-5 flex items-center gap-2.5 border-b border-white/10">
            <Store className="w-5 h-5 text-brand-400 shrink-0" />
            <span className="font-semibold text-white text-sm tracking-wide">Urban Plate</span>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-0.5">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User & Logout */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white uppercase">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

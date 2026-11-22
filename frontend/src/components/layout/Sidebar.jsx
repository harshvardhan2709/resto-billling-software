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
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, logout } = useAuth();

  const navigationItems = [
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      name: 'Tables & Orders',
      to: '/tables',
      icon: UtensilsCrossed,
      adminOnly: false,
    },
    {
      name: 'Billing & Checkout',
      to: '/billing',
      icon: CreditCard,
      adminOnly: false,
    },
    {
      name: 'Menu Management',
      to: '/menu',
      icon: BookOpen,
      adminOnly: true,
    },
    {
      name: 'Bill History',
      to: '/bills',
      icon: Receipt,
      adminOnly: false,
    },
    {
      name: 'Reports & Analytics',
      to: '/reports',
      icon: BarChart3,
      adminOnly: true,
    },
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-charcoal-900 border-r border-charcoal-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Logo Header */}
        <div>
          <div className="h-16 px-6 flex items-center gap-3 border-b border-charcoal-800">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold shadow-inner">
              <Store className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-wide flex items-center gap-1.5">
                Urban Plate
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  POS
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">GURU AI Restaurant OS</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Operations
            </div>
            {filteredNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-sm font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-charcoal-800'
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

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-charcoal-800 bg-charcoal-950/40">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg bg-charcoal-800/60 border border-charcoal-800">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase">
              {user?.name ? user.name.slice(0, 2) : 'UP'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {isAdmin ? (
                  <ShieldCheck className="w-3 h-3 text-brand-400" />
                ) : (
                  <UserCheck className="w-3 h-3 text-blue-400" />
                )}
                <span className="text-[10px] text-slate-400 capitalize font-medium">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UtensilsCrossed,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeDemo, setActiveDemo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const res = await login(identifier.trim(), password);
      const destination =
        location.state?.from?.pathname ||
        (res.user?.role === 'admin' ? '/dashboard' : '/tables');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (type) => {
    setError('');
    setActiveDemo(type);
    if (type === 'admin') {
      setIdentifier('admin');
      setPassword('admin123');
    } else {
      setIdentifier('cashier');
      setPassword('cashier123');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FBF9F5] text-slate-900 font-sans selection:bg-[#1B382B] selection:text-white">
      {/* ========================================================= */}
      {/* LEFT SECTION: Visual Hospitality Atmosphere (55-58% Desktop) */}
      {/* ========================================================= */}
      <section className="relative hidden lg:flex lg:w-[56%] xl:w-[58%] min-h-screen flex-col justify-between overflow-hidden bg-[#10241A] p-12 xl:p-16 text-white select-none">
        {/* Background Photograph with Fallback Gradient */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-[1.01]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=85')`,
          }}
        />

        {/* Multi-layered Editorial Overlays */}
        {/* Layer 1: Deep forest green tonal scrim */}
        <div className="absolute inset-0 bg-[#0E2017]/80 mix-blend-multiply" />
        {/* Layer 2: Vignette and vertical contrast gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08150F]/95 via-[#0A1A13]/55 to-[#0E2017]/45" />
        {/* Layer 3: Fine ambient grain texture simulation */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-black/30 pointer-events-none" />

        {/* Top Header: Brand Identity */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FBF9F5]/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[#FBF9F5] shadow-xs">
              <UtensilsCrossed className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="font-serif text-2xl font-semibold tracking-wide text-[#FBF9F5] block leading-none">
                Urban Plate
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-emerald-200/75 mt-1 block">
                Hospitality & POS Suite
              </span>
            </div>
          </div>
        </div>

        {/* Middle / Lower: Editorial Narrative */}
        <div className="relative z-10 max-w-xl my-auto pt-32">
          <h1 className="font-serif text-3xl xl:text-4xl leading-tight font-medium tracking-tight text-[#FBF9F5] mb-5">
            Crafted for the rhythm of thoughtful dining service.
          </h1>

          {/* Three Operational Service Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-300/80 font-medium">Floor Plan</p>
              <p className="text-sm font-semibold text-white mt-1">10 Dining Tables</p>
              <p className="text-[11px] text-white/60 mt-0.5">Live Occupancy</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-300/80 font-medium">Compliance</p>
              <p className="text-sm font-semibold text-white mt-1">5% GST Engine</p>
              <p className="text-[11px] text-white/60 mt-0.5">CGST &amp; SGST</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-300/80 font-medium">Settlement</p>
              <p className="text-sm font-semibold text-white mt-1">Split Payments</p>
              <p className="text-[11px] text-white/60 mt-0.5">Cash, UPI &amp; Cards</p>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/60 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-200/80">Systems Connected</span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* RIGHT SECTION: Clean, Refined Authentication Form         */}
      {/* ========================================================= */}
      <section className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 min-h-screen bg-[#FBF9F5]">
        {/* Mobile Brand Bar (Visible on mobile/tablet only) */}
        <div className="lg:hidden flex items-center justify-between pb-6 border-b border-[#EAE5DC]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#1B382B] flex items-center justify-center text-white shadow-xs">
              <UtensilsCrossed className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <span className="font-serif text-lg font-semibold tracking-wide text-slate-900 block leading-none">
                Urban Plate
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-0.5 block">
                POS System
              </span>
            </div>
          </div>
          <span className="text-[11px] font-medium text-[#1B382B] bg-[#EBF2EE] border border-[#D5E4DC] px-2.5 py-1 rounded-full">
            Staff Portal
          </span>
        </div>

        {/* Form Container (Centered with comfortable reading width) */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto py-8 sm:py-12">
          {/* Header Typography */}
          <div className="mb-7">
            <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 leading-normal">
              Sign in to manage your restaurant operations.
            </p>
          </div>

          {/* Demo Accounts Pill Switcher (Discreet & Professional) */}
          <div className="mb-6 p-3 rounded-xl bg-[#F4EFEA] border border-[#E7DFD4]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A635D] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1B382B]" />
                Select Demo Role
              </span>
              <span className="text-[10px] text-slate-500">Auto-fill credentials</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin')}
                className={`flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all duration-150 border ${activeDemo === 'admin'
                  ? 'bg-[#1B382B] text-white border-[#1B382B] shadow-xs'
                  : 'bg-white text-slate-700 border-[#E2DDD3] hover:border-[#1B382B]/40 hover:bg-[#FAF8F5]'
                  }`}
              >
                <span className="text-xs font-semibold">Admin (Manager)</span>
                <span
                  className={`text-[10px] leading-tight mt-0.5 ${activeDemo === 'admin' ? 'text-emerald-200' : 'text-slate-500'
                    }`}
                >
                  Reports &amp; Menu CRUD
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('cashier')}
                className={`flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all duration-150 border ${activeDemo === 'cashier'
                  ? 'bg-[#1B382B] text-white border-[#1B382B] shadow-xs'
                  : 'bg-white text-slate-700 border-[#E2DDD3] hover:border-[#1B382B]/40 hover:bg-[#FAF8F5]'
                  }`}
              >
                <span className="text-xs font-semibold">Cashier (Staff)</span>
                <span
                  className={`text-[10px] leading-tight mt-0.5 ${activeDemo === 'cashier' ? 'text-emerald-200' : 'text-slate-500'
                    }`}
                >
                  POS Floor &amp; Billing
                </span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-[#FDF2F2] border border-[#F5C2C2] flex items-start gap-2.5 text-[#9B2C2C] text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C53030]" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username or Email Input */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="admin or cashier@urbanplate.com"
                  className="block w-full rounded-lg border border-[#DDD7CD] bg-white text-slate-900 placeholder-slate-400 text-sm pl-10 pr-3.5 py-2.5 transition-colors duration-150 focus:border-[#1B382B] focus:ring-1 focus:ring-[#1B382B] focus:outline-none hover:border-[#C8BFB3]"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setActiveDemo(null);
                  }}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <span className="text-[11px] text-slate-500 font-normal">
                  Authorized staff only
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-[#DDD7CD] bg-white text-slate-900 placeholder-slate-400 text-sm pl-10 pr-10 py-2.5 transition-colors duration-150 focus:border-[#1B382B] focus:ring-1 focus:ring-[#1B382B] focus:outline-none hover:border-[#C8BFB3]"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setActiveDemo(null);
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#C8BFB3] text-[#1B382B] focus:ring-[#1B382B] focus:ring-offset-0 cursor-pointer accent-[#1B382B]"
                />
                <span className="text-xs text-slate-600">Remember this station</span>
              </label>
              <span className="text-[11px] text-slate-400">Terminal #01</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-11 sm:h-12 rounded-lg bg-[#1B382B] hover:bg-[#142C21] active:scale-[0.99] text-[#FBF9F5] font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1B382B] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

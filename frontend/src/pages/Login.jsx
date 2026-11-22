import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  UtensilsCrossed,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';

export const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const destination = location.state?.from?.pathname || (res.user.role === 'admin' ? '/dashboard' : '/tables');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (type) => {
    setError('');
    if (type === 'admin') {
      setIdentifier('admin');
      setPassword('admin123');
    } else {
      setIdentifier('cashier');
      setPassword('cashier123');
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Urban Plate Restaurant</h2>
        <p className="mt-1 text-xs text-slate-400">Restaurant Billing System</p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm px-4 sm:px-0">
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-5">Sign in</h3>

          {/* Demo Accounts */}
          <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-[11px] font-medium text-slate-500 mb-2">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-brand-500 hover:text-brand-600 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('cashier')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-brand-500 hover:text-brand-600 transition-colors"
              >
                Cashier
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username or Email"
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder="e.g. admin"
              icon={User}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-slate-900 bg-white placeholder-slate-400 text-sm pl-10 pr-10 py-2.5 transition-colors focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-semibold"
              loading={loading}
            >
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Lock, User, AlertCircle } from 'lucide-react';
import { useTranslation, useAuth } from '../App';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, resetPassword, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login fehlgeschlagen. Bitte überprüfen Sie E-Mail und Passwort.');
        setLoading(false);
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await resetPassword(email);
      if (result.success) {
        setResetSent(true);
        setLoading(false);
      } else {
        setError(result.error || 'Passwort-Reset fehlgeschlagen.');
        setLoading(false);
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
      setLoading(false);
    }
  };

  if (isResetMode) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden group border border-slate-100">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
            <img 
              src="/logo.png" 
              alt="norhamtrans logo" 
              className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="fallback-icon hidden absolute inset-0 items-center justify-center text-[#007AFF] z-10">
              <Truck size={32} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 pt-12 shadow-2xl space-y-6 relative">
          {resetSent ? (
              <div className="text-center space-y-6">
                <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center space-x-3">
                  <AlertCircle className="text-green-500 shrink-0" size={20} />
                  <p className="text-xs font-black text-green-600 leading-tight uppercase tracking-tight">E-Mail gesendet! Bitte prüfen Sie Ihren Posteingang.</p>
                </div>
                <button 
                  onClick={() => setIsResetMode(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-black py-5 rounded-2xl transition-all transform active:scale-95"
                >
                  Zurück zum Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 animate-bounce-short">
                    <AlertCircle className="text-red-500 shrink-0" size={20} />
                    <p className="text-xs font-black text-red-600 leading-tight uppercase tracking-tight">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">E-Mail Adresse</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm"
                      placeholder="example@norhamtrans.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#007AFF] hover:bg-blue-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-blue-600/30 transition-all transform active:scale-95 flex items-center justify-center space-x-2 text-base"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>E-Mail senden</span>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button 
                    type="button"
                    onClick={() => setIsResetMode(false)}
                    className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden group border border-slate-100">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
            <img 
              src="/logo.png" 
              alt="norhamtrans logo" 
              className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="fallback-icon hidden absolute inset-0 items-center justify-center text-[#007AFF] z-10">
              <Truck size={32} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <form 
          onSubmit={handleLogin} 
          className={`bg-white rounded-[40px] p-8 shadow-2xl space-y-6 transition-all relative ${error ? 'border-2 border-red-500/20 ring-4 ring-red-500/5' : ''}`}
        >
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 animate-bounce-short">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-xs font-black text-red-600 leading-tight uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">E-Mail Adresse</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                autoComplete="email"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm"
                placeholder="example@norhamtrans.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                required
                autoComplete="current-password"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#007AFF] hover:bg-blue-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-blue-600/30 transition-all transform active:scale-95 flex items-center justify-center space-x-2 text-base"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{t.login}</span>
            )}
          </button>

          <div className="pt-2 text-center">
            <button 
              type="button"
              onClick={() => setIsResetMode(true)}
              className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 opacity-60"
            >
              {t.forgotPass}
            </button>
          </div>
        </form>

        <p className="text-center mt-12 text-slate-500/30 text-[9px] font-black uppercase tracking-[0.4em]">
          &copy; {new Date().getFullYear()} {t.brand} Cockpit
        </p>
      </div>
    </div>
  );
};

export default Login;

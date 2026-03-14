import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mail, Lock, Loader2, User, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

type ModalMode = 'LOGIN' | 'REGISTER' | 'REGISTER_SUCCESS';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, initialMode = 'LOGIN' }) => {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('demo@evairsim.com');
  const [password, setPassword] = useState('password123');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [regError, setRegError] = useState('');

  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const resetRegForm = () => {
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirm('');
    setShowPassword(false);
    setShowConfirm(false);
    setAgreeTerms(false);
    setRegError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
      setMode('LOGIN');
    }, 1500);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setRegError('Please agree to the Terms of Use & Privacy Policy.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setMode('REGISTER_SUCCESS');
    }, 1800);
  };

  const handleClose = () => {
    onClose();
    setMode('LOGIN');
    resetRegForm();
  };

  const passwordStrength = regPassword.length === 0 ? 0 : regPassword.length < 6 ? 1 : regPassword.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'][passwordStrength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e'][passwordStrength];

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-12 pr-4 text-slate-900 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all text-sm";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 px-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[85vh] overflow-y-auto no-scrollbar">

        {mode === 'LOGIN' && (
          <>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-900">{t('login.sign_in')}</h2>
              <button onClick={handleClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="mb-5">
              <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-3 text-brand-orange mx-auto">
                <Lock size={28} />
              </div>
              <p className="text-center text-slate-500 text-sm">
                {t('login.sign_in_desc')}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">{t('login.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    className={inputClass}
                    placeholder={t('login.email_placeholder')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">{t('login.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    className={inputClass}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-orange text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center hover:bg-orange-600"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : t('login.sign_in')}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-xs text-slate-400">
                {t('login.no_account')}{' '}
                <button onClick={() => setMode('REGISTER')} className="text-brand-orange font-semibold">
                  {t('login.register')}
                </button>
              </p>
            </div>
          </>
        )}

        {mode === 'REGISTER' && (
          <>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <button onClick={() => { setMode('LOGIN'); resetRegForm(); }} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 -ml-1">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-bold text-slate-900">Create Account</h2>
              </div>
              <button onClick={handleClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>

            <p className="text-[14px] text-slate-400 mb-5">Join EvairSIM to manage your SIM cards, track orders, and stay connected worldwide.</p>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    className={inputClass}
                    placeholder="John Smith"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    className={inputClass}
                    placeholder="you@example.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={inputClass + ' pr-12'}
                    placeholder="Min. 8 characters"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {regPassword.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(passwordStrength / 3) * 100}%`, backgroundColor: strengthColor }} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    className={inputClass + ' pr-12'}
                    placeholder="Re-enter password"
                    value={regConfirm}
                    onChange={e => setRegConfirm(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {regConfirm.length > 0 && regPassword !== regConfirm && (
                  <p className="text-[12px] text-red-500 mt-1.5">Passwords do not match</p>
                )}
              </div>

              <label className="flex items-start gap-3 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-brand-orange rounded"
                />
                <span className="text-[13px] text-slate-500 leading-relaxed">
                  I agree to the <span className="text-brand-orange font-semibold">Terms of Use</span> and <span className="text-brand-orange font-semibold">Privacy Policy</span>
                </span>
              </label>

              {regError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  <p className="text-[13px] text-red-600 font-medium">{regError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(255,102,0,0.25)',
                }}
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Create Account'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-[13px] text-slate-400">
                Already have an account?{' '}
                <button onClick={() => { setMode('LOGIN'); resetRegForm(); }} className="text-brand-orange font-semibold">
                  Sign In
                </button>
              </p>
            </div>
          </>
        )}

        {mode === 'REGISTER_SUCCESS' && (
          <div className="py-4 text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Account Created</h2>
            <p className="text-[14px] text-slate-500 leading-relaxed mb-6 max-w-[260px] mx-auto">
              Welcome to EvairSIM! You can now sign in to manage your SIM cards and track orders.
            </p>
            <button
              onClick={() => {
                setEmail(regEmail);
                setPassword('');
                resetRegForm();
                setMode('LOGIN');
              }}
              className="w-full py-4 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              style={{
                background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(255,102,0,0.25)',
              }}
            >
              Sign In Now
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginModal;
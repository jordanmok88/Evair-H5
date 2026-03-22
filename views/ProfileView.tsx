import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Share, ChevronLeft, Search, Lock, Bell, Download, Trash2, Check, Plus, Package, HelpCircle, FileText, Globe, Info, Coins, ShieldCheck, CreditCard, ShoppingBag, Briefcase, Phone, Settings, AlertCircle, Play, Smartphone, Loader2, X } from 'lucide-react';
import { AppNotification } from '../types';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { userService } from '../services/api';
import type { UserDto } from '../services/api/types';

interface ProfileViewProps {
  isLoggedIn: boolean;
  user?: { name: string; role: string; email: string };
  onLogin: () => void;
  onSignup: () => void;
  onLogout: () => void;
  onOpenDialer: () => void;
  onOpenInbox: () => void;
  notifications?: AppNotification[];
  onBack?: () => void;
  onUserUpdate?: (user: { name: string; role: string; email: string }) => void;
}

type ProfileScreen = 'MAIN' | 'ACCOUNT' | 'INBOX' | 'ORDERS' | 'CURRENCY' | 'HELP' | 'INFO' | 'LANGUAGES' | 'REFUND' | 'TERMS' | 'ABOUT' | 'PRIVACY' | 'ACCEPTABLE' | 'COOKIE';

// --- Shared Components ---

const MenuItem = ({ label, onClick, isLast = false, rightElement }: { label: string, onClick?: () => void, isLast?: boolean, rightElement?: React.ReactNode }) => (
  <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 active:bg-slate-50 transition-colors ${!isLast ? 'border-b border-slate-100' : ''}`}
  >
      <span className="text-slate-900 font-medium text-sm text-left flex-1">{label}</span>
      {rightElement ? rightElement : <ChevronRight size={18} className="text-slate-300" />}
  </button>
);

const MenuGroup = ({ children }: { children?: React.ReactNode }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-5 overflow-hidden">
        {children}
    </div>
);

const ScreenHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className="bg-white/90 backdrop-blur-xl pt-safe px-4 pb-3 flex items-center shrink-0 sticky top-0 z-10 border-b border-slate-100">
        <button onClick={onBack} className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors">
            <ChevronLeft size={22} className="text-slate-900" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 ml-2">{title}</h1>
    </div>
);

// --- Sub-Views ---

const AccountInfoView = ({ onBack, user, onUserUpdate }: { onBack: () => void, user?: any, onUserUpdate?: (user: { name: string; role: string; email: string }) => void }) => {
    const [promoEnabled, setPromoEnabled] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Password change modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordErrors, setPasswordErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const { t } = useTranslation();

    // Update editName when user changes
    React.useEffect(() => {
        if (user?.name) setEditName(user.name);
    }, [user?.name]);

    const handleSave = async () => {
        if (!editName.trim()) {
            setSaveError('Name is required');
            return;
        }
        setIsSaving(true);
        setSaveError('');
        try {
            const updated = await userService.updateProfile({ name: editName.trim() });
            onUserUpdate?.({ name: updated.name, role: updated.role, email: updated.email });
            setIsEditing(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err: any) {
            setSaveError(err.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        setPasswordErrors({});
        setPasswordError('');

        // Validation
        if (newPassword.length < 8) {
            setPasswordErrors({ new: 'Password must be at least 8 characters' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordErrors({ confirm: 'Passwords do not match' });
            return;
        }

        setPasswordLoading(true);
        try {
            await userService.changePassword({
                currentPassword,
                password: newPassword,
                passwordConfirmation: confirmPassword,
            });
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordSuccess(false);
            }, 1500);
        } catch (err: any) {
            setPasswordError(err.message || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
            <ScreenHeader title={t('profile.account_info')} onBack={onBack} />
            <div className="px-5 pb-6">
                {/* Success message */}
                {saveSuccess && (
                    <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
                        <Check size={16} className="text-green-500" />
                        <p className="text-[13px] text-green-600 font-medium">Profile updated successfully</p>
                    </div>
                )}

                <div className="space-y-4 mb-6">
                    <div>
                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4">
                            <label className="text-sm text-slate-500 block mb-1">{t('profile.first_name')}</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full text-slate-900 font-medium outline-none border border-slate-300 rounded-lg px-2 py-1"
                                    placeholder="Your name"
                                />
                            ) : (
                                <div className="text-slate-900 font-medium">{user?.name || "Jordan"}</div>
                            )}
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                            <label className="text-sm text-slate-500 block mb-1">{t('profile.last_name')}</label>
                            <div className="text-slate-400 italic">Not available</div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="flex-1">
                            <label className="text-sm text-slate-500 block mb-1">{t('profile.email')}</label>
                            <div className="text-slate-900 font-medium">{user?.email || "jordan_mok@icloud.com"}</div>
                        </div>
                        <Lock size={16} className="text-slate-400" />
                    </div>

                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="w-full bg-white border border-gray-200 rounded-full py-3 font-bold text-sm text-slate-900 shadow-sm active:scale-[0.99] transition-transform"
                    >
                        {isEditing ? 'Cancel Edit' : t('profile.edit')}
                    </button>

                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                         <div className="flex-1">
                            <label className="text-sm text-slate-500 block mb-1">{t('profile.current_password')}</label>
                            <div className="text-slate-900 font-medium">********</div>
                        </div>
                        <Lock size={16} className="text-slate-400" />
                    </div>

                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="w-full bg-white border border-gray-200 rounded-full py-3 font-bold text-sm text-slate-900 shadow-sm active:scale-[0.99] transition-transform"
                    >
                        Change Password
                    </button>

                    <div className="flex items-center gap-3 py-2">
                        <button
                            onClick={() => setPromoEnabled(!promoEnabled)}
                            className={`w-12 h-7 rounded-full p-1 transition-colors relative ${promoEnabled ? 'bg-brand-orange' : 'bg-gray-300'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${promoEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                        <span className="text-slate-900 font-medium text-sm">{t('profile.promo_emails')}</span>
                    </div>
                </div>

                {saveError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4">
                        <p className="text-[13px] text-red-600 font-medium">{saveError}</p>
                    </div>
                )}

                {isEditing && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-brand-orange text-white border border-gray-200 rounded-full py-4 font-bold text-lg shadow-sm mb-6 active:scale-[0.99] transition-transform flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : t('profile.save_changes')}
                    </button>
                )}

                <div className="mb-8">
                    <h3 className="font-bold text-slate-900 mb-2">{t('profile.delete_account')}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                        {t('profile.delete_account_desc')}
                    </p>
                    <button className="w-full bg-white border border-red-100 text-red-600 rounded-full py-3.5 font-bold shadow-sm active:scale-[0.99] transition-transform hover:bg-red-50">
                        {t('profile.delete_account_btn')}
                    </button>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                            <button onClick={() => { setShowPasswordModal(false); setPasswordErrors({}); setPasswordError(''); }} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                                <X size={18} />
                            </button>
                        </div>

                        {passwordSuccess ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                                    <Check size={32} className="text-green-500" />
                                </div>
                                <p className="text-slate-900 font-medium">Password changed successfully!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:outline-none focus:border-brand-orange"
                                        placeholder="Enter current password"
                                    />
                                    {passwordErrors.current && <p className="text-[12px] text-red-500 mt-1">{passwordErrors.current}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className={"w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:outline-none focus:border-brand-orange" + (passwordErrors.new ? ' border-red-400' : '')}
                                        placeholder="Min. 8 characters"
                                    />
                                    {passwordErrors.new && <p className="text-[12px] text-red-500 mt-1">{passwordErrors.new}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className={"w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:outline-none focus:border-brand-orange" + (passwordErrors.confirm ? ' border-red-400' : '')}
                                        placeholder="Re-enter new password"
                                    />
                                    {passwordErrors.confirm && <p className="text-[12px] text-red-500 mt-1">{passwordErrors.confirm}</p>}
                                </div>

                                {passwordError && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                                        <p className="text-[13px] text-red-600 font-medium">{passwordError}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handlePasswordChange}
                                    disabled={passwordLoading}
                                    className="w-full bg-brand-orange text-white py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center"
                                >
                                    {passwordLoading ? <Loader2 size={20} className="animate-spin" /> : 'Change Password'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const OrdersView = ({ onBack }: { onBack: () => void }) => {
    const { t } = useTranslation();
    return (
    <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
        <ScreenHeader title={t('profile.orders')} onBack={onBack} />
        <div className="px-5 pb-6 pt-2">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex gap-4 items-start active:scale-[0.99] transition-transform">
                <div className="text-4xl shadow-sm rounded-lg overflow-hidden">🇺🇸</div>
                <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900">United States / eSIM</h3>
                    <p className="text-slate-500 text-sm mb-3 mt-0.5">7 days - 1 GB</p>
                    <p className="text-slate-400 text-sm font-medium mb-4">13 Jan 2024, 08:37</p>
                    <p className="text-lg font-bold text-slate-900">$4.50 USD</p>
                </div>
            </div>
        </div>
    </div>
    );
};

const CurrencyView = ({ onBack }: { onBack: () => void }) => {
    const [selected, setSelected] = useState('USD');
    const { t } = useTranslation();
    const currencies = [
        { code: 'USD', name: t('profile.usd_name'), symbol: '$' },
    ];

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
            <ScreenHeader title={t('profile.currency')} onBack={onBack} />
            <div className="px-5 pb-6">
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-3.5 text-slate-900" size={20} />
                    <input 
                        type="text" 
                        placeholder={t('profile.search_currency')} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 font-medium placeholder:text-slate-900 focus:outline-none focus:border-brand-orange"
                    />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    {currencies.map((curr, idx) => (
                        <button 
                            key={curr.code}
                            onClick={() => setSelected(curr.code)}
                            className={`w-full flex items-center justify-between p-4 pl-5 active:bg-gray-50 transition-colors ${idx !== currencies.length - 1 ? 'border-b border-slate-100' : ''}`}
                        >
                            <span className="text-slate-900 font-bold text-[15px]">{curr.name} ({curr.code}) {curr.symbol}</span>
                            {selected === curr.code && <Check size={20} className="text-slate-900" strokeWidth={2.5} />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const LanguagesView = ({ onBack }: { onBack: () => void }) => {
    const { t, i18n } = useTranslation();
    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'es', name: 'Spanish', native: 'Español' },
        { code: 'zh', name: 'Chinese', native: '中文' },
    ];

    const handleLanguageChange = (code: string) => {
        i18n.changeLanguage(code);
        localStorage.setItem('evair-lang', code);
    };

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
            <ScreenHeader title={t('profile.languages')} onBack={onBack} />
            <div className="px-5 pt-6 pb-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    {languages.map((lang, idx) => (
                        <button 
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`w-full flex items-center justify-between p-4 pl-5 active:bg-gray-50 transition-colors ${idx !== languages.length - 1 ? 'border-b border-slate-100' : ''}`}
                        >
                            <span className="text-slate-900 font-bold text-[15px]">{lang.name} <span className="text-slate-400 font-medium ml-1">({lang.native})</span></span>
                            {i18n.language === lang.code && <Check size={20} className="text-slate-900" strokeWidth={2.5} />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AboutEvairView = ({ onBack }: { onBack: () => void }) => {
    const { t } = useTranslation();

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
            <ScreenHeader title={t('profile.about_evair')} onBack={onBack} />
            <div className="px-5 pt-2 pb-6">

                {/* Hero */}
                <div className="rounded-2xl mb-6 overflow-hidden px-5 py-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #3d1800 50%, #5c2600 100%)' }}>
                    <img src="/evairsim-logo-full.png" alt="EvairSIM – Travel eSIM and SIM Card Provider" loading="lazy" width={130} height={40} style={{ width: 130, height: 'auto', objectFit: 'contain', flexShrink: 0, mixBlendMode: 'screen' }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,165,80,0.6)', lineHeight: 1.5, letterSpacing: '0.02em', fontStyle: 'italic' }}>
                        "Connecting the world,<br />one journey at a time."
                    </p>
                </div>

                {/* Story */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5">
                    <h3 className="text-[15px] font-bold text-slate-900 mb-3">Our Story</h3>
                    <p className="text-[15px] text-slate-600 leading-relaxed mb-3">
                        EvairSIM was born from a simple frustration shared by travelers everywhere: arriving in a new country and being disconnected. Founded in Hong Kong — one of the world's most connected cities — Evair Digital Limited set out with a clear mission: make reliable, affordable mobile data accessible to anyone, anywhere on the planet.
                    </p>
                    <p className="text-[15px] text-slate-600 leading-relaxed">
                        Our founding team brings together deep expertise in telecommunications, mobile technology, and global logistics. From day one, we chose to partner directly with Tier-1 carriers in every region we serve, forging agreements with over 200 leading telecom operators across 190+ countries — from AT&T and T-Mobile in the United States to Vodafone and Orange across Europe, NTT Docomo in Japan, Telstra in Australia, and beyond. These aren't reseller arrangements — they are direct partnerships that give our customers priority access to the fastest, most reliable networks available.
                    </p>
                </div>

                {/* Network & Technology */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5">
                    <h3 className="text-[15px] font-bold text-slate-900 mb-3">World-Class Network Stability</h3>
                    <p className="text-[15px] text-slate-600 leading-relaxed mb-3">
                        We understand that connectivity isn't a luxury — it's a necessity. Whether you're navigating a bustling street market in Bangkok, closing a deal in a London café, or sharing a sunset from the coast of Portugal, you need data that simply works. That's why every EvairSIM plan is engineered for consistency and speed.
                    </p>
                    <p className="text-[15px] text-slate-600 leading-relaxed">
                        Our intelligent network routing technology automatically connects your device to the strongest available signal in your area, seamlessly switching between partner carriers to maintain uninterrupted 4G LTE and 5G coverage. The result is rock-solid stability with minimal latency — whether you're streaming, video calling, or relying on real-time GPS navigation in an unfamiliar city.
                    </p>
                </div>

                {/* Why Choose Us */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5">
                    <h3 className="text-[15px] font-bold text-slate-900 mb-4">Why Travelers Trust EvairSIM</h3>
                    <div className="space-y-4">
                        {[
                            { title: '190+ Countries', desc: 'Physical SIM or eSIM — global coverage with local carrier speeds' },
                            { title: 'Instant Activation', desc: 'eSIMs activated in under 60 seconds; physical SIMs shipped worldwide' },
                            { title: '5G / 4G LTE', desc: 'Priority access to the fastest available networks' },
                            { title: 'Zero Roaming Fees', desc: 'Transparent pricing — what you see is what you pay' },
                            { title: '200+ Carrier Partners', desc: 'Direct Tier-1 telecom partnerships worldwide' },
                            { title: '24/7 AI + Human Support', desc: 'Always available when you need us' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="w-1 h-full min-h-[32px] rounded-full bg-brand-orange shrink-0 mt-0.5"></div>
                                <div>
                                    <p className="text-[15px] font-bold text-slate-900">{item.title}</p>
                                    <p className="text-[14px] text-slate-500 mt-0.5">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mission */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <h3 className="text-[15px] font-bold text-slate-900 mb-3">Our Promise</h3>
                    <p className="text-[15px] text-slate-600 leading-relaxed mb-3">
                        At EvairSIM, we believe that staying connected should be effortless. No hunting for local SIM shops at the airport. No surprise roaming charges on your phone bill. No dropped connections during your most important moments abroad.
                    </p>
                    <p className="text-[15px] text-slate-600 leading-relaxed">
                        We're a young company with a bold ambition: to become the most trusted name in travel connectivity. Every decision we make — from which carriers we partner with to how we design our app — is driven by a single question: <span className="text-slate-900 font-semibold italic">"Does this make our customers' journey better?"</span> We're just getting started, and we're grateful to have you along for the ride.
                    </p>
                </div>

            </div>
        </div>
    );
};

const TermsOfUseView = ({ onBack }: { onBack: () => void }) => {
    const { t } = useTranslation();
    const sectionTitle = "text-[15px] font-bold text-slate-900 mb-2 mt-6";
    const bodyText = "text-[15px] text-slate-600 leading-relaxed";
    const listItem = "text-[15px] text-slate-600 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400";
    const numberedItem = "text-[15px] text-slate-600 leading-relaxed pl-5 relative";
    const numSpan = "absolute left-0 text-slate-400";

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
            <ScreenHeader title={t('profile.terms_of_use')} onBack={onBack} />
            <div className="px-5 pt-2 pb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">

                    <h2 className="text-lg font-bold text-slate-900 mb-1">Terms of Service</h2>
                    <p className="text-[13px] text-slate-400 font-medium mb-4">Evair Digital Limited</p>

                    {/* OVERVIEW */}
                    <h3 className={sectionTitle} style={{ marginTop: 0 }}>Overview</h3>
                    <p className={`${bodyText} mb-2`}>
                        Welcome to Evair Digital Limited! The terms "we", "us" and "our" refer to Evair Digital Limited (a company registered in Hong Kong Special Administrative Region ("Hong Kong SAR"); brand name "EvairSim"). We operate the website Evairdigital.com (the "Site") and provide global mobile data plans (the "Services"), including physical SIM cards and digital eSIMs, to customers worldwide.
                    </p>
                    <p className={bodyText}>
                        These Terms of Service ("Terms") govern your purchase and use of our physical SIM cards and eSIM data plans. By using the Services, you agree to these Terms and our Privacy Policy (compliant with global privacy laws, including GDPR, CCPA, and Hong Kong's Personal Data (Privacy) Ordinance). If you do not agree, you must not use the Services.
                    </p>

                    {/* SECTION 1 */}
                    <h3 className={sectionTitle}>Section 1: Access and Account</h3>
                    <p className={`${bodyText} mb-2`}>By agreeing to these Terms, you represent and warrant that:</p>
                    <div className="space-y-1">
                        <p className={numberedItem}><span className={numSpan}>(i)</span> you are at least the age of majority in your country/region;</p>
                        <p className={numberedItem}><span className={numSpan}>(ii)</span> you will use the Services only for lawful purposes; and</p>
                        <p className={numberedItem}><span className={numSpan}>(iii)</span> all information provided (e.g., shipping address, email address, device details) is accurate and complete.</p>
                    </div>
                    <p className={`${bodyText} mt-2`}>You are solely responsible for safeguarding your account credentials. Your account is personal and non-transferable.</p>

                    {/* SECTION 2 */}
                    <h3 className={sectionTitle}>Section 2: Our SIM Card and eSIM Products</h3>
                    <p className={`${bodyText} mb-2`}>Our Services consist of physical SIM cards and digital eSIM data plans ("Plans") for mobile data access in specified countries/regions. Each Plan includes:</p>
                    <div className="space-y-1">
                        <p className={listItem}>A pre-paid data allowance (e.g., 10GB, 30GB) valid for a specified period (e.g., 7 days, 30 days);</p>
                        <p className={listItem}>Network coverage limited to partner carriers in the Plan's designated region(s) (details listed on the Site for each Plan).</p>
                    </div>
                    <p className={`${bodyText} mt-3 mb-2`}><strong className="text-slate-800">Device Compatibility:</strong> Our Services require a compatible device. It is your responsibility to verify that your device is:</p>
                    <div className="space-y-1">
                        <p className={numberedItem}><span className={numSpan}>(i)</span> unlocked (not carrier-locked);</p>
                        <p className={numberedItem}><span className={numSpan}>(ii)</span> compatible with the network frequencies of our partner carriers in your target region; and</p>
                        <p className={numberedItem}><span className={numSpan}>(iii)</span> specifically supports eSIM technology, if purchasing an eSIM.</p>
                    </div>
                    <p className={`${bodyText} mt-2`}>We are not liable for activation failures due to incompatible or locked devices.</p>
                    <p className={`${bodyText} mt-2`}><strong className="text-slate-800">Regulatory Compliance:</strong> Our SIM cards and eSIMs comply with telecommunications regulations in target regions (e.g., U.S. FCC requirements, EU roaming rules, Australia's ACMA guidelines).</p>

                    {/* SECTION 3 */}
                    <h3 className={sectionTitle}>Section 3: Orders and Delivery</h3>
                    <p className={bodyText}>When you place an order for a Plan, you make an offer to purchase. We reserve the right to accept or reject orders (e.g., for fraud, regulatory restrictions in your region). Your order is confirmed when we send an order acceptance email, and payment is processed.</p>
                    <p className={`${bodyText} mt-3`}><strong className="text-slate-800">Digital Delivery (eSIMs):</strong> Upon order confirmation for an eSIM, we will automatically send an email to your provided address containing:</p>
                    <div className="space-y-1 mt-1">
                        <p className={numberedItem}><span className={numSpan}>(i)</span> a link to access your Plan details;</p>
                        <p className={numberedItem}><span className={numSpan}>(ii)</span> a QR code for eSIM installation; and</p>
                        <p className={numberedItem}><span className={numSpan}>(iii)</span> an ICCID (Integrated Circuit Card Identifier) for activation.</p>
                    </div>
                    <p className={`${bodyText} mt-2`}>Delivery is instantaneous. You must ensure your email provider does not filter the message as spam. Title and risk of loss transfer to you upon the electronic transmission of the eSIM details.</p>
                    <p className={`${bodyText} mt-3`}><strong className="text-slate-800">Physical Delivery (Physical SIM Cards):</strong> For physical SIM cards, delivery will be made to the shipping address you provide at checkout. Shipping times are estimates and not guaranteed. Title and risk of loss for physical SIM cards pass to you upon our delivery of the item to the carrier. You are responsible for providing an accurate and secure shipping address.</p>

                    {/* SECTION 4 */}
                    <h3 className={sectionTitle}>Section 4: Activation and Support</h3>
                    <p className={bodyText}><strong className="text-slate-800">Activation:</strong> To use the Plan, you must either insert the physical SIM card into your device or install the eSIM via the provided QR code or ICCID, following your device's instructions. Activation requires an internet connection (Wi-Fi or cellular) for eSIMs and may take a few minutes to complete on the local network.</p>
                    <p className={`${bodyText} mt-3`}><strong className="text-slate-800">Activation Issues:</strong> If you encounter problems activating your SIM card or eSIM (e.g., QR code not scanning, "No Service" errors), please email us at <span className="text-brand-orange font-semibold">Service@evairdigital.com</span> with your order number and a description of the issue. We will respond within 24 hours and use reasonable efforts to resolve the problem, which may include:</p>
                    <div className="space-y-1 mt-1">
                        <p className={listItem}>Resending the activation link/QR code;</p>
                        <p className={listItem}>Providing troubleshooting guidance;</p>
                        <p className={listItem}>Issuing a replacement SIM/eSIM if the issue is due to our error.</p>
                    </div>
                    <p className={`${bodyText} mt-3`}><strong className="text-slate-800">Limitations:</strong> We are not liable for activation failures caused by:</p>
                    <div className="space-y-1 mt-1">
                        <p className={numberedItem}><span className={numSpan}>(i)</span> incompatible/locked devices;</p>
                        <p className={numberedItem}><span className={numSpan}>(ii)</span> user error (e.g., incorrect installation, improper SIM insertion);</p>
                        <p className={numberedItem}><span className={numSpan}>(iii)</span> network outages or restrictions by your device's home carrier; or</p>
                        <p className={numberedItem}><span className={numSpan}>(iv)</span> factors beyond our control (e.g., local telecom disruptions).</p>
                    </div>

                    {/* SECTION 5 */}
                    <h3 className={sectionTitle}>Section 5: Prices, Taxes, and Payment</h3>
                    <p className={bodyText}>All listed prices include applicable taxes (VAT, GST, sales tax) for your country/region, calculated at checkout based on your location. No additional taxes will be added.</p>
                    <p className={`${bodyText} mt-2`}>Payment is processed via secure third-party gateways (e.g., Stripe, PayPal or Credit Card). By providing payment details, you warrant that you are authorized to use the payment method and that charges will be honored.</p>

                    {/* SECTION 6 */}
                    <h3 className={sectionTitle}>Section 6: Refunds and Cancellations</h3>
                    <p className={`${bodyText} mb-2`}><strong className="text-slate-800">eSIM Refunds:</strong> Due to the digital nature of eSIMs, refunds are only available if:</p>
                    <div className="space-y-1">
                        <p className={listItem}>The eSIM activation link/QR code was never delivered (and we cannot resolve the issue within 24 hours of your report);</p>
                        <p className={listItem}>Activation fails due to an error on our part (e.g., invalid ICCID, network partner outage), and we cannot provide a replacement Plan;</p>
                        <p className={listItem}>The Plan is unused, and you request cancellation within 1 hour of order confirmation.</p>
                    </div>
                    <p className={`${bodyText} mt-3`}><strong className="text-slate-800">Physical SIM Card Refunds & Disposal:</strong> If a refund is approved and issued for a physical SIM card, the SIM card will be permanently deactivated and disposed of.</p>
                    <p className={`${bodyText} mt-3 mb-2`}><strong className="text-slate-800">No refunds will be issued for:</strong></p>
                    <div className="space-y-1">
                        <p className={listItem}>Used or partially used Plans;</p>
                        <p className={listItem}>Activation failures due to device incompatibility, user error, or network issues beyond our control;</p>
                        <p className={listItem}>Expired Plans (unused data does not roll over after the Plan's validity period);</p>
                        <p className={listItem}>Original shipping fees for physical SIM cards.</p>
                    </div>

                    {/* SECTION 7 */}
                    <h3 className={sectionTitle}>Section 7: Use Restrictions</h3>
                    <p className={`${bodyText} mb-2`}>You agree to use the SIM/eSIM and Plan only for:</p>
                    <div className="space-y-1">
                        <p className={numberedItem}><span className={numSpan}>(i)</span> personal, non-commercial mobile data access;</p>
                        <p className={numberedItem}><span className={numSpan}>(ii)</span> lawful activities in compliance with local laws of the region where it is used.</p>
                    </div>
                    <p className={`${bodyText} mt-3 mb-2`}>You must not:</p>
                    <div className="space-y-1">
                        <p className={listItem}>Share, resell, or transfer the active eSIM/SIM to any third party for commercial gain;</p>
                        <p className={listItem}>Use the Services to bypass network restrictions or engage in illegal activities (e.g., fraud, spamming);</p>
                        <p className={listItem}>Modify, reverse-engineer, or tamper with the eSIM's digital files or the physical SIM card's integrated circuit.</p>
                    </div>

                    {/* SECTION 8 */}
                    <h3 className={sectionTitle}>Section 8: Intellectual Property</h3>
                    <p className={bodyText}>The activation materials (QR code, ICCID, Plan details), physical SIM designs, and our platform content (text, logos, software/APP) are our proprietary intellectual property. You are granted a limited, non-transferable license to use the SIM/eSIM solely for its intended purpose (accessing the purchased data Plan).</p>

                    {/* SECTION 9 */}
                    <h3 className={sectionTitle}>Section 9: Term and Expiry</h3>
                    <p className={bodyText}>Each Plan is valid for the period specified at purchase (e.g., 7 days from activation). The SIM/eSIM must be activated within 180 days of purchase/delivery—unactivated Plans will expire after this period, with no refund. Upon expiry, data access ends, and the SIM/eSIM will no longer connect to partner networks.</p>

                    {/* SECTION 10 */}
                    <h3 className={sectionTitle}>Section 10: Privacy and Data Usage</h3>
                    <p className={bodyText}>To activate and provision the service, we may process your device's IMEI (International Mobile Equipment Identity) and activation status. This data is handled in compliance with our Privacy Policy and used solely to provide the Service. Your mobile data usage (e.g., websites visited) is not tracked or stored by us—this data is managed by our network partners, subject to their privacy policies.</p>

                    {/* SECTION 11 */}
                    <h3 className={sectionTitle}>Section 11: Limitation of Liability</h3>
                    <p className={`${bodyText} mb-2`}>To the maximum extent permitted by law, we are not liable for:</p>
                    <div className="space-y-1">
                        <p className={listItem}>Loss of data access due to Plan expiry, network outages, or partner carrier issues;</p>
                        <p className={listItem}>Indirect damages (e.g., missed business opportunities, lost profits) from SIM/eSIM malfunction or activation failure;</p>
                        <p className={listItem}>Damages arising from your use of the Services in violation of these Terms or local laws.</p>
                    </div>
                    <p className={`${bodyText} mt-2`}>Our total liability for any claim related to a Plan is capped at the purchase price of that Plan.</p>

                    {/* SECTION 12 */}
                    <h3 className={sectionTitle}>Section 12: General Terms</h3>
                    <p className={bodyText}>Sections covering Intellectual Property, Third-Party Links, Relationship with E-commerce Platforms, Errors/Omissions, Prohibited Uses, Termination, Disclaimer of Warranties, Indemnification, Severability, Waiver, Entire Agreement, Assignment, Governing Law, Changes to Terms, and Contact Information apply to all physical and digital services provided.</p>

                    {/* SECTION 13 */}
                    <h3 className={sectionTitle}>Section 13: Contact Information</h3>
                    <p className={`${bodyText} mb-2`}>For support, refunds, or questions:</p>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                        <div className="flex items-start gap-2">
                            <span className="text-[14px] font-bold text-slate-500 shrink-0">Email:</span>
                            <span className="text-[14px] text-brand-orange font-semibold">Service@evairdigital.com</span>
                        </div>
                        <p className="text-[13px] text-slate-400">(responses within 24 hours)</p>
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                            <span className="text-[14px] font-bold text-slate-500 shrink-0">Address:</span>
                            <span className="text-[14px] text-slate-600">Tower A, Hunghom Commercial Centre, 39 Ma Tau Wai Road, Hung Hom, Hong Kong SAR</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const AcceptableUsePolicyView = ({ onBack }: { onBack: () => void }) => {
    const { t } = useTranslation();
    const ruleText = "text-[15px] text-slate-600 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400";
    const bodyText = "text-[15px] text-slate-600 leading-relaxed";
    const sectionTitle = "text-[15px] font-bold text-slate-900 mb-2 mt-6";

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
            <ScreenHeader title={t('profile.acceptable_use')} onBack={onBack} />
            <div className="px-5 pt-2 pb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">

                    <h2 className="text-lg font-bold text-slate-900 mb-1">Fair Usage Policy</h2>
                    <p className={`${bodyText} mt-2 mb-4`}>
                        By accessing or using the EvairSIM platform and services, you agree to abide by the following guidelines:
                    </p>

                    <div className="space-y-2.5">
                        <p className={ruleText}>You must be at least 13 years of age to use our Services.</p>
                        <p className={ruleText}>You may not resell, transfer, copy, distribute, or share any part of the Services with third parties.</p>
                        <p className={ruleText}>You may not impersonate another person, conceal your identity, or misrepresent your affiliation with any person or entity in order to gain unauthorized access to accounts or for any other purpose.</p>
                        <p className={ruleText}>You may not engage in fraud, any other illegal or criminal activity, or violate any applicable law.</p>
                        <p className={ruleText}>You may not take any action that could impair the operation or performance of the networks that support EvairSIM's Services.</p>
                        <p className={ruleText}>You may not use the Platform or Services in any way that degrades their performance, security, or functionality, or that interferes with other users' access.</p>
                        <p className={ruleText}>You may not harass, insult, defame, stalk, threaten, intimidate, or otherwise infringe upon the legal rights of any person, including EvairSIM staff.</p>
                        <p className={ruleText}>You may not use the Platform or Services in any manner that could damage EvairSIM's reputation or for unauthorized commercial purposes.</p>
                        <p className={ruleText}>You may not use the Platform or Services to develop or provide any product, service, or feature that competes with EvairSIM.</p>
                        <p className={ruleText}>You may not conduct — or facilitate, permit, or authorize — any text mining, data mining, or web scraping of our website without our express written permission. This includes the training or development of artificial intelligence systems or models.</p>
                        <p className={ruleText}>You may not upload or transmit viruses, malware, or any other form of malicious code.</p>
                        <p className={ruleText}>You may not attempt to decipher, decompile, disassemble, or reverse-engineer any software or algorithms used to deliver the Services.</p>
                        <p className={ruleText}>You may not use any automated system — including bots, spiders, or offline readers — to access the Services.</p>
                        <p className={ruleText}>You may not send spam or unsolicited messages, transmit large volumes of content, or publicly distribute excessive amounts of information through our Services.</p>
                        <p className={ruleText}>You may not attempt to phish, crawl, or scrape any part of our Services.</p>
                    </div>

                    <h3 className={sectionTitle}>Account Security</h3>
                    <p className={bodyText}>
                        You are responsible for keeping your login credentials secure at all times. If you believe your account has been compromised, please change your password immediately and contact us at <span className="text-brand-orange font-semibold">service@evairdigital.com</span>.
                    </p>

                    <h3 className={sectionTitle}>Need Clarification?</h3>
                    <p className={bodyText}>
                        If you are unsure whether a specific use of the Platform or Services complies with this Fair Usage Policy, please reach out to our support team. Please note that you remain solely responsible for complying with all applicable local laws when using our Services.
                    </p>

                </div>
            </div>
        </div>
    );
};

const PrivacyPolicyView = ({ onBack }: { onBack: () => void }) => {
    const { t } = useTranslation();
    const sectionTitle = "text-[15px] font-bold text-slate-900 mb-2 mt-6";
    const bodyText = "text-[15px] text-slate-600 leading-relaxed";
    const listItem = "text-[15px] text-slate-600 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400";

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
            <ScreenHeader title={t('profile.privacy_policy')} onBack={onBack} />
            <div className="px-5 pt-2 pb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">

                    <h2 className="text-lg font-bold text-slate-900 mb-1">Privacy Policy</h2>
                    <p className="text-[13px] text-slate-400 font-medium mb-4">Last updated: February 6, 2026</p>

                    <p className={bodyText}>
                        EvairSIM operates the EvairSIM mobile application, including all related content, features, tools, and services, to provide you with SIM card and eSIM connectivity solutions (the "Services"). This Privacy Policy describes how we collect, use, and disclose your personal information when you use the app, purchase a data plan, or otherwise interact with us.
                    </p>
                    <p className={`${bodyText} mt-2`}>
                        If there is a conflict between our Terms of Service and this Privacy Policy, this Privacy Policy shall prevail with respect to the collection, processing, and disclosure of your personal information.
                    </p>

                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-3">
                        <p className="text-[14px] text-amber-700 font-medium">
                            Please read this Privacy Policy carefully. By using the EvairSIM app, you acknowledge that you have read and understood this Privacy Policy and consent to the collection, use, and disclosure of your information as described herein.
                        </p>
                    </div>

                    {/* Personal Information We Collect */}
                    <h3 className={sectionTitle}>Personal Information We Collect</h3>
                    <p className={`${bodyText} mb-2`}>
                        "Personal information" refers to data that identifies or can reasonably be linked to you. It does not include anonymized or de-identified data. Depending on how you use the app, we may collect the following:
                    </p>
                    <div className="space-y-1.5">
                        <p className={listItem}><strong className="text-slate-800">Contact details</strong> — your name, email address, phone number, billing address, and shipping address (for physical SIM orders).</p>
                        <p className={listItem}><strong className="text-slate-800">Payment information</strong> — credit or debit card details, payment method, transaction amounts, and payment confirmation.</p>
                        <p className={listItem}><strong className="text-slate-800">Account information</strong> — your username, password, preferences, and settings.</p>
                        <p className={listItem}><strong className="text-slate-800">Transaction information</strong> — data plans you browse, purchase, activate, or cancel, as well as your purchase history.</p>
                        <p className={listItem}><strong className="text-slate-800">Communications</strong> — messages and information you share when contacting our support team or using in-app chat.</p>
                        <p className={listItem}><strong className="text-slate-800">Device information</strong> — your device model, operating system, unique device identifiers, IP address, and network connection details.</p>
                        <p className={listItem}><strong className="text-slate-800">Usage information</strong> — how you interact with the app, including screens viewed, features used, and session duration.</p>
                    </div>

                    {/* Sources */}
                    <h3 className={sectionTitle}>How We Collect Your Information</h3>
                    <p className={`${bodyText} mb-2`}>We collect personal information from the following sources:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}><strong className="text-slate-800">Directly from you</strong> — when you create an account, purchase a data plan, contact support, or update your profile.</p>
                        <p className={listItem}><strong className="text-slate-800">Automatically through the app</strong> — from your device when you use the app, including through analytics tools and similar technologies.</p>
                        <p className={listItem}><strong className="text-slate-800">From our service providers</strong> — third-party partners who process payments, provide analytics, or deliver connectivity services on our behalf.</p>
                        <p className={listItem}><strong className="text-slate-800">From our telecom partners</strong> — carrier networks that help us deliver SIM and eSIM services to you.</p>
                    </div>

                    {/* How We Use */}
                    <h3 className={sectionTitle}>How We Use Your Personal Information</h3>
                    <p className={`${bodyText} mb-2`}>We use your personal information for the following purposes:</p>
                    <div className="space-y-2.5">
                        <div>
                            <p className="text-[15px] font-bold text-slate-800 mb-1">Deliver and Improve Our Services</p>
                            <p className={bodyText}>To process your data plan purchases, activate SIM cards and eSIMs, manage your account, remember your preferences, deliver connectivity services, process refunds, and continuously improve the app experience.</p>
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-slate-800 mb-1">Marketing and Communications</p>
                            <p className={bodyText}>To send you promotional offers, product updates, and relevant recommendations via email, push notifications, or in-app messages, based on your preferences and activity.</p>
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-slate-800 mb-1">Security and Fraud Prevention</p>
                            <p className={bodyText}>To verify your identity, secure your account and transactions, detect and prevent fraudulent or unauthorized activity, and protect the integrity of our Services.</p>
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-slate-800 mb-1">Customer Support</p>
                            <p className={bodyText}>To respond to your inquiries, troubleshoot issues, and provide timely and effective assistance through our support channels.</p>
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-slate-800 mb-1">Legal Compliance</p>
                            <p className={bodyText}>To comply with applicable laws, respond to legal requests, investigate potential violations of our terms or policies, and protect our legal rights.</p>
                        </div>
                    </div>

                    {/* How We Disclose */}
                    <h3 className={sectionTitle}>How We Share Your Information</h3>
                    <p className={`${bodyText} mb-2`}>We may share your personal information with third parties in the following circumstances:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}>With service providers who perform functions on our behalf, such as payment processing, data analytics, customer support, cloud hosting, SIM card shipping, and eSIM delivery.</p>
                        <p className={listItem}>With our telecom and carrier partners to activate and deliver SIM and eSIM connectivity services.</p>
                        <p className={listItem}>With marketing partners to deliver relevant communications and advertisements. These partners are bound by their own privacy policies.</p>
                        <p className={listItem}>When you explicitly consent or direct us to share your information with a third party.</p>
                        <p className={listItem}>With our affiliates or within our corporate group.</p>
                        <p className={listItem}>In connection with a business transaction (such as a merger, acquisition, or asset sale), to comply with legal obligations, enforce our terms, or protect the rights and safety of our users.</p>
                    </div>

                    {/* Third Party */}
                    <h3 className={sectionTitle}>Third-Party Links</h3>
                    <p className={bodyText}>
                        The app may contain links to third-party websites or services. If you follow these links, please be aware that they are governed by their own privacy policies. We are not responsible for the privacy practices, content, or security of any third-party sites or services.
                    </p>

                    {/* Children */}
                    <h3 className={sectionTitle}>Children's Data</h3>
                    <p className={bodyText}>
                        Our Services are not intended for children under the age of 13. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can take steps to delete it. We do not knowingly sell or share the personal information of individuals under 16 years of age.
                    </p>

                    {/* Security */}
                    <h3 className={sectionTitle}>Security and Data Retention</h3>
                    <p className={bodyText}>
                        We implement industry-standard security measures to protect your personal information. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security. We recommend that you use strong passwords and avoid sharing your account credentials. We retain your personal information for as long as necessary to provide the Services, maintain your account, comply with legal obligations, resolve disputes, and enforce our agreements.
                    </p>

                    {/* Rights */}
                    <h3 className={sectionTitle}>Your Rights and Choices</h3>
                    <p className={`${bodyText} mb-2`}>Depending on your location, you may have the following rights regarding your personal information:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}><strong className="text-slate-800">Access.</strong> Request access to the personal information we hold about you.</p>
                        <p className={listItem}><strong className="text-slate-800">Deletion.</strong> Request that we delete your personal information.</p>
                        <p className={listItem}><strong className="text-slate-800">Correction.</strong> Request that we correct inaccurate information.</p>
                        <p className={listItem}><strong className="text-slate-800">Data Portability.</strong> Request a copy of your data in a portable format, or ask us to transfer it to another provider.</p>
                        <p className={listItem}><strong className="text-slate-800">Opt Out.</strong> Opt out of the sale or sharing of your personal information, or out of targeted advertising, where applicable under local law.</p>
                        <p className={listItem}><strong className="text-slate-800">Communication Preferences.</strong> Unsubscribe from promotional emails at any time using the link provided. You will still receive essential communications related to your account and purchases.</p>
                    </div>

                    <p className={`${bodyText} mt-3 mb-2`}>If you are located in the UK or European Economic Area, you may also:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}><strong className="text-slate-800">Object to or Restrict Processing:</strong> Ask us to stop or limit how we process your personal information for certain purposes.</p>
                        <p className={listItem}><strong className="text-slate-800">Withdraw Consent:</strong> Where processing is based on your consent, you may withdraw it at any time. This will not affect the lawfulness of any processing that occurred before the withdrawal.</p>
                    </div>

                    <p className={`${bodyText} mt-2`}>We will never discriminate against you for exercising these rights. We may need to verify your identity before processing your request. You may also designate an authorized agent to submit requests on your behalf.</p>

                    {/* Complaints */}
                    <h3 className={sectionTitle}>Complaints</h3>
                    <p className={bodyText}>
                        If you have concerns about how we handle your personal information, please contact us using the details below. Depending on your location, you may also have the right to lodge a complaint with your local data protection authority.
                    </p>

                    {/* International Transfers */}
                    <h3 className={sectionTitle}>International Data Transfers</h3>
                    <p className={bodyText}>
                        As a global connectivity provider, we may transfer, store, and process your personal information in countries other than your own. When transferring data outside the European Economic Area or the United Kingdom, we rely on recognized legal mechanisms such as the European Commission's Standard Contractual Clauses, or equivalent frameworks, to ensure your data receives an adequate level of protection.
                    </p>

                    {/* Changes */}
                    <h3 className={sectionTitle}>Changes to This Privacy Policy</h3>
                    <p className={bodyText}>
                        We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or operational needs. When we do, we will update the "Last updated" date at the top of this page and notify you through the app or via email as required by applicable law.
                    </p>

                    {/* Contact */}
                    <h3 className={sectionTitle}>Contact Us</h3>
                    <p className={`${bodyText} mb-3`}>
                        If you have any questions about this Privacy Policy or wish to exercise any of your rights, please contact us:
                    </p>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                        <div className="flex items-start gap-2">
                            <span className="text-[14px] font-bold text-slate-500 shrink-0">Email:</span>
                            <span className="text-[14px] text-brand-orange font-semibold">service@evairdigital.com</span>
                        </div>
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                            <span className="text-[14px] font-bold text-slate-500 shrink-0">Address:</span>
                            <span className="text-[14px] text-slate-600">RM711B, 7/F, Tower A, Hunghom Commercial Centre, Hung Hom, Hong Kong SAR</span>
                        </div>
                    </div>
                    <p className={`${bodyText} mt-3`}>
                        For the purpose of applicable data protection laws, EvairSIM is the data controller of your personal information.
                    </p>

                </div>
            </div>
        </div>
    );
};

const RefundPolicyView = ({ onBack }: { onBack: () => void }) => {
    const { t } = useTranslation();
    const sectionTitle = "text-[15px] font-bold text-slate-900 mb-2 mt-6";
    const bodyText = "text-[15px] text-slate-600 leading-relaxed";
    const listItem = "text-[15px] text-slate-600 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400";
    const numberedItem = "text-[15px] text-slate-600 leading-relaxed pl-5 relative";

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
            <ScreenHeader title={t('profile.refund_policy')} onBack={onBack} />
            <div className="px-5 pt-2 pb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">

                    <h2 className="text-lg font-bold text-slate-900 mb-1">Return & Refund Policy</h2>
                    <p className="text-[13px] text-slate-400 font-medium mb-4">Evair Digital Limited</p>

                    {/* Overview */}
                    <p className={bodyText}>
                        This Return & Refund Policy applies to all purchases of SIM & eSIM data plans from Evair Digital Limited. By purchasing our services, you agree to the terms outlined below, which comply with applicable consumer protection laws, including those in the US & European Union (EU).
                    </p>

                    {/* 30-Day Return Window */}
                    <h3 className={sectionTitle}>30-Day Return Window</h3>
                    <p className={bodyText}>
                        You may request a return within 30 days of receiving your SIM & eSIM "unused" data (30 days from the date you receive your SIM card or activation email is delivered to your provided email address).
                    </p>

                    {/* Eligibility */}
                    <h3 className={sectionTitle}>Eligibility for Returns</h3>
                    <p className={`${bodyText} mb-2`}>To qualify for a return, the following conditions must be met:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}>The SIM card or eSIM must be unused and unactivated. Once activated (via QR code, ICCID, or network registration), the SIM card or eSIM is no longer eligible for a refund, as the data plan is considered consumed.</p>
                        <p className={listItem}>You must provide proof of purchase (e.g., order confirmation email, receipt) with your return request.</p>
                    </div>

                    {/* How to Request */}
                    <h3 className={sectionTitle}>How to Request a Return</h3>
                    <p className={`${bodyText} mb-2`}>To initiate a return:</p>
                    <div className="space-y-1.5">
                        <p className={numberedItem}><span className="absolute left-0 text-slate-400">1.</span>Contact our customer support team at <span className="text-brand-orange font-semibold">service@evairdigital.com</span> with your order number, a description of the reason for return, and a copy of your proof of purchase.</p>
                        <p className={numberedItem}><span className="absolute left-0 text-slate-400">2.</span>Do not "return" physical items, as SIM card or eSIM cannot be reused again—all refund SIM cards are required to be disposed of and eSIM return requests are processed electronically via email.</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-3">
                        <p className="text-[14px] text-amber-700 font-medium">
                            <span className="font-bold">Note:</span> Returns initiated without prior approval (i.e., unsolicited emails without a formal request) will not be processed.
                        </p>
                    </div>

                    {/* Approval */}
                    <h3 className={sectionTitle}>Approval and Processing</h3>
                    <p className={`${bodyText} mb-2`}>If your return is approved:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}>We will send a confirmation email within 3 business days, outlining the next steps for your refund.</p>
                        <p className={listItem}>For invalid or ineligible requests, we will notify you via email with a detailed explanation.</p>
                    </div>

                    {/* Damages */}
                    <h3 className={sectionTitle}>Damages, Defects, or Incorrect Orders</h3>
                    <p className={`${bodyText} mb-2`}>
                        If you encounter issues with your SIM card or eSIM (e.g., invalid ICCID or QR code, expired, non-functional plan, or receipt of an incorrect plan), notify us immediately at <span className="text-brand-orange font-semibold">service@evairdigital.com</span> with:
                    </p>
                    <div className="space-y-1.5">
                        <p className={listItem}>Your order number;</p>
                        <p className={listItem}>A description of the issue (including screenshots, if applicable);</p>
                        <p className={listItem}>Proof of purchase.</p>
                    </div>
                    <p className={`${bodyText} mt-2 mb-2`}>Then, we will investigate the issue within 5 business days and resolve it by:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}>Issuing a replacement SIM card or eSIM;</p>
                        <p className={listItem}>Processing a full refund (if the issue cannot be resolved); or</p>
                        <p className={listItem}>Providing alternative compensation, as appropriate.</p>
                    </div>

                    {/* Non-Returnable */}
                    <h3 className={sectionTitle}>Non-Returnable Items</h3>
                    <p className={`${bodyText} mb-2`}>The following are not eligible for returns or refunds:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}>Activated SIM cards or eSIMs (regardless of usage);</p>
                        <p className={listItem}>Custom or personalized plans (e.g., tailored regional packages, bulk orders);</p>
                        <p className={listItem}>Sale or promotional items (clearly marked as "final sale" at checkout);</p>
                        <p className={listItem}>Gift cards.</p>
                    </div>

                    {/* Exchanges */}
                    <h3 className={sectionTitle}>Exchanges</h3>
                    <p className={`${bodyText} mb-2`}>We offer direct exchanges for SIM & eSIM plans. To receive a different plan:</p>
                    <div className="space-y-1.5">
                        <p className={numberedItem}><span className="absolute left-0 text-slate-400">1.</span>Complete the return process for your original plan (if eligible).</p>
                        <p className={numberedItem}><span className="absolute left-0 text-slate-400">2.</span>Once the refund is approved, place a new order for the desired plan.</p>
                    </div>

                    {/* Refund Processing */}
                    <h3 className={sectionTitle}>Refund Processing</h3>
                    <p className={`${bodyText} mb-2`}>Approved refunds will be processed to your original payment method within 10 business days of approval. Please note:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}>Banks or credit card providers may take additional time (3–5 business days) to reflect the refund in your account.</p>
                        <p className={listItem}>If you do not see the refund within 15 business days of our approval, contact us at <span className="text-brand-orange font-semibold">service@evairdigital.com</span> with your order number and refund confirmation.</p>
                    </div>

                    {/* Contact */}
                    <h3 className={sectionTitle}>Contact Us</h3>
                    <p className={bodyText}>
                        For questions about returns, refunds, or cancellations, email <span className="text-brand-orange font-semibold">service@evairdigital.com</span>—our team will respond within 24 hours.
                    </p>

                </div>
            </div>
        </div>
    );
};

const CookiePolicyView = ({ onBack }: { onBack: () => void }) => {
    const { t } = useTranslation();
    const sectionTitle = "text-[15px] font-bold text-slate-900 mb-2 mt-6";
    const bodyText = "text-[15px] text-slate-600 leading-relaxed";
    const listItem = "text-[15px] text-slate-600 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400";

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
            <ScreenHeader title={t('profile.cookie_policy')} onBack={onBack} />
            <div className="px-5 pt-2 pb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">

                    <h2 className="text-lg font-bold text-slate-900 mb-1">Cookie & Tracking Policy</h2>
                    <p className="text-[13px] text-slate-400 font-medium mb-4">Last updated: February 6, 2026</p>

                    <p className={bodyText}>
                        This policy explains how EvairSIM uses cookies, mobile identifiers, and similar tracking technologies when you use our app and visit our website. It also describes your choices regarding these technologies.
                    </p>

                    <h3 className={sectionTitle}>What Are Cookies and Tracking Technologies?</h3>
                    <p className={bodyText}>
                        Cookies are small text files stored on your device when you visit a website. In a mobile app context, similar technologies include mobile advertising identifiers, SDKs (software development kits), pixels, and local storage. These technologies help us understand how you use our Services, remember your preferences, and improve your experience.
                    </p>

                    <h3 className={sectionTitle}>Technologies We Use</h3>
                    <div className="space-y-2.5">
                        <div>
                            <p className="text-[15px] font-bold text-slate-800 mb-1">Essential Cookies & Storage</p>
                            <p className={bodyText}>Required for the app and website to function properly. These handle authentication, session management, security, and remembering your language and currency preferences. They cannot be disabled.</p>
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-slate-800 mb-1">Analytics & Performance</p>
                            <p className={bodyText}>Help us understand how users interact with our app — which screens are visited most, where users drop off, and how features perform. This data is aggregated and anonymized wherever possible.</p>
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-slate-800 mb-1">Marketing & Advertising</p>
                            <p className={bodyText}>Used to deliver relevant advertisements and measure the effectiveness of our marketing campaigns. These may involve third-party partners who use cookies or mobile identifiers to track activity across apps and websites.</p>
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-slate-800 mb-1">Functional</p>
                            <p className={bodyText}>Enable enhanced features and personalization, such as remembering your recently viewed plans, preferred destinations, and display settings.</p>
                        </div>
                    </div>

                    <h3 className={sectionTitle}>Third-Party Services</h3>
                    <p className={`${bodyText} mb-2`}>We may use the following types of third-party services that employ their own tracking technologies:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}>Payment processors (e.g., Stripe) for secure transaction handling.</p>
                        <p className={listItem}>Analytics providers to measure app usage and performance.</p>
                        <p className={listItem}>Advertising networks to serve and measure relevant ads.</p>
                        <p className={listItem}>Customer support tools to improve response quality.</p>
                    </div>
                    <p className={`${bodyText} mt-2`}>Each third-party service operates under its own privacy and cookie policies.</p>

                    <h3 className={sectionTitle}>Your Choices</h3>
                    <p className={`${bodyText} mb-2`}>You have control over how tracking technologies are used:</p>
                    <div className="space-y-1.5">
                        <p className={listItem}><strong className="text-slate-800">Mobile device settings:</strong> You can limit ad tracking through your device's privacy settings (e.g., "Limit Ad Tracking" on iOS or "Opt out of Ads Personalization" on Android).</p>
                        <p className={listItem}><strong className="text-slate-800">Browser settings:</strong> If you access our website, you can manage cookies through your browser's settings. Note that disabling certain cookies may affect website functionality.</p>
                        <p className={listItem}><strong className="text-slate-800">Push notifications:</strong> You can manage push notification preferences through your device's notification settings at any time.</p>
                        <p className={listItem}><strong className="text-slate-800">Global Privacy Control:</strong> We recognize the Global Privacy Control (GPC) signal. If your browser or device sends a GPC signal, we will treat it as a request to opt out of data sharing for targeted advertising.</p>
                    </div>

                    <h3 className={sectionTitle}>Data Retention</h3>
                    <p className={bodyText}>
                        Cookie and tracking data is retained only for as long as necessary to fulfill the purposes described above. Session cookies expire when you close the app or browser. Persistent cookies and analytics data are retained in accordance with our Privacy Policy and applicable law.
                    </p>

                    <h3 className={sectionTitle}>Updates to This Policy</h3>
                    <p className={bodyText}>
                        We may update this Cookie & Tracking Policy from time to time. Changes will be reflected by the "Last updated" date above. We encourage you to review this policy periodically.
                    </p>

                    <h3 className={sectionTitle}>Contact Us</h3>
                    <p className={`${bodyText} mb-3`}>
                        If you have questions about our use of cookies and tracking technologies, please contact us:
                    </p>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                        <div className="flex items-start gap-2">
                            <span className="text-[14px] font-bold text-slate-500 shrink-0">Email:</span>
                            <span className="text-[14px] text-brand-orange font-semibold">service@evairdigital.com</span>
                        </div>
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                            <span className="text-[14px] font-bold text-slate-500 shrink-0">Address:</span>
                            <span className="text-[14px] text-slate-600">RM711B, 7/F, Tower A, Hunghom Commercial Centre, Hung Hom, Hong Kong SAR</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const MoreInfoView = ({ onBack, onNavigate }: { onBack: () => void, onNavigate: (screen: ProfileScreen) => void }) => {
    const { t } = useTranslation();
    return (
    <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
        <ScreenHeader title={t('profile.more_info')} onBack={onBack} />
        <div className="px-5 pt-2">
            <MenuGroup>
                <MenuItem label={t('profile.about_evair')} onClick={() => onNavigate('ABOUT')} />
                <MenuItem label={t('profile.terms_of_use')} onClick={() => onNavigate('TERMS')} />
                <MenuItem label={t('profile.acceptable_use')} onClick={() => onNavigate('ACCEPTABLE')} />
                <MenuItem label={t('profile.privacy_policy')} onClick={() => onNavigate('PRIVACY')} />
                <MenuItem label={t('profile.refund_policy')} onClick={() => onNavigate('REFUND')} />
                <MenuItem label={t('profile.cookie_policy')} isLast onClick={() => onNavigate('COOKIE')} />
            </MenuGroup>
        </div>
    </div>
    );
};

const HelpCenterView = ({ onBack }: { onBack: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] relative">
            
            <div className="bg-white/90 backdrop-blur-xl px-4 pt-safe pb-3 flex justify-between items-center shrink-0 sticky top-0 z-20 border-b border-slate-100">
                 <button onClick={onBack} className="p-2 -ml-1 rounded-full hover:bg-black/5"><Settings size={0} className="hidden" /><ChevronLeft size={22} className="text-slate-900" /></button>
                 <span className="font-bold text-lg">{t('profile.help_center')}</span>
                 <div className="w-8"></div>
            </div>

            <div className="lg:flex-1 lg:overflow-y-auto no-scrollbar px-4 pt-6 pb-6">
                 <h1 className="text-2xl font-bold text-slate-900 mb-5 text-center">{t('profile.how_can_help')}</h1>
                 
                 <div className="relative mb-6">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder={t('profile.search_issue')} 
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange/30 focus:border-brand-orange"
                    />
                 </div>

                 <div className="space-y-4 mb-10">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {[
                             { icon: Info, label: t('profile.about_evair'), color: 'bg-blue-100 text-blue-600' },
                             { icon: Play, label: t('profile.getting_started'), color: 'bg-teal-100 text-teal-600' },
                             { icon: Settings, label: t('profile.my_account'), color: 'bg-indigo-100 text-indigo-600' },
                             { icon: Settings, label: t('profile.troubleshooting'), color: 'bg-slate-100 text-gray-600' },
                             { icon: Smartphone, label: t('profile.manage_esim'), color: 'bg-pink-100 text-pink-600' },
                         ].map((item, i) => (
                             <button key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform h-32">
                                 <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center`}>
                                     <item.icon size={20} />
                                 </div>
                                 <span className="font-bold text-slate-900 text-sm">{item.label}</span>
                             </button>
                         ))}
                     </div>
                 </div>

                 <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('profile.popular_questions')}</h2>
                 <div className="space-y-3">
                     {[
                         t('profile.faq_1'),
                         t('profile.faq_2'),
                         t('profile.faq_3'),
                         t('profile.faq_4'),
                         t('profile.faq_5'),
                         t('profile.faq_6'),
                     ].map((q, i) => (
                         <button key={i} className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between text-left active:bg-gray-50">
                             <span className="font-bold text-slate-900 text-sm pr-4">{q}</span>
                             <ChevronRight size={20} className="text-slate-400 shrink-0" />
                         </button>
                     ))}
                 </div>

                 {/* Footer Mimic */}
                 <div className="mt-12 pt-12 border-t border-gray-200 flex flex-col items-center gap-6 opacity-60 pb-10">
                      <div className="flex gap-4">
                          <img src="/logo.png" alt="EvairSIM logo" loading="lazy" width={100} height={40} style={{ height: 40, objectFit: 'contain' }} />
                      </div>
                      <p className="text-sm font-medium">©2026 EVAIR SIM</p>
                      <div className="flex flex-wrap justify-center gap-4 text-[12px] text-slate-500 font-bold uppercase tracking-wider">
                          <span>Trust center</span>
                          <span>Privacy policy</span>
                          <span>Legal center</span>
                          <span>Partner with us</span>
                          <span>Manage cookies</span>
                      </div>
                 </div>
            </div>
        </div>
    );
};


const ProfileView: React.FC<ProfileViewProps> = ({ isLoggedIn, user, onLogin, onSignup, onLogout, onOpenDialer, onOpenInbox, notifications = [], onBack, onUserUpdate }) => {
  const [currentView, setCurrentView] = useState<ProfileScreen>('MAIN');
  const { t } = useTranslation();

  const infoScreens = ['ABOUT', 'TERMS', 'REFUND', 'PRIVACY', 'ACCEPTABLE', 'COOKIE'];
  const navDepth = currentView === 'MAIN' ? (onBack ? 1 : 0) : infoScreens.includes(currentView) ? (onBack ? 3 : 2) : (onBack ? 2 : 1);

  const handleSwipeBack = useCallback(() => {
    if (infoScreens.includes(currentView)) setCurrentView('INFO');
    else if (currentView !== 'MAIN') setCurrentView('MAIN');
    else onBack?.();
  }, [currentView, onBack]);

  useSwipeBack(navDepth, handleSwipeBack);
  useEdgeSwipeBack(handleSwipeBack);

  // If we are in a sub-view, render it
  if (currentView === 'ACCOUNT') return <AccountInfoView onBack={() => setCurrentView('MAIN')} user={user} onUserUpdate={onUserUpdate} />;
  if (currentView === 'INBOX') { onOpenInbox(); return null; }
  if (currentView === 'ORDERS') return <OrdersView onBack={() => setCurrentView('MAIN')} />;
  if (currentView === 'CURRENCY') return <CurrencyView onBack={() => setCurrentView('MAIN')} />;
  if (currentView === 'LANGUAGES') return <LanguagesView onBack={() => setCurrentView('MAIN')} />;
  if (currentView === 'INFO') return <MoreInfoView onBack={() => setCurrentView('MAIN')} onNavigate={setCurrentView} />;
  if (currentView === 'ABOUT') return <AboutEvairView onBack={() => setCurrentView('INFO')} />;
  if (currentView === 'TERMS') return <TermsOfUseView onBack={() => setCurrentView('INFO')} />;
  if (currentView === 'REFUND') return <RefundPolicyView onBack={() => setCurrentView('INFO')} />;
  if (currentView === 'PRIVACY') return <PrivacyPolicyView onBack={() => setCurrentView('INFO')} />;
  if (currentView === 'ACCEPTABLE') return <AcceptableUsePolicyView onBack={() => setCurrentView('INFO')} />;
  if (currentView === 'COOKIE') return <CookiePolicyView onBack={() => setCurrentView('INFO')} />;
  if (currentView === 'HELP') return <HelpCenterView onBack={() => setCurrentView('MAIN')} />;

  // Main Profile Menu
  return (
    <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar relative">
        
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-xl pt-safe px-4 pb-3 flex items-center gap-2 shrink-0 sticky top-0 z-10 border-b border-slate-100">
            {onBack && (
              <button onClick={onBack} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors">
                <ChevronLeft size={22} className="text-slate-900" />
              </button>
            )}
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{t('profile.title')}</h1>
        </div>

        <div className="flex-1 px-4 pb-6 pt-4">
            
            {/* GUEST VIEW */}
            {!isLoggedIn && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-3 mb-6">
                        <button 
                            onClick={onLogin}
                            className="w-full bg-white border border-slate-200 text-slate-900 py-3 rounded-xl font-bold text-base shadow-sm active:scale-[0.98] transition-transform"
                        >
                            {t('profile.log_in')}
                        </button>
                        <button 
                            onClick={onSignup}
                            className="w-full bg-brand-orange text-white py-3 rounded-xl font-bold text-base shadow-lg shadow-orange-500/15 active:scale-[0.98] transition-transform"
                        >
                            {t('profile.sign_up')}
                        </button>
                    </div>

                    <MenuGroup>
                        <MenuItem label={t('profile.languages')} onClick={() => setCurrentView('LANGUAGES')} />
                        <MenuItem label={`${t('profile.currency')}: ${t('profile.usd_name')} (USD) $`} onClick={() => setCurrentView('CURRENCY')} />
                        <MenuItem label={t('my_sims.contact_us')} onClick={onOpenDialer} />
                        <MenuItem label={t('profile.more_info')} isLast onClick={() => setCurrentView('INFO')} />
                    </MenuGroup>

                    <MenuGroup>
                        <MenuItem label={t('profile.share_friends')} rightElement={<Share size={16} className="text-slate-900" />} />
                        <MenuItem label={t('profile.rate_app')} isLast />
                    </MenuGroup>
                </div>
            )}

            {/* LOGGED IN VIEW */}
            {isLoggedIn && user && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* User Profile */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-5 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-inner"></div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">{user.name}</h2>
                            <p className="text-slate-500 text-sm font-medium">{user.role}</p>
                        </div>
                    </div>

                    <MenuGroup>
                        <MenuItem label={t('profile.account_info')} onClick={() => setCurrentView('ACCOUNT')} />
                        <MenuItem
                          label={t('profile.inbox')}
                          onClick={onOpenInbox}
                          rightElement={(() => {
                            const unread = notifications.filter(n => !n.read).length;
                            return (
                              <span className="flex items-center gap-2">
                                {unread > 0 && (
                                  <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
                                    {unread > 9 ? '9+' : unread}
                                  </span>
                                )}
                                <ChevronRight size={18} className="text-gray-300" />
                              </span>
                            );
                          })()}
                        />
                        <MenuItem label={t('profile.orders')} isLast onClick={() => setCurrentView('ORDERS')} />
                    </MenuGroup>

                    <MenuGroup>
                        <MenuItem label={t('profile.languages')} onClick={() => setCurrentView('LANGUAGES')} />
                        <MenuItem label={`${t('profile.currency')}: ${t('profile.usd_name')} (USD) $`} onClick={() => setCurrentView('CURRENCY')} />
                        <MenuItem label={t('my_sims.contact_us')} onClick={onOpenDialer} />
                        <MenuItem label={t('profile.more_info')} onClick={() => setCurrentView('INFO')} />
                        <MenuItem label={t('profile.rate_app')} isLast />
                    </MenuGroup>

                    <button 
                        onClick={onLogout}
                        className="w-full bg-white border border-slate-200 text-slate-900 py-3 rounded-xl font-bold text-base shadow-sm active:scale-[0.98] transition-transform mb-5"
                    >
                        {t('profile.log_out')}
                    </button>

                </div>
            )}
            
            <div className="text-center pb-8">
                <p className="text-slate-400 text-sm font-medium">v2.9.0</p>
            </div>

        </div>

    </div>
  );
};

export default ProfileView;
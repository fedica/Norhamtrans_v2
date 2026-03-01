
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { User, Phone, Mail, Save, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation, useAuth } from '../App';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading, error, updateProfile } = useProfile();
  const { t, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    const getEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || '');
    };
    getEmail();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    try {
      await updateProfile(firstName, lastName, phone);
      await refreshUser();
      setSuccessMessage('Profil erfolgreich aktualisiert!');
      setTimeout(() => {
        setSuccessMessage('');
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      // Error is handled by useProfile
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Profil Einstellungen</h1>
      </div>

      <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-xs font-black text-red-600 leading-tight uppercase tracking-tight">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center space-x-3">
              <Save className="text-green-500 shrink-0" size={20} />
              <p className="text-xs font-black text-green-600 leading-tight uppercase tracking-tight">{successMessage}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">E-Mail Adresse</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  disabled
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-400 cursor-not-allowed"
                  value={email}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-bold ml-1 uppercase tracking-tight">Die E-Mail Adresse kann nicht geändert werden.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Vorname</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm"
                      placeholder="Vorname"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nachname</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm"
                      placeholder="Nachname"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Telefonnummer</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="tel" 
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm"
                    placeholder="+49 123 4567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-[#007AFF] hover:bg-blue-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-blue-600/30 transition-all transform active:scale-95 flex items-center justify-center space-x-2 text-base"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save size={20} strokeWidth={3} />
                    <span>Profil speichern</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;


import React, { useState, createContext, useContext, useEffect, PropsWithChildren, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Calendar, 
  AlertCircle, 
  ShieldCheck, 
  Map as MapIcon,
  ChevronRight,
  Truck,
  LogOut,
  User as UserIcon,
  Settings,
  Mail,
  Shield,
  ClipboardCheck
} from 'lucide-react';

import { translations } from './translations';
import { Driver, InventoryItem, StopPlan, Complaint, ControlChecklist, Tour, FuelCardRequest } from './types';
import { supabaseService } from './services/supabaseService';
import { supabase } from './lib/supabase';
import Dashboard from './views/Dashboard';
import DriverManager from './views/DriverManager';
import StopPlanView from './views/StopPlan';
import TourManager from './views/TourManager';
import InventoryView from './views/Inventory';
import VehiclesView from './views/VehiclesView';
import ComplaintsView from './views/Complaints';
import ControlView from './views/Control';
import Login from './views/Login';
import ProfilePage from './views/ProfilePage';
import DriverDashboard from './views/DriverDashboard';

// Language Context
interface LanguageContextType {
  lang: 'de' | 'ro';
  t: typeof translations.de;
}
const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useTranslation must be used within LanguageProvider");
  return context;
};

// Auth Context
interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  phone?: string;
  driverId?: string;
}

export type ViewMode = 'admin' | 'driver';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  viewMode: ViewMode;
  selectedDriverId: string | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  toggleViewMode: () => void;
  setSelectedDriverId: (id: string | null) => void;
}
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// Data Context
interface DataContextType {
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  stops: StopPlan[];
  setStops: React.Dispatch<React.SetStateAction<StopPlan[]>>;
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  controls: ControlChecklist[];
  setControls: React.Dispatch<React.SetStateAction<ControlChecklist[]>>;
  tours: Tour[];
  setTours: React.Dispatch<React.SetStateAction<Tour[]>>;
  fuelCards: FuelCardRequest[];
  setFuelCards: React.Dispatch<React.SetStateAction<FuelCardRequest[]>>;
  refreshData: () => Promise<void>;
  saveData: (type: 'drivers' | 'inventory' | 'stops' | 'complaints' | 'controls' | 'tours' | 'fuel_cards', data: any) => Promise<any>;
  deleteData: (type: 'drivers' | 'inventory' | 'stops' | 'complaints' | 'controls' | 'tours' | 'fuel_cards', id: string) => Promise<void>;
}
const DataContext = React.createContext<DataContextType | undefined>(undefined);
export const useAppData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useAppData must be used within DataProvider");
  return context;
};

const TabBar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { viewMode } = useAuth();
  
  const adminTabs = [
    { name: t.tourManager, path: '/tours', icon: MapIcon },
    { name: t.stopPlan, path: '/stops', icon: Calendar },
    { name: t.dashboard, path: '/dashboard', icon: LayoutDashboard, isMain: true },
    { name: t.driverManager, path: '/drivers', icon: Users },
    { name: t.vehicles, path: '/vehicles', icon: Truck },
  ];

  const driverTabs = [
    { name: 'Touren', path: '/driver/tours', icon: MapIcon },
    { name: 'Check', path: '/driver/control', icon: ClipboardCheck },
    { name: 'Home', path: '/driver/dashboard', icon: LayoutDashboard, isMain: true },
    { name: 'Reklamationen', path: '/driver/complaints', icon: AlertCircle },
    { name: 'Profil', path: '/profile', icon: UserIcon },
  ];

  const tabs = viewMode === 'admin' ? adminTabs : driverTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[84px] bg-white/80 ios-blur border-t border-slate-200 z-50 flex justify-around items-start px-2 pt-2 pb-[safe-area-inset-bottom]">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        if (tab.isMain) {
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center justify-center w-full -mt-4 relative transition-all active:scale-95"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isActive ? 'bg-[#007AFF] text-white' : 'bg-slate-900 text-slate-300'}`}>
                <tab.icon size={28} strokeWidth={2.5} />
              </div>
              <span className={`text-[10px] font-black mt-1.5 uppercase tracking-tighter ${isActive ? 'text-[#007AFF]' : 'text-slate-400'}`}>
                {tab.name}
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex flex-col items-center justify-center w-full transition-colors ${isActive ? 'text-[#007AFF]' : 'text-slate-400'}`}
          >
            <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-semibold mt-1">{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

const Layout: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const { logout, user, viewMode, toggleViewMode, selectedDriverId, setSelectedDriverId } = useAuth();
  const { drivers } = useAppData();
  const { t } = useTranslation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleView = () => {
    toggleViewMode();
    setIsProfileMenuOpen(false);
    if (viewMode === 'admin') {
      navigate('/driver/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const isAdmin = user?.role.toLowerCase() === 'administrator' || user?.role.toLowerCase() === 'admin';

  return (
    <div className="min-h-screen flex flex-col pb-[100px]">
      <header className="sticky top-0 z-[60] bg-white/90 ios-blur px-6 pt-safe flex items-center justify-between border-b border-slate-100 h-[calc(var(--sat)+56px)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
            <img 
              src="/logo.png" 
              alt="logo" 
              className="w-full h-full object-contain"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-lg font-bold text-slate-900 leading-tight tracking-tight lowercase">
              norhamtrans <span className="text-[#007AFF] uppercase font-black text-xs">{viewMode === 'admin' ? t.cockpit : 'Driver'}</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {viewMode === 'driver' && isAdmin && (
            <select 
              className="text-[10px] font-black uppercase bg-slate-100 border-none rounded-full px-3 py-1.5 focus:ring-0"
              value={selectedDriverId || ''}
              onChange={(e) => setSelectedDriverId(e.target.value || null)}
            >
              <option value="">Self ({user?.firstName})</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
              ))}
            </select>
          )}
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
            >
              {user ? (
                <span className="text-xs font-black text-[#007AFF]">{user.fullName[0]}</span>
              ) : (
                <UserIcon size={18} className="text-slate-400" />
              )}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="p-5 bg-slate-50/50 border-b border-slate-100">
                  <p className="text-sm font-black text-slate-900 leading-none">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center"><Mail size={10} className="mr-1" /> {user?.email}</p>
                  <p className="text-[9px] font-black text-[#007AFF] uppercase tracking-widest mt-2 bg-blue-50 px-2 py-0.5 rounded-full inline-block border border-blue-100">
                    <Shield size={8} className="inline mr-1 -mt-0.5" /> {user?.role}
                  </p>
                </div>
                <div className="p-2">
                  {isAdmin && (
                    <button 
                      onClick={handleToggleView}
                      className="w-full flex items-center space-x-3 px-3 py-3 hover:bg-blue-50 rounded-2xl transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#007AFF] group-hover:scale-110 transition-transform">
                        {viewMode === 'admin' ? <Truck size={16} /> : <ShieldCheck size={16} />}
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {viewMode === 'admin' ? 'Switch to Driver Mode' : 'Back to Admin Mode'}
                      </span>
                    </button>
                  )}
                  <Link 
                    to="/profile" 
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full flex items-center space-x-3 px-3 py-3 hover:bg-slate-50 rounded-2xl transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#007AFF] group-hover:scale-110 transition-transform">
                      <UserIcon size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{t.editProfile}</span>
                  </Link>
                  <button className="w-full flex items-center space-x-3 px-3 py-3 hover:bg-slate-50 rounded-2xl transition-colors text-left group">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                      <Settings size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{t.settings}</span>
                  </button>
                </div>
                <div className="p-2 border-t border-slate-100">
                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); logout(); }}
                    className="w-full flex items-center space-x-3 px-3 py-3 hover:bg-red-50 rounded-2xl transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                      <LogOut size={16} />
                    </div>
                    <span className="text-xs font-black text-red-500 uppercase tracking-widest">{t.logout}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-4 overflow-x-hidden">
        {children}
      </main>

      <TabBar />
    </div>
  );
};

const LanguageProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <LanguageContext.Provider value={{ lang: 'de', t: translations.de }}>
      {children}
    </LanguageContext.Provider>
  );
};

const AuthProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone, role, driver_id")
      .eq("id", session.user.id)
      .single();

    const firstName = profile?.first_name ?? (session.user.user_metadata?.first_name as string) ?? "User";
    const lastName = profile?.last_name ?? (session.user.user_metadata?.last_name as string) ?? "";
    const fullName = `${firstName} ${lastName}`.trim();

    const role = profile?.role ?? "Administrator";
    setUser({
      id: session.user.id,
      email: session.user.email ?? "",
      role: role,
      firstName,
      lastName,
      fullName,
      phone: profile?.phone ?? undefined,
      driverId: profile?.driver_id ?? undefined,
    });

    if (role.toLowerCase() === 'driver') {
      setViewMode('driver');
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    refreshUser().finally(() => setLoading(false));

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        refreshUser();
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setViewMode('admin');
        setSelectedDriverId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleViewMode = () => {
    if (user?.role.toLowerCase() !== 'administrator' && user?.role.toLowerCase() !== 'admin') return;
    setViewMode(prev => (prev === 'admin' ? 'driver' : 'admin'));
  };

  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      viewMode, 
      selectedDriverId, 
      login, 
      logout, 
      resetPassword, 
      refreshUser, 
      toggleViewMode, 
      setSelectedDriverId 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const DataProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stops, setStops] = useState<StopPlan[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [controls, setControls] = useState<ControlChecklist[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [fuelCards, setFuelCards] = useState<FuelCardRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [d, i, s, c, ctrl, t, fc] = await Promise.all([
        supabaseService.getDrivers(),
        supabaseService.getInventory(),
        supabaseService.getStops(),
        supabaseService.getComplaints(),
        supabaseService.getControls(),
        supabaseService.getTours(),
        supabaseService.getFuelCards()
      ]);
      
      setDrivers(d);
      setInventory(i);
      setStops(s);
      setComplaints(c);
      setControls(ctrl);
      setTours(t);
      setFuelCards(fc);
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (type: 'drivers' | 'inventory' | 'stops' | 'complaints' | 'controls' | 'tours' | 'fuel_cards', data: any) => {
    if (!user) return;
    
    const payload = { ...data };
    const tablesWithUserId = new Set(['complaints', 'stops', 'fuel_cards']);
    
    if (user && tablesWithUserId.has(type) && payload.user_id == null) {
      payload.user_id = user.id;
    }

    try {
      switch (type) {
        case 'drivers': return await supabaseService.saveDriver(payload);
        case 'inventory': return await supabaseService.saveInventoryItem(payload);
        case 'stops': return await supabaseService.saveStop(payload);
        case 'complaints': return await supabaseService.saveComplaint(payload);
        case 'controls': return await supabaseService.saveControl(payload);
        case 'tours': return await supabaseService.saveTour(payload);
        case 'fuel_cards': return await supabaseService.saveFuelCard(payload);
      }
    } catch (error) {
      console.error(`Error saving ${type} to Supabase:`, error);
    }
  };

  const deleteData = async (type: 'drivers' | 'inventory' | 'stops' | 'complaints' | 'controls' | 'tours' | 'fuel_cards', id: string) => {
    try {
      switch (type) {
        case 'drivers': await supabaseService.deleteDriver(id); break;
      }
    } catch (error) {
      console.error(`Error deleting ${type} from Supabase:`, error);
    }
  };

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  return (
    <DataContext.Provider value={{ 
      drivers, setDrivers, 
      inventory, setInventory, 
      stops, setStops, 
      complaints, setComplaints, 
      controls, setControls,
      tours, setTours,
      fuelCards, setFuelCards,
      refreshData,
      saveData,
      deleteData
    }}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold animate-pulse lowercase">norhamtrans loading...</p>
          </div>
        </div>
      ) : children}
    </DataContext.Provider>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, viewMode } = useAuth();

  if (!isAuthenticated) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  if (viewMode === 'driver') {
    return (
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/driver/tours" element={<TourManager />} />
            <Route path="/driver/control" element={<ControlView />} />
            <Route path="/driver/complaints" element={<ComplaintsView />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/driver/dashboard" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/drivers" element={<DriverManager />} />
          <Route path="/tours" element={<TourManager />} />
          <Route path="/stops" element={<StopPlanView />} />
          <Route path="/inventory" element={<InventoryView />} />
          <Route path="/vehicles" element={<VehiclesView />} />
          <Route path="/complaints" element={<ComplaintsView />} />
          <Route path="/control" element={<ControlView />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;

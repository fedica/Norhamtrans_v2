
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Package, 
  AlertCircle, 
  ShieldCheck, 
  TrendingUp, 
  Map as MapIcon,
  ChevronRight,
  ClipboardCheck,
  Wrench,
  Clock,
  LayoutGrid,
  AlertTriangle,
  Bell,
  Truck,
  Fuel,
  CheckCircle,
  X,
  History,
  Search,
  User as UserIcon
} from 'lucide-react';
import { useTranslation, useAppData, useAuth } from '../App';
import { VehicleStatus, InventoryType, FuelCardRequest } from '../types';
import { differenceInDays, isPast, parseISO, format } from 'date-fns';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { drivers, complaints, tours, inventory, fuelCards, saveData, setFuelCards } = useAppData();
  const { user } = useAuth();

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FuelCardRequest | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Practical metrics calculations
  const pendingComplaints = complaints.filter(c => !c.resolved).length;
  const vehiclesInService = inventory.filter(i => i.vehicleStatus === VehicleStatus.SERVICE).length;
  const inventoryItemsCount = inventory.filter(i => i.type !== InventoryType.VEHICLE).length;

  // Fuel Card Requests
  const pendingFuelRequests = fuelCards.filter(fc => fc.status === 'PENDING');

  // Maintenance Notification Logic
  const maintenanceAlerts = useMemo(() => {
    return inventory
      .filter(item => item.type === InventoryType.VEHICLE && item.huExpiration)
      .map(v => {
        const expiryDate = parseISO(v.huExpiration!);
        const daysLeft = differenceInDays(expiryDate, new Date());
        const expired = isPast(expiryDate);
        return { ...v, daysLeft, expired };
      })
      .filter(v => v.expired || v.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [inventory]);

  const serviceAlerts = useMemo(() => {
    return inventory
      .filter(item => item.type === InventoryType.VEHICLE && (item.vehicleStatus === VehicleStatus.SERVICE || item.serviceEndDate))
      .map(v => {
        let isUrgent = false;
        if (v.serviceEndDate) {
          const endDate = parseISO(v.serviceEndDate);
          const daysLeft = differenceInDays(endDate, new Date());
          if (daysLeft <= 3) isUrgent = true;
        }
        return { ...v, isUrgent };
      })
      .sort((a, b) => {
        if (!a.serviceEndDate) return 1;
        if (!b.serviceEndDate) return -1;
        return new Date(a.serviceEndDate).getTime() - new Date(b.serviceEndDate).getTime();
      });
  }, [inventory]);

  const handleAcceptFuelRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !cardNumber) return;

    setIsSubmitting(true);
    const updatedRequest = {
      ...selectedRequest,
      user_id: user?.id,
      cardNumber,
      acceptedDate: new Date().toISOString(),
      status: 'ACCEPTED' as const
    };

    const saved = await saveData('fuel_cards', updatedRequest);
    if (saved) {
      setFuelCards(fuelCards.map(fc => fc.id === selectedRequest.id ? saved : fc));
      setIsAcceptModalOpen(false);
      setSelectedRequest(null);
      setCardNumber('');
    }
    setIsSubmitting(false);
  };

  const filteredHistory = fuelCards
    .filter(fc => 
      fc.driverName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      fc.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fc.cardNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  // Reordered Quick Stats per request: Lager, Tankkarten, Rekla, Service
  const quickStats = [
    { label: t.other, value: inventoryItemsCount, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/inventory' },
    { label: 'Tankkarten', value: fuelCards.length, icon: Fuel, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => setIsHistoryModalOpen(true) },
    { label: 'Rekla', value: pendingComplaints, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', path: '/complaints' },
    { label: 'Service', value: vehiclesInService, icon: Wrench, color: 'text-red-600', bg: 'bg-red-50', path: '/vehicles' },
  ];

  const primaryActions = [
    { 
      id: 'tours', 
      name: t.tourManager, 
      desc: 'Disposition', 
      icon: MapIcon, 
      path: '/tours', 
      color: 'bg-blue-600' 
    },
    { 
      id: 'control', 
      name: t.control, 
      desc: 'Sicherheitscheck', 
      icon: ClipboardCheck, 
      path: '/control', 
      color: 'bg-slate-900' 
    },
    { 
      id: 'drivers', 
      name: t.driverManager, 
      desc: 'Personal', 
      icon: Users, 
      path: '/drivers', 
      color: 'bg-indigo-500' 
    },
    { 
      id: 'inventory', 
      name: t.inventory, 
      desc: 'Bestand', 
      icon: Package, 
      path: '/inventory', 
      color: 'bg-emerald-500' 
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Welcome Header - Personalized and Lowercase welcome */}
      <div className="flex items-center justify-between px-1 pt-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
            <span className="lowercase">{t.welcome}</span> <span className="text-blue-600">{user?.fullName || 'Admin'}</span>
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-2">
            <Clock size={14} className="text-blue-600" />
            <span className="text-xs font-black text-slate-900">
              {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Metrics (Lager, Tankkarten, Rekla, Service) - Prim Plan */}
      <div className="grid grid-cols-4 gap-2 px-1">
        {quickStats.map((stat, i) => (
          <button 
            key={i} 
            onClick={() => stat.onClick ? stat.onClick() : navigate(stat.path!)}
            className="bg-white p-3 py-4 rounded-[24px] shadow-sm border border-slate-100 flex flex-col items-center text-center active:scale-95 transition-all hover:shadow-md"
          >
            <div className={`p-2.5 ${stat.bg} ${stat.color} rounded-xl mb-2`}>
              <stat.icon size={20} strokeWidth={3} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate w-full">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Fuel Card Requests Section */}
      {pendingFuelRequests.length > 0 && (
        <div className="px-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center">
              <Fuel size={12} className="mr-1.5" /> Tankkarten Anfragen
            </h2>
            <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {pendingFuelRequests.length}
            </span>
          </div>
          <div className="space-y-2">
            {pendingFuelRequests.map((request) => (
              <div 
                key={request.id} 
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">{request.driverName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      {request.vehiclePlate} • {request.mileage} km
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedRequest(request);
                    setIsAcceptModalOpen(true);
                  }}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                >
                  Akzeptieren
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Notification Area - Now below the four options */}
      {(maintenanceAlerts.length > 0 || serviceAlerts.length > 0) && (
        <div className="px-1 space-y-3">
          {serviceAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center">
                  <Wrench size={12} className="mr-1.5" /> {t.serviceMessage}
                </h2>
                <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {serviceAlerts.length}
                </span>
              </div>
              {serviceAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  onClick={() => navigate('/vehicles')}
                  className={`p-4 rounded-2xl border flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm ${alert.isUrgent ? 'bg-red-50 border-red-200' : 'bg-blue-50/30 border-blue-100'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${alert.isUrgent ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                      <Truck size={18} />
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-tight ${alert.isUrgent ? 'text-red-700' : 'text-blue-700'}`}>
                        {alert.serviceLocation}
                      </p>
                      <p className="text-sm font-bold text-slate-900">{alert.plate}</p>
                      {alert.serviceProblem && (
                        <p className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{alert.serviceProblem}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {alert.serviceEndDate && (
                      <p className={`text-[10px] font-black uppercase tracking-tighter ${alert.isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
                        {format(parseISO(alert.serviceEndDate), 'dd.MM.yyyy')}
                      </p>
                    )}
                    <ChevronRight size={14} className="text-slate-300 ml-auto mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {maintenanceAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center">
                  <Bell size={12} className="mr-1.5 animate-bounce" /> {t.maintenanceAlerts}
                </h2>
                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {maintenanceAlerts.length}
                </span>
              </div>
              <div className="space-y-2">
                {maintenanceAlerts.slice(0, 2).map((alert) => (
              <div 
                key={alert.id} 
                onClick={() => navigate('/vehicles')}
                className={`p-4 rounded-2xl border flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm ${alert.expired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${alert.expired ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-tight ${alert.expired ? 'text-red-700' : 'text-amber-700'}`}>
                      {alert.expired ? t.huExpired : t.huSoon}
                    </p>
                    <p className="text-sm font-bold text-slate-900">Kennzeichen: {alert.plate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase tracking-tighter ${alert.expired ? 'text-red-600' : 'text-amber-600'}`}>
                    {alert.expired ? t.expiredLabel : `${t.dueIn} ${alert.daysLeft} ${t.days}`}
                  </p>
                  <ChevronRight size={14} className="text-slate-300 ml-auto mt-1" />
                </div>
              </div>
            ))}
            {maintenanceAlerts.length > 2 && (
              <button onClick={() => navigate('/vehicles')} className="w-full text-center py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500">
                + {maintenanceAlerts.length - 2} weitere Warnungen anzeigen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )}

      {/* Main Focus / Quick Actions */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
            <LayoutGrid size={12} className="mr-1.5" /> Fokus Heute
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {primaryActions.map((action) => (
            <button
              key={action.id}
              onClick={() => navigate(action.path)}
              className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col items-start active:scale-[0.97] transition-all shadow-sm group"
            >
              <div className={`${action.color} text-white p-2.5 rounded-xl shadow-lg mb-3 group-active:scale-90 transition-transform`}>
                <action.icon size={20} />
              </div>
              <h3 className="font-black text-slate-900 text-sm leading-tight">{action.name}</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed / System Health */}
      <div className="px-1">
        <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse"></div>
          
          <div className="relative z-10 flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="text-blue-400" size={20} />
              <h3 className="text-white font-black text-base">Flotten-Bereitschaft</h3>
            </div>
            <span className="flex items-center bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest border border-emerald-500/30">
              Optimal
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 relative z-10">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-white/40 text-[8px] font-black uppercase mb-1">Auslastung</p>
              <div className="flex items-baseline space-x-1">
                <span className="text-lg font-black text-white">92</span>
                <span className="text-[10px] text-white/60 font-bold">%</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-400 h-full w-[92%] rounded-full"></div>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-white/40 text-[8px] font-black uppercase mb-1">Performance</p>
              <div className="flex items-baseline space-x-1">
                <TrendingUp size={14} className="text-emerald-400 mr-1" />
                <span className="text-lg font-black text-white">Top</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-400 h-full w-[100%] rounded-full"></div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/complaints')}
            className="w-full mt-6 py-4 bg-white text-slate-900 rounded-[24px] font-black text-xs active:scale-[0.98] transition-transform shadow-xl shadow-black/20 flex items-center justify-center"
          >
            Aktuelle Reklamationen prüfen <ChevronRight size={14} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Fuel Card Accept Modal */}
      {isAcceptModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[120] bg-black/40 ios-blur flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">Karte zuweisen</h2>
              <button onClick={() => setIsAcceptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAcceptFuelRequest} className="p-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Anfrage von</p>
                <p className="text-sm font-bold text-slate-900">{selectedRequest.driverName}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Fahrzeug: {selectedRequest.vehiclePlate} • Stand: {selectedRequest.mileage} km
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="input-label">Kartennummer</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Nummer der Tankkarte eingeben" 
                  className="input-field !bg-slate-50" 
                  value={cardNumber} 
                  onChange={e => setCardNumber(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !cardNumber}
                className="btn-primary w-full !py-4 !rounded-[20px] flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle size={20} />
                    <span>Zuweisung bestätigen</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Card History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 ios-blur flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <History size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">Tankkarten Historie</h2>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Suchen nach Fahrer, Kennzeichen oder Karte..." 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2">Datum</th>
                    <th className="px-4 py-2">Fahrer</th>
                    <th className="px-4 py-2">Fahrzeug</th>
                    <th className="px-4 py-2">KM-Stand</th>
                    <th className="px-4 py-2">Karte</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Rückgabe</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((fc) => (
                    <tr key={fc.id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 rounded-l-2xl text-xs font-bold text-slate-600">
                        {format(parseISO(fc.requestDate), 'dd.MM.yyyy')}
                      </td>
                      <td className="px-4 py-3 text-xs font-black text-slate-900">{fc.driverName}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600">{fc.vehiclePlate}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600">{fc.mileage} km</td>
                      <td className="px-4 py-3 text-xs font-black text-blue-600">{fc.cardNumber || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                          fc.status === 'RETURNED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          fc.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {fc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 rounded-r-2xl text-xs font-bold text-slate-500">
                        {fc.returnDate ? format(parseISO(fc.returnDate), 'dd.MM.yyyy HH:mm') : '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 font-bold italic">
                        Keine Einträge gefunden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

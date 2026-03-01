
import React, { useState } from 'react';
import { useAuth, useAppData, useTranslation } from '../App';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  ClipboardCheck, 
  AlertCircle, 
  ChevronRight, 
  Fuel, 
  CheckCircle2, 
  Clock, 
  Activity,
  User as UserIcon,
  ShieldAlert,
  Info,
  CheckCircle,
  X
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { TourStatus, DriverStatus, FuelCardRequest } from '../types';

const DriverDashboard: React.FC = () => {
  const { user, selectedDriverId } = useAuth();
  const { drivers, tours, inventory, fuelCards, saveData, setTours, setDrivers, setFuelCards } = useAppData();
  const { t } = useTranslation();

  const [isStopPlanModalOpen, setIsStopPlanModalOpen] = useState(false);
  const [isFuelCardModalOpen, setIsFuelCardModalOpen] = useState(false);
  const [selectedTourForFinish, setSelectedTourForFinish] = useState<string>('');
  const [finishData, setFinishData] = useState({ stops: '', packages: '' });
  const [mileage, setMileage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If admin is viewing as a specific driver, use that driver's ID
  // Otherwise use the linked driverId from the user profile, falling back to user.id
  const effectiveDriverId = selectedDriverId || user?.driverId || user?.id;
  const driver = drivers.find(d => d.id === effectiveDriverId);
  
  // Get today's tours for this driver
  const today = format(new Date(), 'yyyy-MM-dd');
  const driverTours = tours.filter(t => t.driverId === effectiveDriverId && t.date === today);
  const activeTour = driverTours.find(t => t.status === TourStatus.ACTIVE) || driverTours[0];
  
  const driverVehicle = inventory.find(v => v.plate === driver?.plate);

  // Check for active fuel card request
  const activeFuelRequest = fuelCards.find(fc => 
    fc.driverId === effectiveDriverId && 
    (fc.status === 'PENDING' || fc.status === 'ACCEPTED')
  );

  const handleStatusChange = async (newStatus: DriverStatus) => {
    if (!driver) return;
    const updatedDriver = { ...driver, status: newStatus };
    const saved = await saveData('drivers', updatedDriver);
    if (saved) {
      setDrivers(drivers.map(d => d.id === driver.id ? saved : d));
    }
  };

  const handleFinishTour = async (e: React.FormEvent) => {
    e.preventDefault();
    const tour = tours.find(t => t.id === selectedTourForFinish);
    if (!tour) return;

    setIsSubmitting(true);
    const updatedTour = {
      ...tour,
      totalStops: parseInt(finishData.stops),
      totalPackages: parseInt(finishData.packages),
      status: TourStatus.COMPLETED
    };

    const saved = await saveData('tours', updatedTour);
    if (saved) {
      setTours(tours.map(t => t.id === tour.id ? saved : t));
      setIsStopPlanModalOpen(false);
      setFinishData({ stops: '', packages: '' });
      setSelectedTourForFinish('');
    }
    setIsSubmitting(false);
  };

  const handleFuelCardRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !driverVehicle) return;

    setIsSubmitting(true);
    const newRequest: Partial<FuelCardRequest> = {
      user_id: user.id,
      driverId: driver.id,
      driverName: `${driver.firstName} ${driver.lastName}`,
      vehiclePlate: driverVehicle.plate,
      mileage: parseInt(mileage),
      requestDate: new Date().toISOString(),
      status: 'PENDING'
    };

    const saved = await saveData('fuel_cards', newRequest);
    if (saved) {
      setFuelCards([...fuelCards, saved]);
      setIsFuelCardModalOpen(false);
      setMileage('');
    }
    setIsSubmitting(false);
  };

  const handleFuelCardReturn = async () => {
    if (!activeFuelRequest) return;

    setIsSubmitting(true);
    const updatedRequest = {
      ...activeFuelRequest,
      user_id: user.id,
      returnDate: new Date().toISOString(),
      status: 'RETURNED' as const
    };

    const saved = await saveData('fuel_cards', updatedRequest);
    if (saved) {
      setFuelCards(fuelCards.map(fc => fc.id === activeFuelRequest.id ? saved : fc));
    }
    setIsSubmitting(false);
  };

  const getStatusColor = (status: DriverStatus) => {
    switch (status) {
      case DriverStatus.AVAILABLE: return 'bg-emerald-500';
      case DriverStatus.SICK: return 'bg-red-500';
      case DriverStatus.URLAUB: return 'bg-amber-500';
      case DriverStatus.FEHLT: return 'bg-slate-500';
      default: return 'bg-slate-300';
    }
  };

  const isUrgent = (dateStr?: string) => {
    if (!dateStr) return false;
    const days = differenceInDays(parseISO(dateStr), new Date());
    return days <= 3;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Header & Welcome */}
      <div className="px-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t.welcome}, <span className="text-blue-600">{driver?.firstName || user?.firstName}</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Gute Fahrt heute!</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(driver?.status || DriverStatus.AVAILABLE)} animate-pulse`} />
            <select 
              className="text-[10px] font-black uppercase tracking-widest border-none p-0 bg-transparent focus:ring-0 cursor-pointer"
              value={driver?.status || DriverStatus.AVAILABLE}
              onChange={(e) => handleStatusChange(e.target.value as DriverStatus)}
            >
              <option value={DriverStatus.AVAILABLE}>{t.available}</option>
              <option value={DriverStatus.SICK}>{t.sick}</option>
              <option value={DriverStatus.URLAUB}>{t.vacation}</option>
              <option value={DriverStatus.FEHLT}>{t.missing}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Today's Tour Info (Meine Tour heute) */}
      {activeTour ? (
        <div className="px-2">
          <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-500 p-1.5 rounded-lg">
                    <Activity size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{t.currentTour}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-1 rounded-lg">
                  {activeTour.tourNumber}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">{activeTour.city}</h2>
                <div className="flex items-center space-x-4 mt-2 text-white/60">
                  <div className="flex items-center space-x-1">
                    <Truck size={14} />
                    <span className="text-xs font-bold">{activeTour.vehiclePlate}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock size={14} />
                    <span className="text-xs font-bold">{format(parseISO(activeTour.date), 'dd.MM.yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-2">
          <div className="bg-slate-100 p-6 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-bold text-sm">{t.noTourAssigned}</p>
          </div>
        </div>
      )}

      {/* Main Action Grid */}
      <div className="grid grid-cols-2 gap-3 px-2">
        <button 
          onClick={() => setIsStopPlanModalOpen(true)}
          className="bg-white text-slate-900 p-5 rounded-[32px] border border-slate-200 flex flex-col items-start space-y-3 active:scale-95 transition-all shadow-sm group"
        >
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-2xl group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black leading-tight">{t.finishStopPlan.split(' ').slice(0, 2).join(' ')}<br/>{t.finishStopPlan.split(' ').slice(2).join(' ')}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{t.finishDay}</p>
          </div>
        </button>

        <button 
          onClick={() => activeFuelRequest ? handleFuelCardReturn() : setIsFuelCardModalOpen(true)}
          disabled={isSubmitting}
          className={`p-5 rounded-[32px] border flex flex-col items-start space-y-3 active:scale-95 transition-all shadow-sm group ${activeFuelRequest ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-900 border-slate-200'}`}
        >
          <div className={`${activeFuelRequest ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'} p-2.5 rounded-2xl group-hover:scale-110 transition-transform`}>
            <Fuel size={24} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black leading-tight">
              {activeFuelRequest ? 'Tank Karte\nzurückgeben' : 'Tanken Karte\nanfordern'}
            </p>
            <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${activeFuelRequest ? 'text-white/60' : 'text-slate-400'}`}>
              {activeFuelRequest ? (activeFuelRequest.status === 'PENDING' ? 'Warten auf Admin' : `Karte: ${activeFuelRequest.cardNumber}`) : 'Service'}
            </p>
          </div>
        </button>

        <button 
          onClick={() => window.location.hash = '#/driver/complaints'}
          className="bg-white text-slate-900 p-5 rounded-[32px] border border-slate-200 flex flex-col items-start space-y-3 active:scale-95 transition-all shadow-sm group"
        >
          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertCircle size={24} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black leading-tight">{t.myComplaints.split(' ')[0]}<br/>{t.myComplaints.split(' ')[1]}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{t.overview}</p>
          </div>
        </button>

        <button 
          onClick={() => window.location.hash = '#/driver/control'}
          className="bg-white text-slate-900 p-5 rounded-[32px] border border-slate-200 flex flex-col items-start space-y-3 active:scale-95 transition-all shadow-sm group"
        >
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-2xl group-hover:scale-110 transition-transform">
            <ClipboardCheck size={24} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black leading-tight">{t.control.split(' ')[0]}<br/>{t.control.split(' ')[1] || 'Checkliste'}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{t.safety}</p>
          </div>
        </button>
      </div>

      {/* Vehicle Info & Reminders (HU/Service Reminder) */}
      <div className="px-2 space-y-3">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center px-1">
          <Info size={12} className="mr-1.5" /> {t.huServiceReminder}
        </h2>
        
        <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">{driver?.plate || 'Kein Fahrzeug'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t.assignedVehicle}</p>
              </div>
            </div>
            {driverVehicle?.huExpiration && (
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isUrgent(driverVehicle.huExpiration) ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                HU: {format(parseISO(driverVehicle.huExpiration), 'MM/yyyy')}
              </div>
            )}
          </div>

          {driverVehicle?.serviceEndDate && (
            <div className={`flex items-center space-x-3 p-3 rounded-2xl border ${isUrgent(driverVehicle.serviceEndDate) ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
              <ShieldAlert size={18} className={isUrgent(driverVehicle.serviceEndDate) ? 'text-red-600' : 'text-blue-600'} />
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isUrgent(driverVehicle.serviceEndDate) ? 'text-red-600' : 'text-blue-600'}`}>{t.serviceEndDate}</p>
                <p className="text-xs font-bold text-slate-700">{format(parseISO(driverVehicle.serviceEndDate), 'dd.MM.yyyy')} bei {driverVehicle.serviceLocation || 'Werkstatt'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fuel Card Modal */}
      {isFuelCardModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 ios-blur flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[30px] flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-20 duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3"></div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">Tanken Karte anfordern</h2>
              <button onClick={() => setIsFuelCardModalOpen(false)} className="text-red-500 font-black uppercase text-xs tracking-widest">{t.cancel}</button>
            </div>
            <form onSubmit={handleFuelCardRequest} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="input-label">Aktueller Kilometerstand</label>
                <input 
                  type="number" 
                  required 
                  placeholder="z.B. 125400" 
                  className="input-field !bg-slate-50" 
                  value={mileage} 
                  onChange={e => setMileage(e.target.value)} 
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start space-x-3">
                <Info size={18} className="text-blue-600 mt-0.5" />
                <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                  Bitte gib den aktuellen Kilometerstand deines Fahrzeugs an, um eine Tankkarte anzufordern.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !mileage}
                className="btn-primary w-full !py-5 !rounded-[24px] flex items-center justify-center space-x-2 shadow-xl shadow-blue-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Fuel size={20} />
                    <span>Karte anfordern</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stop Plan Completion Modal */}
      {isStopPlanModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 ios-blur flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[30px] flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-20 duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3"></div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">{t.finishTour}</h2>
              <button onClick={() => setIsStopPlanModalOpen(false)} className="text-red-500 font-black uppercase text-xs tracking-widest">{t.cancel}</button>
            </div>
            <form onSubmit={handleFinishTour} className="p-8 space-y-6 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="input-label">{t.selectTour}</label>
                <select 
                  required 
                  className="input-field !bg-slate-50 appearance-none" 
                  value={selectedTourForFinish} 
                  onChange={e => setSelectedTourForFinish(e.target.value)}
                >
                  <option value="">{t.selectTour}</option>
                  {driverTours.filter(t => t.status !== TourStatus.COMPLETED).map(t => (
                    <option key={t.id} value={t.id}>{t.tourNumber} - {t.city}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="input-label">{t.stopsCount}</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="0" 
                    className="input-field !bg-slate-50" 
                    value={finishData.stops} 
                    onChange={e => setFinishData({...finishData, stops: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="input-label">{t.packagesCount}</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="0" 
                    className="input-field !bg-slate-50" 
                    value={finishData.packages} 
                    onChange={e => setFinishData({...finishData, packages: e.target.value})} 
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start space-x-3">
                <Info size={18} className="text-blue-600 mt-0.5" />
                <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                  {t.confirmFinishTour}
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !selectedTourForFinish}
                className="btn-primary w-full !py-5 !rounded-[24px] flex items-center justify-center space-x-2 shadow-xl shadow-blue-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle size={20} />
                    <span>{t.finishTourNow}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;


import React, { useState } from 'react';
import { Plus, Search, User, UserPlus, MapPin, Calendar as CalendarIcon, List, X, Edit2, Package, Hash, ChevronRight, CopyPlus, Star, Navigation } from 'lucide-react';
import { format, eachDayOfInterval, isSameDay, addMonths, subMonths, addDays } from 'date-fns';
import { Tour, TourStatus, InventoryType, TourType, VehicleStatus } from '../types';
import { useTranslation, useAppData, useAuth } from '../App';

const TourManager: React.FC = () => {
  const { t } = useTranslation();
  const { tours, setTours, drivers, inventory, saveData } = useAppData();
  const { user, viewMode, selectedDriverId } = useAuth();
  
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [formData, setFormData] = useState({
    tourNumber: '',
    city: '',
    driverId: '',
    beginnerDriverId: '',
    vehicleId: '',
    tourType: TourType.FEST,
    date: new Date().toISOString().split('T')[0],
  });

  const handleOpenAdd = () => {
    setEditingTour(null);
    setFormData({ 
      tourNumber: '', 
      city: '', 
      driverId: '', 
      beginnerDriverId: '', 
      vehicleId: '', 
      tourType: TourType.FEST,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd') 
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tour: Tour) => {
    setEditingTour(tour);
    const vehicle = inventory.find(i => i.plate === tour.vehiclePlate);
    setFormData({
      tourNumber: tour.tourNumber,
      city: tour.city,
      driverId: tour.driverId,
      beginnerDriverId: tour.beginnerDriverId || '',
      vehicleId: vehicle?.id || '',
      tourType: tour.tourType || TourType.FEST,
      date: tour.date,
    });
    setIsModalOpen(true);
  };

  const handleSaveTour = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedVehicle = inventory.find(i => i.id === formData.vehicleId);
    if (!formData.driverId || !selectedVehicle) return;

    const tourData: any = {
      user_id: user?.id,
      tourNumber: formData.tourNumber,
      city: formData.city,
      driverId: formData.driverId,
      beginnerDriverId: formData.beginnerDriverId || null,
      vehiclePlate: selectedVehicle.plate || '---',
      tourType: formData.tourType,
      date: formData.date,
    };

    if (editingTour) {
      tourData.id = editingTour.id;
      tourData.status = editingTour.status;
      tourData.progress = editingTour.progress;
      tourData.totalPackages = editingTour.totalPackages;
      tourData.totalStops = editingTour.totalStops;
    } else {
      tourData.status = TourStatus.PENDING;
      tourData.progress = 0;
      tourData.totalPackages = 0;
      tourData.totalStops = 0;
    }

    const savedTour = await saveData('tours', tourData);
    if (savedTour) {
      if (editingTour) {
        setTours(tours.map(t => t.id === editingTour.id ? savedTour : t));
      } else {
        setTours([savedTour, ...tours]);
      }
    }
    setIsModalOpen(false);
  };

  const handleCopyFromYesterday = async () => {
    const targetDate = selectedDate || new Date();
    const sourceDate = addDays(targetDate, -1);
    const sourceDateStr = format(sourceDate, 'yyyy-MM-dd');
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');

    const toursToCopy = tours.filter(t => t.date === sourceDateStr);
    
    if (toursToCopy.length === 0) {
      alert(t.noToursFound);
      setIsCopyModalOpen(false);
      return;
    }

    const copyPromises = toursToCopy.map(tour => {
      const { id, ...rest } = tour;
      return saveData('tours', {
        ...rest,
        user_id: user?.id,
        date: targetDateStr,
        totalPackages: 0,
        totalStops: 0,
        status: TourStatus.PENDING,
        progress: 0
      });
    });

    const savedNewTours = await Promise.all(copyPromises);
    const validNewTours = savedNewTours.filter(t => !!t);
    
    setTours([...validNewTours, ...tours]);
    setIsCopyModalOpen(false);
  };

  const getDriverName = (id?: string) => {
    if (!id) return null;
    const d = drivers.find(d => d.id === id);
    return d ? `${d.firstName} ${d.lastName}` : '---';
  };

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredTours = tours.filter(tour => {
    const matchesSearch = tour.tourNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tour.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = selectedDate ? isSameDay(new Date(tour.date), selectedDate) : true;
    
    if (viewMode === 'driver') {
      const effectiveDriverId = selectedDriverId || user?.id;
      return matchesSearch && matchesDate && (tour.driverId === effectiveDriverId || tour.beginnerDriverId === effectiveDriverId);
    }
    
    return matchesSearch && matchesDate;
  });

  // Sort by Tour Number (Ascending)
  const sortedTours = filteredTours.sort((a, b) => a.tourNumber.localeCompare(b.tourNumber, undefined, { numeric: true, sensitivity: 'base' }));

  // Only show available vehicles, or the vehicle already assigned to the tour being edited
  const availableVehicles = inventory.filter(item => 
    item.type === InventoryType.VEHICLE && (item.vehicleStatus === VehicleStatus.ACTIVE || item.id === formData.vehicleId)
  );

  const prevDayToursCount = tours.filter(t => t.date === format(addDays(selectedDate || new Date(), -1), 'yyyy-MM-dd')).length;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-10">
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t.tourManager}</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Einsatzplanung</p>
        </div>
        <div className="flex space-x-2">
          <div className="flex bg-slate-200/50 p-1 rounded-xl">
            <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white text-[#007AFF] shadow-sm' : 'text-slate-400'}`}><List size={20} /></button>
            <button onClick={() => setView('calendar')} className={`p-2 rounded-lg transition-all ${view === 'calendar' ? 'bg-white text-[#007AFF] shadow-sm' : 'text-slate-400'}`}><CalendarIcon size={20} /></button>
          </div>
          <button onClick={() => setIsCopyModalOpen(true)} className="btn-secondary !rounded-full !p-2.5 shadow-sm active:scale-95 transition-transform"><CopyPlus size={24} strokeWidth={2.5} /></button>
          <button onClick={handleOpenAdd} className="btn-primary !rounded-full !p-2.5 shadow-lg active:scale-95 transition-transform"><Plus size={24} strokeWidth={3} /></button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 mx-2 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h2>
              <div className="flex space-x-2">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2.5 bg-white rounded-xl border border-slate-200 active:bg-slate-50 shadow-sm"><ChevronRight size={20} className="rotate-180" /></button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2.5 bg-white rounded-xl border border-slate-200 active:bg-slate-50 shadow-sm"><ChevronRight size={20} /></button>
              </div>
            </div>
          <div className="grid grid-cols-7 gap-px bg-slate-100">
            {['S', 'M', 'D', 'M', 'D', 'F', 'S'].map((day, i) => (<div key={`${day}-${i}`} className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400 uppercase">{day}</div>))}
            {daysInMonth.map((day, idx) => {
              const dayTours = tours.filter(t => isSameDay(new Date(t.date), day));
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={idx} onClick={() => setSelectedDate(isSelected ? null : day)} className={`bg-white min-h-[70px] p-1 flex flex-col transition-all cursor-pointer ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset z-10' : ''}`}>
                  <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 mx-auto ${isToday ? 'bg-red-500 text-white' : (isSelected ? 'text-blue-600' : 'text-slate-400')}`}>{format(day, 'd')}</span>
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {dayTours.map(t => <div key={t.id} className="w-1.5 h-1.5 rounded-full bg-blue-500" />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative mx-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder={t.search} 
            className="input-field pl-10 !bg-slate-200/50 !rounded-2xl !border-none" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      )}

      <div className="mx-2 space-y-4">
        {selectedDate && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-black text-slate-400 uppercase">Filter: {format(selectedDate, 'dd.MM.yyyy')}</p>
            <button onClick={() => setSelectedDate(null)} className="text-[10px] font-black text-red-500 uppercase">Filter löschen</button>
          </div>
        )}
        {sortedTours.map((tour) => (
          <div key={tour.id} className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black text-[#007AFF] bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">Tour {tour.tourNumber}</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase flex items-center ${tour.tourType === TourType.SPRINGER ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-500'}`}>
                    {tour.tourType === TourType.SPRINGER ? <Navigation size={10} className="mr-1" /> : <Star size={10} className="mr-1" />}
                    {tour.tourType === TourType.SPRINGER ? t.springer : t.festTour}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-2 flex items-center"><MapPin size={18} className="mr-1.5 text-slate-400" /> {tour.city}</h3>
              </div>
              <div className="flex flex-col items-end">
                <button onClick={() => handleOpenEdit(tour)} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-[#007AFF] hover:bg-blue-50 transition-all active:scale-90"><Edit2 size={16} /></button>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-tighter">{format(new Date(tour.date), 'dd.MM.yyyy')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200"><User size={12} /></div>
                  <span className="text-xs font-bold text-slate-700 truncate">{getDriverName(tour.driverId)}</span>
                </div>
                {tour.beginnerDriverId && (
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100"><UserPlus size={12} /></div>
                    <span className="text-xs font-bold text-amber-700 truncate">{getDriverName(tour.beginnerDriverId)}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200"><Hash size={12} /></div>
                  <span className="text-xs font-black text-slate-900 font-mono">{tour.vehiclePlate}</span>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col justify-center items-center">
                <div className="flex space-x-4">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Pakete</p>
                    <p className="text-sm font-black text-blue-600">{tour.totalPackages || '--'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Stopps</p>
                    <p className="text-sm font-black text-indigo-600">{tour.totalStops || '--'}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: tour.totalPackages > 0 ? '100%' : '0%' }}></div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {sortedTours.length === 0 && <div className="p-16 text-center text-slate-400 font-black text-xs uppercase tracking-widest">Keine Touren gefunden</div>}
      </div>

      {isCopyModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 ios-blur flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[30px] p-6 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <CopyPlus size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black">{t.copyConfirmTitle}</h2>
              <p className="text-sm text-slate-500 mt-2">{t.copyConfirmDesc}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Gefundene Touren:</span>
              <span className="text-lg font-black text-blue-600">{prevDayToursCount}</span>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setIsCopyModalOpen(false)} className="flex-1 py-4 font-black text-red-500 bg-red-50 rounded-2xl active:scale-95 transition-transform">{t.cancel}</button>
              <button 
                onClick={handleCopyFromYesterday} 
                disabled={prevDayToursCount === 0}
                className="flex-1 py-4 font-black text-white bg-slate-900 rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-40"
              >
                {t.confirmAssignment.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 ios-blur flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[30px] flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-20 duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3"></div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">{editingTour ? 'Tour bearbeiten' : 'Neue Tour planen'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-red-500 font-black uppercase text-xs tracking-widest">{t.cancel}</button>
            </div>
            <form onSubmit={handleSaveTour} className="p-8 space-y-6 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="input-label">Eigenschaft</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button type="button" onClick={() => setFormData({...formData, tourType: TourType.FEST})} className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-black transition-all ${formData.tourType === TourType.FEST ? 'bg-white text-[#007AFF] shadow-sm' : 'text-slate-500'}`}><Star size={16} /> <span>{t.festTour}</span></button>
                  <button type="button" onClick={() => setFormData({...formData, tourType: TourType.SPRINGER})} className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-black transition-all ${formData.tourType === TourType.SPRINGER ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}><Navigation size={16} /> <span>{t.springer}</span></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="input-label">Tour-Nr.</label>
                  <input required placeholder="T-XXX" className="input-field !bg-slate-50" value={formData.tourNumber} onChange={e => setFormData({...formData, tourNumber: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="input-label">Einsatzort</label>
                  <input required placeholder="Region..." className="input-field !bg-slate-50" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="input-label">Hauptfahrer</label>
                <select 
                  required 
                  className="input-field !bg-slate-50 appearance-none" 
                  value={formData.driverId} 
                  onChange={e => {
                    const driverId = e.target.value;
                    const driver = drivers.find(d => d.id === driverId);
                    let vehicleId = formData.vehicleId;
                    
                    if (driver && driver.plate) {
                      const vehicle = inventory.find(i => i.plate === driver.plate && i.type === InventoryType.VEHICLE);
                      if (vehicle) {
                        vehicleId = vehicle.id;
                      }
                    }
                    
                    setFormData({...formData, driverId, vehicleId});
                  }}
                >
                  <option value="">Wählen...</option>
                  {drivers.filter(d => !d.isBeginner).map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="input-label">Beifahrer (Optional)</label>
                <select className="input-field !bg-slate-50 appearance-none" value={formData.beginnerDriverId} onChange={e => setFormData({...formData, beginnerDriverId: e.target.value})}>
                  <option value="">Keiner...</option>
                  {drivers.filter(d => d.isBeginner).map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="input-label">Fahrzeug</label>
                <select required className="input-field !bg-slate-50 appearance-none" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}>
                  <option value="">Wählen...</option>
                  {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="input-label">Datum</label>
                <input type="date" className="input-field !bg-slate-50" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary w-full !py-5 !rounded-[24px]">{editingTour ? 'Tour aktualisieren' : 'Tour planen'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourManager;

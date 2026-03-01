
import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle, Search, Plus, User, Truck, MapPin, X, Package } from 'lucide-react';
import { Complaint, Driver } from '../types';
import { useTranslation, useAppData, useAuth } from '../App';

const ComplaintsView: React.FC = () => {
  const { t } = useTranslation();
  const { complaints, setComplaints, drivers, tours, saveData } = useAppData();
  const { user, viewMode, selectedDriverId } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'ERLEDIGT' | 'SCHADEN' | null>(null);
  const [resolvePkgInput, setResolvePkgInput] = useState('');
  const [resolveError, setResolveError] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    tourId: '',
    tourNumber: '',
    driverId: '',
    packageNumber: '',
    address: '',
    postalCode: '',
  });

  const toursForDate = tours
    .filter(t => t.date === formData.date)
    .sort((a, b) => (a.tourNumber || '').localeCompare(b.tourNumber || '', undefined, { numeric: true }));

  const selectedTour = toursForDate.find(t => t.id === formData.tourId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTour) return;

    const driver = drivers.find(d => d.id === selectedTour.driverId);

    const complaintData: any = {
      tourId: selectedTour.id,
      
      // SNAPSHOT (istoric fix)
      tour_number_snapshot: selectedTour.tourNumber,
      tour_date_snapshot: selectedTour.date,
      driver_name_snapshot: driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown',
      vehicle_plate_snapshot: selectedTour.vehiclePlate || '',

      tourNumber: selectedTour.tourNumber,
      date: selectedTour.date,
      driverId: selectedTour.driverId,
      packageNumber: formData.packageNumber,
      address: formData.address,
      postalCode: formData.postalCode,
      status: 'PENDING',
      resolved: false
    };
    
    const savedComplaint = await saveData('complaints', complaintData);
    if (savedComplaint) {
      setComplaints([savedComplaint, ...complaints]);
    }
    
    setIsModalOpen(false);
    setFormData({ 
      date: new Date().toISOString().split('T')[0],
      tourId: '',
      tourNumber: '', 
      driverId: '', 
      packageNumber: '', 
      address: '', 
      postalCode: '',
    });
  };

  const handleResolve = () => {
    if (!isResolving || !pendingStatus) return;
    const complaint = complaints.find(c => c.id === isResolving);
    if (complaint) {
      if (resolvePkgInput !== complaint.packageNumber) {
        setResolveError(true);
        return;
      }
      const updated: Complaint = { 
        ...complaint, 
        status: pendingStatus, 
        resolved: true,
        resolvedAt: new Date().toISOString() 
      };
      setComplaints(complaints.map(c => c.id === isResolving ? updated : c));
      saveData('complaints', updated);
    }
    setIsResolving(null);
    setPendingStatus(null);
    setResolvePkgInput('');
    setResolveError(false);
  };

  const getDriverName = (id: string) => {
    const d = drivers.find(d => d.id === id);
    return d ? `${d.firstName} ${d.lastName}` : 'Unknown';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ERLEDIGT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SCHADEN':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (viewMode === 'driver') {
      const effectiveDriverId = selectedDriverId || user?.driverId || user?.id;
      return c.driverId === effectiveDriverId;
    }
    return true;
  });

  const filteredToursForDate = toursForDate.filter(tour => {
    if (viewMode === 'driver') {
      const effectiveDriverId = selectedDriverId || user?.driverId || user?.id;
      return tour.driverId === effectiveDriverId || tour.beginnerDriverId === effectiveDriverId;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t.complaints}</h1>
        </div>
        {viewMode === 'admin' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary !py-4 !px-8 shadow-xl shadow-blue-500/20 !rounded-2xl"
          >
            <Plus size={20} />
            <span>{t.newComplaint}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
        {filteredComplaints.map(complaint => (
          <div key={complaint.id} className={`bg-white rounded-[24px] border transition-all overflow-hidden ${complaint.status !== 'PENDING' ? 'shadow-sm' : 'shadow-lg'} ${getStatusStyle(complaint.status)}`}>
            <div className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-between border-b border-inherit`}>
              <div className="flex flex-col">
                <span>{t.tour} {complaint.tour_number_snapshot || complaint.tourNumber}</span>
                <span className="opacity-60">{complaint.tour_date_snapshot || complaint.date}</span>
              </div>
              <span className="flex items-center">
                {complaint.status === 'ERLEDIGT' && <><CheckCircle2 size={12} className="mr-1" /> {t.resolved}</>}
                {complaint.status === 'SCHADEN' && <><XCircle size={12} className="mr-1" /> Schaden</>}
                {complaint.status === 'PENDING' && <><AlertCircle size={12} className="mr-1" /> {t.pending}</>}
              </span>
            </div>
            
            <div className="p-5 space-y-4 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Pkg #{complaint.packageNumber}</h3>
                  <div className="flex items-center text-slate-500 text-sm mt-1">
                    <MapPin size={14} className="mr-1.5" />
                    {complaint.address}, {complaint.postalCode}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 font-bold border border-slate-200 text-xs text-center">
                  {(complaint.driver_name_snapshot || getDriverName(complaint.driverId)).split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">{complaint.driver_name_snapshot || getDriverName(complaint.driverId)}</p>
                  {complaint.vehicle_plate_snapshot && (
                    <p className="text-[10px] text-slate-400 font-medium">
                      {complaint.vehicle_plate_snapshot}
                    </p>
                  )}
                </div>
              </div>

              {complaint.status === 'PENDING' ? (
                viewMode === 'admin' ? (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        setIsResolving(complaint.id);
                        setPendingStatus('ERLEDIGT');
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-emerald-500/10 active:scale-95"
                    >
                      <CheckCircle2 size={16} />
                      <span>Erledigt</span>
                    </button>

                    <button 
                      onClick={() => {
                        setIsResolving(complaint.id);
                        setPendingStatus('SCHADEN');
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-red-500/10 active:scale-95"
                    >
                      <XCircle size={16} />
                      <span>Schaden</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs font-black uppercase tracking-widest rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                    {t.pending}
                  </div>
                )
              ) : (
                <div className={`text-center py-2 text-xs font-medium rounded-lg ${complaint.status === 'ERLEDIGT' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {complaint.status === 'ERLEDIGT' ? t.resolved : 'Schaden'} {new Date(complaint.resolvedAt!).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 ios-blur flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[30px] flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-20 duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3"></div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">{t.newComplaint}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-red-500 font-black uppercase text-xs tracking-widest">
                {t.cancel}
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-6 flex-1 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="input-label">{t.date}</label>
                <input 
                  type="date" 
                  required 
                  className="input-field !bg-slate-50" 
                  value={formData.date} 
                  onChange={e => setFormData({
                    ...formData, 
                    date: e.target.value,
                    tourId: '',
                    tourNumber: '',
                    driverId: ''
                  })} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="input-label">{t.tour} No</label>
                  <select
                    required
                    className="input-field !bg-slate-50 appearance-none"
                    value={formData.tourId}
                    onChange={(e) => {
                      const tourId = e.target.value;
                      const tour = filteredToursForDate.find(t => t.id === tourId);

                      setFormData(prev => ({
                        ...prev,
                        tourId,
                        tourNumber: tour?.tourNumber || '',
                        driverId: tour?.driverId || '',
                      }));
                    }}
                  >
                    <option value="">{t.search}</option>
                    {filteredToursForDate.map(tour => (
                      <option key={tour.id} value={tour.id}>
                        {tour.tourNumber} • {tour.city} • {tour.totalStops}/{tour.totalPackages} • {tour.vehiclePlate}
                      </option>
                    ))}
                  </select>
                  {filteredToursForDate.length === 0 && (
                    <p className="text-[10px] text-amber-600 font-bold ml-1">
                      Keine Touren für dieses Datum.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="input-label">Pkg No</label>
                  <input required className="input-field !bg-slate-50" value={formData.packageNumber} onChange={e => setFormData({...formData, packageNumber: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="input-label">{t.driverManager}</label>
                <select 
                  required 
                  disabled={!!formData.tourId}
                  className="input-field !bg-slate-50 appearance-none disabled:opacity-60" 
                  value={formData.driverId} 
                  onChange={e => setFormData({...formData, driverId: e.target.value})}
                >
                  <option value="">{t.search}</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="input-label">{t.address}</label>
                <input required className="input-field !bg-slate-50" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="input-label">Zip</label>
                <input required className="input-field !bg-slate-50" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary w-full !py-5 !rounded-[24px] mt-4 shadow-xl">{t.save}</button>
            </form>
          </div>
        </div>
      )}

      {isResolving && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[30px] shadow-2xl p-8 space-y-6 text-center overflow-hidden">
            <div className="w-20 h-20 bg-slate-50 text-[#007AFF] rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Package size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">{pendingStatus === 'ERLEDIGT' ? t.resolved : 'Schaden melden'}</h2>
            <p className="text-slate-500 text-sm font-medium">Verify package number to confirm.</p>
            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="Pkg #"
                className={`input-field !py-4 !rounded-2xl !text-center !font-black !text-lg ${resolveError ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                value={resolvePkgInput}
                onChange={e => {
                  setResolvePkgInput(e.target.value);
                  setResolveError(false);
                }}
              />
              {resolveError && (
                <p className="text-xs font-black text-red-500 animate-in fade-in slide-in-from-top-1 uppercase tracking-wider">
                  {t.pkgMismatch}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => {
                  setIsResolving(null);
                  setPendingStatus(null);
                  setResolveError(false);
                  setResolvePkgInput('');
                }} 
                className="btn-danger flex-1 !bg-red-50 !text-red-500 !shadow-none"
              >
                {t.cancel}
              </button>
              <button onClick={handleResolve} disabled={!resolvePkgInput} className="btn-primary flex-1 !bg-slate-900 !shadow-xl">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsView;

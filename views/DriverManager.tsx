
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  ChevronRight, 
  Tag, 
  User, 
  Edit3, 
  UserPlus, 
  UserCheck, 
  Shirt, 
  RefreshCw, 
  Package, 
  Truck, 
  Calendar, 
  Trash2, 
  Clock, 
  MapPin,
  LayoutGrid,
  CheckCircle2,
  UserX,
  Umbrella,
  Stethoscope,
  AlertTriangle,
  History,
  ClipboardCheck
} from 'lucide-react';
import { Driver, InventoryType, VehicleStatus, InventoryAssignment, DriverStatus, InventoryItem } from '../types.ts';
import SignaturePad from '../components/SignaturePad.tsx';
import { useTranslation, useAppData } from '../App.tsx';
import { format } from 'date-fns';

const DriverManager: React.FC = () => {
  const { t } = useTranslation();
  const { drivers, setDrivers, inventory, setInventory, refreshData, saveData, deleteData } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DriverStatus | 'ALL' | 'ASSOCIATED' | 'UNASSOCIATED'>('ALL');
  
  const [isAssignVehicleModal, setIsAssignVehicleModal] = useState(false);
  const [assignmentSignature, setAssignmentSignature] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const [showUrlaubReturnModal, setShowUrlaubReturnModal] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    glsNumber: '',
    phone: '',
    plate: '',
    isBeginner: false,
    status: DriverStatus.AVAILABLE,
    vacationStart: '',
    vacationEnd: '',
    sickStart: '',
    sickEnd: ''
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setShowUrlaubReturnModal(false);
    setIsAssignVehicleModal(false);
  };

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormData({ 
      firstName: '', 
      lastName: '', 
      glsNumber: '', 
      phone: '', 
      plate: '', 
      isBeginner: false, 
      status: DriverStatus.AVAILABLE,
      vacationStart: '',
      vacationEnd: '',
      sickStart: '',
      sickEnd: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      firstName: driver.firstName,
      lastName: driver.lastName,
      glsNumber: driver.glsNumber,
      phone: driver.phone,
      plate: driver.plate || '',
      isBeginner: driver.isBeginner || false,
      status: driver.status || DriverStatus.AVAILABLE,
      vacationStart: driver.vacationStart || '',
      vacationEnd: driver.vacationEnd || '',
      sickStart: driver.sickStart || '',
      sickEnd: driver.sickEnd || ''
    });
    setIsModalOpen(true);
  };

  const handleStatusClick = (newStatus: DriverStatus) => {
    // Only allow status changes for existing drivers
    if (!editingDriver) return;

    if (newStatus === DriverStatus.URLAUB && formData.plate) {
      setFormData(prev => ({ ...prev, status: newStatus }));
      setShowUrlaubReturnModal(true);
    } else {
      setFormData(prev => ({ ...prev, status: newStatus }));
    }
  };

  const handleAssignVehicle = () => {
    if (!editingDriver || !selectedVehicleId || !assignmentSignature) return;
    
    const vehicle = inventory.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    if (editingDriver.plate) {
      setInventory(prev => prev.map(v => v.plate === editingDriver.plate ? {
        ...v,
        assignedTo: undefined,
        signature: undefined,
        assignmentDate: undefined,
        vehicleStatus: VehicleStatus.ACTIVE
      } : v));
    }

    setInventory(prev => prev.map(v => v.id === vehicle.id ? {
      ...v,
      assignedTo: editingDriver.id,
      signature: assignmentSignature,
      assignmentDate: new Date().toISOString(),
      vehicleStatus: VehicleStatus.ALLOCATED
    } : v));

    const updatedVehicle: InventoryItem = {
      ...vehicle,
      assignedTo: editingDriver.id,
      signature: assignmentSignature,
      assignmentDate: new Date().toISOString(),
      vehicleStatus: VehicleStatus.ALLOCATED
    };

    saveData('inventory', updatedVehicle);

    setDrivers(prev => prev.map(d => d.id === editingDriver.id ? { ...d, plate: vehicle.plate || '' } : d));
    
    const updatedDriver: Driver = {
      ...editingDriver,
      plate: vehicle.plate || ''
    };
    saveData('drivers', updatedDriver);

    setFormData(prev => ({ ...prev, plate: vehicle.plate || '' }));
    
    setIsAssignVehicleModal(false);
    setAssignmentSignature('');
  };

  const handleUnassignVehicle = () => {
    if (!editingDriver || !formData.plate) return;
    
    setInventory(prev => prev.map(v => v.plate === formData.plate ? {
      ...v,
      assignedTo: undefined,
      signature: undefined,
      assignmentDate: undefined,
      vehicleStatus: VehicleStatus.ACTIVE
    } : v));

    const vehicle = inventory.find(v => v.plate === formData.plate);
    if (vehicle) {
      saveData('inventory', {
        ...vehicle,
        assignedTo: undefined,
        signature: undefined,
        assignmentDate: undefined,
        vehicleStatus: VehicleStatus.ACTIVE
      });
    }

    setDrivers(prev => prev.map(d => d.id === editingDriver.id ? { ...d, plate: '' } : d));
    saveData('drivers', { ...editingDriver, plate: '' });
    setFormData(prev => ({ ...prev, plate: '' }));
  };

  const processUrlaubReturn = async (returnVehicle: boolean) => {
    if (editingDriver) {
      const updatedPlate = returnVehicle ? '' : formData.plate;
      const driverData: any = {
        id: editingDriver.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        glsNumber: formData.glsNumber,
        phone: formData.phone,
        plate: updatedPlate,
        isBeginner: formData.isBeginner,
        status: DriverStatus.URLAUB,
        vacationStart: toDateOrNull(formData.vacationStart),
        vacationEnd: toDateOrNull(formData.vacationEnd),
        sickStart: toDateOrNull(formData.sickStart),
        sickEnd: toDateOrNull(formData.sickEnd),
        created_at: editingDriver.created_at
      };

      const savedDriver = await saveData('drivers', driverData);
      if (savedDriver) {
        setDrivers(prev => prev.map(d => d.id === editingDriver.id ? savedDriver : d));
      }

      if (returnVehicle && formData.plate) {
        const vehicle = inventory.find(v => v.plate === formData.plate);
        if (vehicle) {
          const updatedVehicle = {
            ...vehicle,
            assignedTo: undefined,
            vehicleStatus: VehicleStatus.ACTIVE,
            signature: undefined,
            assignmentDate: undefined
          };
          setInventory(prev => prev.map(v => v.id === vehicle.id ? updatedVehicle : v));
          saveData('inventory', updatedVehicle);
        }
      }
      setFormData(prev => ({ ...prev, plate: updatedPlate, status: DriverStatus.URLAUB }));
    }
    setShowUrlaubReturnModal(false);
  };

  const toDateOrNull = (v?: string) => (v && v.trim() ? v : null);

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showUrlaubReturnModal) return;

    // For new drivers, ensure they start as AVAILABLE
    const finalStatus = editingDriver ? formData.status : DriverStatus.AVAILABLE;

    const driverData: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      glsNumber: formData.glsNumber,
      phone: formData.phone,
      plate: formData.plate,
      isBeginner: formData.isBeginner,
      status: finalStatus,
      vacationStart: toDateOrNull(formData.vacationStart),
      vacationEnd: toDateOrNull(formData.vacationEnd),
      sickStart: toDateOrNull(formData.sickStart),
      sickEnd: toDateOrNull(formData.sickEnd),
    };

    if (editingDriver) {
      driverData.id = editingDriver.id;
      driverData.created_at = editingDriver.created_at;
    }
    
    try {
      const savedDriver = await saveData('drivers', driverData);
      
      if (savedDriver) {
        if (editingDriver) {
          setDrivers(prev => prev.map(d => d.id === savedDriver.id ? savedDriver : d));
        } else {
          setDrivers(prev => [savedDriver, ...prev]);
        }
      } else {
        // Fallback: if savedDriver is not returned, refresh all data
        await refreshData();
      }
    } catch (err) {
      console.error("Failed to save driver:", err);
    }
    
    handleCloseModal();
  };

  const handleDeleteDriver = () => {
    if (!isDeleteModalOpen) return;
    setDrivers(prev => prev.filter(d => d.id !== isDeleteModalOpen));
    deleteData('drivers', isDeleteModalOpen);
    setIsDeleteModalOpen(null);
  };

  const counts = {
    ALL: drivers.length,
    ASSOCIATED: drivers.filter(d => !!d.plate).length,
    UNASSOCIATED: drivers.filter(d => !d.plate).length,
    [DriverStatus.AVAILABLE]: drivers.filter(d => d.status === DriverStatus.AVAILABLE).length,
    [DriverStatus.FEHLT]: drivers.filter(d => d.status === DriverStatus.FEHLT).length,
    [DriverStatus.URLAUB]: drivers.filter(d => d.status === DriverStatus.URLAUB).length,
    [DriverStatus.SICK]: drivers.filter(d => d.status === DriverStatus.SICK).length,
  };

  const filteredDrivers = drivers.filter(d => {
    const firstName = d.firstName || '';
    const lastName = d.lastName || '';
    const glsNumber = d.glsNumber || '';
    
    const matchesSearch = `${firstName} ${lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          glsNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ASSOCIATED') return !!d.plate;
    if (statusFilter === 'UNASSOCIATED') return !d.plate;
    
    return d.status === statusFilter;
  });

  const getStatusStyle = (status: DriverStatus) => {
    switch (status) {
      case DriverStatus.AVAILABLE: return 'bg-emerald-500 text-white'; 
      case DriverStatus.FEHLT: return 'bg-red-500 text-white';      
      case DriverStatus.URLAUB: return 'bg-slate-400 text-white';     
      case DriverStatus.SICK: return 'bg-amber-500 text-white';       
      default: return 'bg-slate-200 text-slate-600';
    }
  };

  const getStatusLabel = (status: DriverStatus | 'ASSOCIATED' | 'UNASSOCIATED') => {
    switch (status) {
      case DriverStatus.AVAILABLE: return t.available;
      case DriverStatus.FEHLT: return t.missing;
      case DriverStatus.URLAUB: return t.vacation;
      case DriverStatus.SICK: return t.sick;
      case 'ASSOCIATED': return t.associated;
      case 'UNASSOCIATED': return t.unassociated;
      default: return 'Status';
    }
  };

  const getStatusIcon = (status: DriverStatus | 'ALL' | 'ASSOCIATED' | 'UNASSOCIATED') => {
    switch (status) {
      case 'ALL': return <LayoutGrid size={20} />;
      case DriverStatus.AVAILABLE: return <CheckCircle2 size={20} />;
      case DriverStatus.FEHLT: return <UserX size={20} />;
      case DriverStatus.URLAUB: return <Umbrella size={20} />;
      case DriverStatus.SICK: return <Stethoscope size={20} />;
      case 'ASSOCIATED': return <Truck size={20} />;
      case 'UNASSOCIATED': return <User size={20} />;
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-10">
      <div className="flex items-center justify-between px-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t.driverManager}</h1>
        <button onClick={handleOpenAdd} className="btn-primary !rounded-full !p-2.5 shadow-lg active:scale-95 transition-transform"><Plus size={24} strokeWidth={3} /></button>
      </div>

      <div className="px-2 space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder={t.search} 
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-[24px] text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="bg-white p-1 rounded-[24px] shadow-sm border border-slate-100 flex overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'ALLE', icon: <LayoutGrid size={20} /> },
            { id: DriverStatus.AVAILABLE, label: 'VERFÜGBAR', icon: <CheckCircle2 size={20} /> },
            { id: DriverStatus.FEHLT, label: 'FEHLT', icon: <UserX size={20} /> },
            { id: DriverStatus.URLAUB, label: 'URLAUB', icon: <Umbrella size={20} /> },
            { id: DriverStatus.SICK, label: 'TERMIN/KRANK', icon: <Stethoscope size={20} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id as any)}
              className={`flex-1 min-w-[85px] flex flex-col items-center justify-center py-3.5 px-1 rounded-[20px] transition-all duration-300 ${
                statusFilter === item.id 
                  ? 'bg-[#0F172A] text-white shadow-xl scale-[1.02]' 
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className={`${statusFilter === item.id ? 'text-white' : 'text-slate-400'} mb-1.5`}>
                {item.icon}
              </div>
              <span className={`text-[9px] font-black tracking-tighter uppercase ${statusFilter === item.id ? 'text-amber-400' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mx-2 pb-20">
        {filteredDrivers.length > 0 ? filteredDrivers.map((driver, index) => (
          <div 
            key={driver.id} 
            onClick={() => handleOpenEdit(driver)} 
            className={`flex items-center p-4 active:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer group ${index !== filteredDrivers.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg mr-4 border border-slate-200 shadow-inner relative shrink-0 ${driver.isBeginner ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-[#007AFF]'}`}>
              {(driver.firstName?.[0] || '?')}{(driver.lastName?.[0] || '?')}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusStyle(driver.status || DriverStatus.AVAILABLE)}`}></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center">
                <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{driver.firstName} {driver.lastName}</h3>
                {driver.isBeginner && <span className="ml-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0">{t.beginner}</span>}
              </div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5 flex items-center">
                <Clock size={10} className="mr-1" /> {getStatusLabel(driver.status || DriverStatus.AVAILABLE)} 
                {driver.status === DriverStatus.URLAUB && driver.vacationStart && ` (${format(new Date(driver.vacationStart), 'dd.MM')} - ${driver.vacationEnd ? format(new Date(driver.vacationEnd), 'dd.MM') : '?'})`}
                {driver.status === DriverStatus.SICK && driver.sickStart && ` (${format(new Date(driver.sickStart), 'dd.MM')} - ${driver.sickEnd ? format(new Date(driver.sickEnd), 'dd.MM') : '?'})`}
                <span className="mx-1 text-slate-300">•</span> 
                <MapPin size={10} className="mr-1" /> {driver.plate || '---'}
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(driver.id); }}
                className="p-2 text-slate-200 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
              <ChevronRight className="text-slate-300" size={20} />
            </div>
          </div>
        )) : (
          <div className="p-20 text-center">
            <UserX className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Keine Fahrer gefunden</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 ios-blur flex items-end animate-in fade-in duration-200">
           <div className="bg-white w-full rounded-t-[30px] flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-20 duration-300 shadow-2xl overflow-hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0"></div>
              <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50/50 shrink-0">
                <h2 className="text-xl font-black text-slate-900">{editingDriver ? t.editDriver : t.newDriver}</h2>
                <button onClick={handleCloseModal} className="text-red-500 font-black uppercase text-xs tracking-widest">{t.cancel}</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                <form id="driverForm" onSubmit={handleSaveDriver} className="space-y-6">
                  
                  {/* Status Section - ONLY FOR EXISTING DRIVERS */}
                  {editingDriver && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.statusSet}</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[DriverStatus.AVAILABLE, DriverStatus.FEHLT, DriverStatus.URLAUB, DriverStatus.SICK].map(status => (
                            <button 
                              key={status} 
                              type="button" 
                              onClick={() => handleStatusClick(status)} 
                              className={`flex items-center justify-center space-x-2 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.status === status ? getStatusStyle(status) + ' border-transparent shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-200'}`}
                            >
                              {getStatusIcon(status)}
                              <span>{getStatusLabel(status)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {formData.status === DriverStatus.URLAUB && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.from}</label>
                            <input type="date" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm" value={formData.vacationStart} onChange={e => setFormData({...formData, vacationStart: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.until}</label>
                            <input type="date" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm" value={formData.vacationEnd} onChange={e => setFormData({...formData, vacationEnd: e.target.value})} />
                          </div>
                        </div>
                      )}

                      {formData.status === DriverStatus.SICK && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.from}</label>
                            <input type="date" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm" value={formData.sickStart} onChange={e => setFormData({...formData, sickStart: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.until}</label>
                            <input type="date" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-[#007AFF]/10 focus:border-[#007AFF] transition-all font-black text-sm" value={formData.sickEnd} onChange={e => setFormData({...formData, sickEnd: e.target.value})} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="input-label">{t.category}</label>
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                      <button type="button" onClick={() => setFormData({...formData, isBeginner: false})} className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-black transition-all ${!formData.isBeginner ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><UserCheck size={16} /> <span>{t.regular}</span></button>
                      <button type="button" onClick={() => setFormData({...formData, isBeginner: true})} className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-black transition-all ${formData.isBeginner ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'}`}><UserPlus size={16} /> <span>{t.beginner}</span></button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="input-label">{t.firstName}</label><input required className="input-field !bg-slate-50" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="input-label">{t.lastName}</label><input required className="input-field !bg-slate-50" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} /></div>
                  </div>
                  
                  <div className="space-y-1.5"><label className="input-label">{t.gls}</label><input required placeholder="Kennung..." className="input-field !bg-slate-50 !font-mono" value={formData.glsNumber} onChange={e => setFormData({...formData, glsNumber: e.target.value})} /></div>
                  <div className="space-y-1.5"><label className="input-label">{t.phone}</label><input required type="tel" className="input-field !bg-slate-50" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                  
                  <button type="submit" form="driverForm" className="btn-primary w-full !py-5 !rounded-[24px]">
                    {t.saveMasterData}
                  </button>
                </form>

                {editingDriver && (
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.assignedVehicle}</h3>
                    {formData.plate ? (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <div className="flex items-center">
                          <Truck size={20} className="text-blue-600 mr-3" />
                          <span className="font-mono font-black text-blue-900">{formData.plate}</span>
                        </div>
                        <button onClick={handleUnassignVehicle} className="text-red-500 font-bold text-xs uppercase tracking-tighter bg-white px-3 py-1.5 rounded-lg shadow-sm">{t.release}</button>
                      </div>
                    ) : (
                      <button onClick={() => setIsAssignVehicleModal(true)} className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 text-slate-500 rounded-2xl font-bold flex items-center justify-center space-x-2">
                        <Truck size={18} /> <span>{t.assignVehicle}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {isAssignVehicleModal && (
        <div className="fixed inset-0 z-[120] bg-black/50 ios-blur flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black">{t.assignVehicle}</h2>
              <button onClick={() => setIsAssignVehicleModal(false)} className="btn-ghost !text-red-500 !p-0">{t.cancel}</button>
            </div>
            <select className="input-field !bg-slate-100" value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}>
              <option value="">{t.selectVehicle}</option>
              {inventory.filter(i => i.type === InventoryType.VEHICLE && i.vehicleStatus === VehicleStatus.ACTIVE).map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
              ))}
            </select>
            <div className="space-y-1">
              <label className="input-label">{t.signature}</label>
              <SignaturePad onSave={setAssignmentSignature} />
            </div>
            <button 
              onClick={handleAssignVehicle} 
              disabled={!selectedVehicleId || !assignmentSignature}
              className="btn-primary w-full !py-4"
            >
              {t.confirmAssignmentBtn}
            </button>
          </div>
        </div>
      )}

      {showUrlaubReturnModal && (
        <div className="fixed inset-0 z-[200] bg-black/70 ios-blur flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center space-y-6">
              <div className="w-20 h-20 bg-blue-50 text-[#007AFF] rounded-full flex items-center justify-center mx-auto">
                 <Truck size={40} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{t.vehicleReturned}</h2>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  {t.vehicleReturnedDesc} (<b>{formData.plate}</b>)
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => processUrlaubReturn(true)} 
                  className="w-full py-4 font-black text-white bg-[#007AFF] rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  {t.yesAtBase}
                </button>
                <button 
                  onClick={() => processUrlaubReturn(false)} 
                  className="w-full py-4 font-bold text-red-500 bg-slate-100 rounded-2xl active:bg-slate-200 transition-all"
                >
                  {t.noWithDriver}
                </button>
              </div>
           </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 ios-blur flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                 <Trash2 size={32} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{t.fired}?</h2>
                <p className="text-sm text-slate-500 mt-2 font-medium">{t.delete} {t.driverManager}?</p>
              </div>
            <div className="flex space-x-3">
              <button onClick={() => setIsDeleteModalOpen(null)} className="flex-1 py-4 font-black text-red-500 bg-red-50 rounded-2xl active:scale-95 transition-transform">{t.cancel}</button>
              <button onClick={handleDeleteDriver} className="flex-1 py-4 font-black text-white bg-slate-900 rounded-2xl shadow-xl active:scale-95 transition-transform">{t.delete}</button>
            </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DriverManager;

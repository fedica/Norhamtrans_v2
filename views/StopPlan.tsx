
import React, { useState } from 'react';
import { Calendar as CalendarIcon, List, FileText, ChevronLeft, ChevronRight, MapPin, Truck, Package } from 'lucide-react';
import { format, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { StopPlan, Tour } from '../types';
import { useTranslation, useAppData } from '../App';

const StopPlanView: React.FC = () => {
  const { t } = useTranslation();
  const { stops, setStops, tours, setTours, saveData } = useAppData();
  
  const [view, setView] = useState<'entry' | 'calendar'>('entry');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    tourId: '',
    packages: 0,
    stops: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTour = tours.find(t => t.id === entryForm.tourId);
    if (!selectedTour) return;

    const stopPlanData: any = {
      user_id: user?.id,
      date: entryForm.date,
      addresses: `${selectedTour.tourNumber} - ${selectedTour.city}`,
      packages: entryForm.packages,
      stops: entryForm.stops
    };

    // Update the tour with the actual stats
    const updatedTour = {
      ...selectedTour,
      totalPackages: entryForm.packages,
      totalStops: entryForm.stops
    };
    
    const [savedTour, savedPlan] = await Promise.all([
      saveData('tours', updatedTour),
      saveData('stops', stopPlanData)
    ]);

    if (savedTour) {
      setTours(tours.map(t => t.id === entryForm.tourId ? savedTour : t));
    }

    if (savedPlan) {
      setStops([savedPlan, ...stops]);
    }

    setEntryForm({
      date: new Date().toISOString().split('T')[0],
      tourId: '',
      packages: 0,
      stops: 0
    });
  };

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getPlanForDate = (date: Date) => {
    return stops.find(p => p.date === format(date, 'yyyy-MM-dd'));
  };

  const availableTours = tours.filter(tour => tour.date === entryForm.date);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t.stopPlan}</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Erfassung & Historie</p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button onClick={() => setView('entry')} className={`p-2 rounded-lg transition-all ${view === 'entry' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><List size={20} /></button>
          <button onClick={() => setView('calendar')} className={`p-2 rounded-lg transition-all ${view === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><CalendarIcon size={20} /></button>
        </div>
      </div>

      {view === 'entry' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mx-2">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">{t.newEntry}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="input-label">{t.date}</label>
                <input type="date" required className="input-field !bg-slate-100" value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value, tourId: ''})} />
              </div>
              
              <div className="space-y-1">
                <label className="input-label">Existierende Tour auswählen</label>
                <select 
                  required 
                  className="input-field !bg-slate-100 appearance-none" 
                  value={entryForm.tourId} 
                  onChange={e => setEntryForm({...entryForm, tourId: e.target.value})}
                >
                  <option value="">Bitte Tour wählen...</option>
                  {availableTours.map(tour => (
                    <option key={tour.id} value={tour.id}>
                      {tour.tourNumber} | {tour.city} ({tour.vehiclePlate})
                    </option>
                  ))}
                </select>
                {availableTours.length === 0 && (
                  <p className="text-[9px] text-amber-600 font-bold mt-1 ml-1 flex items-center">
                    <Truck size={10} className="mr-1" /> Keine Touren für dieses Datum im Tourenplan gefunden.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="input-label">Pakete</label>
                  <input type="number" required className="input-field !bg-slate-100" value={entryForm.packages} onChange={e => setEntryForm({...entryForm, packages: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="input-label">Stopps</label>
                  <input type="number" required className="input-field !bg-slate-100" value={entryForm.stops} onChange={e => setEntryForm({...entryForm, stops: parseInt(e.target.value) || 0})} />
                </div>
              </div>

              <button type="submit" disabled={!entryForm.tourId} className="btn-primary w-full !py-4 shadow-xl shadow-blue-500/20">{t.save}</button>
            </form>
          </div>
          
          <div className="mx-2 space-y-3">
            <div className="flex items-center justify-between px-1"><h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Kürzliche Einträge</h2><button className="text-blue-600 text-[11px] font-bold flex items-center"><FileText size={14} className="mr-1" /> EXCEL EXPORT</button></div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {stops.sort((a,b) => b.date.localeCompare(a.date)).map(plan => (
                <div key={plan.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{format(new Date(plan.date), 'dd. MMM yyyy')}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px] flex items-center">
                      <MapPin size={10} className="mr-1" /> {plan.addresses}
                    </p>
                  </div>
                  <div className="flex space-x-4 text-right">
                    <div><p className="text-[10px] font-black text-blue-600 uppercase">PKTE</p><p className="font-mono font-bold text-slate-900">{plan.packages}</p></div>
                    <div><p className="text-[10px] font-black text-indigo-600 uppercase">STOPS</p><p className="font-mono font-bold text-slate-900">{plan.stops}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 mx-2 overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50"><h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h2><div className="flex space-x-2"><button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm active:bg-slate-50"><ChevronLeft size={20} /></button><button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm active:bg-slate-50"><ChevronRight size={20} /></button></div></div>
          <div className="grid grid-cols-7 gap-px bg-slate-100">{['S', 'M', 'D', 'M', 'D', 'F', 'S'].map(day => (<div key={day} className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>))}{daysInMonth.map((day, idx) => { const plan = getPlanForDate(day); const isToday = isSameDay(day, new Date()); return (<div key={idx} className={`bg-white min-h-[90px] p-1 flex flex-col transition-all relative ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-slate-50/20' : ''} ${isToday ? 'bg-blue-50/40 ring-2 ring-blue-500 ring-inset z-10' : ''}`}><span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 mx-auto ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>{format(day, 'd')}</span>{plan && (<div className="mt-1"><div className="bg-blue-500 text-white rounded px-1 py-0.5 text-[8px] font-black uppercase text-center truncate">{plan.packages} Pkt</div></div>)}</div>);})}</div>
        </div>
      )}
    </div>
  );
};

export default StopPlanView;

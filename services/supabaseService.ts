
import { supabase } from '../lib/supabase';
import { Driver, InventoryItem, StopPlan, Complaint, ControlChecklist, Tour, FuelCardRequest } from '../types';

export const supabaseService = {
  // Drivers
  async getDrivers(): Promise<Driver[]> {
    const { data, error } = await supabase.from('drivers').select('*');
    if (error) throw error;
    return data || [];
  },
  async saveDriver(driver: any): Promise<Driver> {
    const { data, error } = await supabase.from('drivers').upsert(driver).select().single();
    if (error) throw error;
    return data;
  },
  async deleteDriver(id: string) {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) throw error;
  },

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) throw error;
    return data || [];
  },
  async saveInventoryItem(item: any): Promise<InventoryItem> {
    const { data, error } = await supabase.from('inventory').upsert(item).select().single();
    if (error) throw error;
    return data;
  },

  // Stop Plans
  async getStops(): Promise<StopPlan[]> {
    const { data, error } = await supabase.from('stops').select('*');
    if (error) throw error;
    return data || [];
  },
  async saveStop(stop: any): Promise<StopPlan> {
    const { data, error } = await supabase.from('stops').upsert(stop).select().single();
    if (error) throw error;
    return data;
  },

  // Complaints
  async getComplaints(): Promise<Complaint[]> {
    const { data, error } = await supabase.from('complaints').select('*');
    if (error) throw error;
    return data || [];
  },
  async saveComplaint(complaint: any): Promise<Complaint> {
    const { data, error } = await supabase.from('complaints').upsert(complaint).select().single();
    if (error) throw error;
    return data;
  },

  // Controls
  async getControls(): Promise<ControlChecklist[]> {
    const { data, error } = await supabase.from('controls').select('*');
    if (error) throw error;
    return data || [];
  },
  async saveControl(control: any): Promise<ControlChecklist> {
    const { data, error } = await supabase.from('controls').upsert(control).select().single();
    if (error) throw error;
    return data;
  },

  // Tours
  async getTours(): Promise<Tour[]> {
    const { data, error } = await supabase.from('tours').select('*');
    if (error) throw error;
    return data || [];
  },
  async saveTour(tour: any): Promise<Tour> {
    const { data, error } = await supabase
      .from('tours')
      .upsert(tour, { onConflict: 'date,tourNumber' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Fuel Cards
  async getFuelCards(): Promise<FuelCardRequest[]> {
    const { data, error } = await supabase.from('fuel_cards').select('*');
    if (error) throw error;
    
    return (data || []).map(fc => ({
      id: fc.id,
      user_id: fc.user_id,
      driverId: fc.driverid,
      driverName: fc.drivername,
      vehiclePlate: fc.vehicleplate,
      mileage: fc.mileage,
      cardNumber: fc.cardnumber,
      requestDate: fc.requestdate,
      acceptedDate: fc.accepteddate,
      returnDate: fc.returndate,
      status: fc.status
    }));
  },
  async saveFuelCard(request: any): Promise<FuelCardRequest> {
    const payload = {
      id: request.id,
      user_id: request.user_id, // obligatoriu

      // mapare camelCase -> DB lowercase
      driverid: request.driverid ?? request.driverId ?? null,
      drivername: request.drivername ?? request.driverName ?? null,
      vehicleplate: request.vehicleplate ?? request.vehiclePlate ?? null,

      mileage: request.mileage ?? request.mileage ?? null,
      cardnumber: request.cardnumber ?? request.cardNumber ?? null,

      requestdate: request.requestdate ?? request.requestDate ?? new Date().toISOString(),
      accepteddate: request.accepteddate ?? request.acceptedDate ?? null,
      returndate: request.returndate ?? request.returnDate ?? null,

      status: request.status ?? 'PENDING',
    };

    const { data, error } = await supabase
      .from('fuel_cards')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      user_id: data.user_id,
      driverId: data.driverid,
      driverName: data.drivername,
      vehiclePlate: data.vehicleplate,
      mileage: data.mileage,
      cardNumber: data.cardnumber,
      requestDate: data.requestdate,
      acceptedDate: data.accepteddate,
      returnDate: data.returndate,
      status: data.status
    };
  }
};


import { createClient } from '@supabase/supabase-js';

// Configuration - Use your actual Supabase details
// Replace the placeholders with your project's details
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vhqcbqntzyfodrzktukk.supabase.co'; 
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocWNicW50enlmb2Ryemt0dWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODQzNDgsImV4cCI6MjA4NTU2MDM0OH0.P4ASjaLmxRqfsWuc8YfN2KdSAI0wf9gVh0SUz9Pfj8o';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const db = {
  async upsert(table: string, data: any) {
    const { error } = await supabase.from(table).upsert(data);
    if (error) throw error;
  },
  async update(table: string, id: string, data: any) {
    const { error } = await supabase.from(table).update(data).eq('id', id);
    if (error) throw error;
  },
  async delete(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },
  async select(table: string, query = '*') {
    const { data, error } = await supabase.from(table).select(query);
    if (error) throw error;
    return data;
  }
};

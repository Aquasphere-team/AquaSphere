import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // Auth Methods
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    });
    
    if (error) throw error;
    
    // Also create user_profiles entry for username lookup
    if (data.user) {
      const { error: profileError } = await this.supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          username: username,
          email: email
        });
      
      if (profileError) console.warn('Profile creation failed:', profileError);
    }
    
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    try {
      // Sign out from Supabase
      const { error } = await this.supabase.auth.signOut({ scope: 'local' });
      if (error) console.error('SignOut error:', error);
      
      // Wait a bit for locks to be released
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Only clear Supabase-related keys, not everything
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
    } catch (e) {
      console.error('SignOut exception:', e);
      // Still try to clear Supabase keys even on error
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  // Get user email by username from user_profiles table
  async getEmailByUsername(username: string): Promise<string | null> {
    try {
      console.log('Searching for username:', username);
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('email')
        .eq('username', username)
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406
      
      if (error) {
        console.error('Error fetching email by username:', error);
        return null;
      }
      console.log('Found data:', data);
      return data?.email || null;
    } catch (e) {
      console.error('Exception in getEmailByUsername:', e);
      return null;
    }
  }

  // Aquarium State Methods
  async saveAquariumState(userId: string, state: any) {
    const { data, error } = await this.supabase
      .from('aquarium_states')
      .upsert({
        user_id: userId,
        state: state,
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    return data;
  }

  async loadAquariumState(userId: string) {
    console.log('loadAquariumState: Querying for user_id:', userId);
    const { data, error } = await this.supabase
      .from('aquarium_states')
      .select('state')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log('loadAquariumState: data =', data);
    console.log('loadAquariumState: error =', error);
    
    if (error && error.code !== 'PGRST116') {
      console.error('loadAquariumState: throwing error', error);
      throw error; // PGRST116 = no rows
    }
    return data?.state || null;
  }

  // Get Supabase client for direct access if needed
  getClient(): SupabaseClient {
    return this.supabase;
  }
}

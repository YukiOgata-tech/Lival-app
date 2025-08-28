// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { firebaseAuth } from './firebase';
import { onAuthStateChanged, onIdTokenChanged } from 'firebase/auth';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

class SupabaseManager {
  private client: SupabaseClient | null = null;
  private initialized = false;

  private initializeClient() {
    if (this.client) return;
    
    this.client = createClient(supabaseUrl, supabaseKey, {
      accessToken: async () => {
        const user = firebaseAuth.currentUser;
        if (!user) return null;
        
        try {
          const token = await user.getIdToken(false);
          return token;
        } catch (error) {
          console.error('Failed to get Firebase ID token:', error);
          return null;
        }
      },
    });

    // Setup auth listener only once
    if (!this.initialized) {
      this.initialized = true;
      // Update auth when Firebase auth state changes
      onIdTokenChanged(firebaseAuth, async (user) => {
        if (this.client) {
          const token = user ? await user.getIdToken(false) : null;
          await this.client.realtime.setAuth(token ?? '');
        }
      });
    }
  }

  getClient(): SupabaseClient {
    this.initializeClient();
    return this.client!;
  }

  async ensureAuthenticated(): Promise<boolean> {
    const user = firebaseAuth.currentUser;
    if (!user) return false;

    try {
      // Check if user has the required custom claim
      const decodedToken = await user.getIdTokenResult();
      const customClaims = decodedToken.claims;
      
      if (customClaims.role !== 'authenticated') {
        // Call the Cloud Function to set the custom claim
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('./firebase');
        const setSupabaseRole = httpsCallable(functions, 'setSupabaseRoleOnCreate');
        
        await setSupabaseRole();
        
        // Force token refresh to get the new claim
        await user.getIdToken(true);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to ensure authentication:', error);
      return false;
    }
  }
}

// Export singleton instance
export const supabaseManager = new SupabaseManager();

// Export lazy-loaded client
export const getSupabase = () => supabaseManager.getClient();
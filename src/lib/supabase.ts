// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { firebaseAuth } from './firebase';
import { onAuthStateChanged, onIdTokenChanged } from 'firebase/auth';
import { ErrorHandler, safeAsync } from './errors';
import { AuthClaimsCache } from './authClaimsCache';

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
          ErrorHandler.handleAuthError(error, 'firebase_token_refresh');
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

    // ★ キャッシュから高速チェック
    if (AuthClaimsCache.hasValidClaims(user.uid)) {
      return true; // API呼び出しなし
    }

    try {
      // ★ キャッシュされたトークンでまず確認
      const cachedToken = await user.getIdTokenResult(false);
      const cachedRole = (cachedToken.claims as any)?.role;
      
      if (cachedRole === 'authenticated') {
        // キャッシュに保存して次回の高速化
        AuthClaimsCache.setClaims(user.uid, cachedRole, cachedToken.expirationTime);
        return true;
      }

      // ★ トークン更新が必要な場合のみCloud Function呼び出し
      console.log('[supabase] Claims verification required');
      
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('./firebase');
      const setSupabaseRole = httpsCallable(functions, 'setSupabaseRoleOnCreate');
      
      await setSupabaseRole();
      
      // 強制更新して最新クレーム取得
      await user.getIdToken(true);
      const updatedToken = await user.getIdTokenResult();
      const updatedRole = (updatedToken.claims as any)?.role;
      
      if (updatedRole === 'authenticated') {
        AuthClaimsCache.setClaims(user.uid, updatedRole, updatedToken.expirationTime);
        return true;
      }

      throw new Error('Claims verification failed after function call');
      
    } catch (error) {
      // エラー時はキャッシュをクリア
      AuthClaimsCache.clearClaims(user.uid);
      ErrorHandler.handleAuthError(error, 'supabase_auth_ensure', {
        hasUser: Boolean(user),
        userUid: user?.uid
      });
      return false;
    }
  }
}

// Export singleton instance
export const supabaseManager = new SupabaseManager();

// Export lazy-loaded client
export const getSupabase = () => supabaseManager.getClient();
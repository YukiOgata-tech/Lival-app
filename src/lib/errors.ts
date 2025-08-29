// src/lib/errors.ts - 簡易エラーハンドリングシステム

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  PERMISSION = 'permission', 
  DATA = 'data',
  SYSTEM = 'system'
}

export interface AppErrorInfo {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage?: string;
  context?: string;
  metadata?: Record<string, any>;
}

/**
 * 統一エラーハンドラー
 * 外部依存なし、即座に利用可能
 */
export class ErrorHandler {
  private static logError(error: any, info: AppErrorInfo): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${info.severity.toUpperCase()}][${info.category}]`;
    
    console.group(`${prefix} ${timestamp}`);
    console.error('Message:', error?.message || String(error));
    if (info.context) console.log('Context:', info.context);
    if (info.metadata) console.log('Metadata:', info.metadata);
    if (error?.stack) console.log('Stack:', error.stack);
    console.groupEnd();
  }

  /**
   * 認証エラーの処理
   */
  static handleAuthError(error: any, context?: string, metadata?: Record<string, any>): void {
    this.logError(error, {
      category: ErrorCategory.AUTH,
      severity: ErrorSeverity.HIGH,
      userMessage: '認証でエラーが発生しました',
      context,
      metadata
    });

    // 認証エラーは開発時に詳細ログ
    if (__DEV__) {
      console.warn('[AUTH] 認証エラーが発生しました。Firebase/Supabase設定を確認してください。');
    }
  }

  /**
   * Supabaseエラーの処理  
   */
  static handleSupabaseError(error: any, operation: string): void {
    const isAuthError = this.isAuthRelatedError(error);
    const isRLSError = this.isRLSError(error);

    this.logError(error, {
      category: isAuthError ? ErrorCategory.AUTH : ErrorCategory.DATA,
      severity: isAuthError ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      context: `supabase_${operation}`,
      metadata: {
        isAuthError,
        isRLSError,
        operation
      }
    });
  }

  /**
   * ネットワークエラーの処理
   */
  static handleNetworkError(error: any, context?: string): void {
    this.logError(error, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'ネットワークエラーが発生しました',
      context,
      metadata: {
        online: navigator?.onLine,
        timestamp: Date.now()
      }
    });
  }

  /**
   * 一般的なエラーの処理（セーフティネット）
   */
  static handleUnknownError(error: any, context?: string): void {
    this.logError(error, {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      context,
      metadata: {
        errorType: typeof error,
        hasMessage: Boolean(error?.message),
        hasStack: Boolean(error?.stack)
      }
    });
  }

  // プライベートヘルパーメソッド
  private static isAuthRelatedError(error: any): boolean {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('jwt') || 
           message.includes('auth') ||
           message.includes('unauthorized') ||
           message.includes('token') ||
           message.includes('permission');
  }

  private static isRLSError(error: any): boolean {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('row level security') ||
           message.includes('policy') ||
           message.includes('rls');
  }
}

/**
 * try-catchを簡潔に書くためのヘルパー関数
 */
export async function safeAsync<T>(
  fn: () => Promise<T>, 
  errorHandler: (error: any) => void = ErrorHandler.handleUnknownError,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    errorHandler(error);
    return fallback;
  }
}

/**
 * 同期処理用のsafeWrapper
 */
export function safe<T>(
  fn: () => T,
  errorHandler: (error: any) => void = ErrorHandler.handleUnknownError, 
  fallback?: T
): T | undefined {
  try {
    return fn();
  } catch (error) {
    errorHandler(error);
    return fallback;
  }
}
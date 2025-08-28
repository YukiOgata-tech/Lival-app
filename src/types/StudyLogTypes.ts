// src/types/StudyLogTypes.ts

// Core interfaces based on Supabase schema
export interface StudyLog {
  id: number;
  user_id: string;
  book_id?: string | null;
  manual_book_title?: string | null;
  duration_minutes: number;
  memo?: string | null;
  studied_at: string; // ISO string
  free_mode?: boolean;
  created_at: string;
  book?: Book;
}

export interface Book {
  id: string; // UUID
  isbn?: string | null;
  title: string;
  author: string;
  company: string;
  cover_image_url?: string | null;
  google_volume_id?: string | null;
  created_at: string;
}

export interface StudyLogInput {
  book_id?: string | null;
  manual_book_title?: string | null;
  duration_minutes: number;
  memo?: string | null;
  studied_at: string;
  free_mode?: boolean;
}

export interface StudyStats {
  totalMinutes: number;
  totalSessions: number;
  averageMinutesPerDay: number;
  currentStreak: number;
  longestStreak: number;
  recentStudyLogs: StudyLog[];
}

// Book search interfaces
export interface BookSearchResult {
  id?: string; // Supabase UUID (if found locally)
  isbn?: string;
  title: string;
  author: string;
  company: string;
  cover_image_url?: string;
  google_volume_id?: string;
  source: 'supabase' | 'openbd' | 'google_books';
}

export interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

export interface OpenBDBook {
  summary: {
    isbn: string;
    title: string;
    author: string;
    publisher: string;
    pubdate?: string;
    cover?: string;
  };
}

// Study log creation modes
export type StudyLogMode = 'isbn' | 'title' | 'manual' | 'none';

export interface StudyLogFormData {
  mode: StudyLogMode;
  bookId?: string;
  manualTitle?: string;
  durationMinutes: number;
  memo?: string;
  studiedAt: Date;
}
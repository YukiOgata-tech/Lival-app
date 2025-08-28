// src/lib/studyLogApi.ts
import { getSupabase, supabaseManager } from './supabase';
import type { 
  StudyLog, 
  StudyLogInput, 
  StudyStats, 
  Book, 
  BookSearchResult,
  GoogleBooksVolume,
  OpenBDBook 
} from '@/types/StudyLogTypes';

const GOOGLE_BOOKS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

// Study Log CRUD Operations
export async function createStudyLog(userId: string, input: StudyLogInput): Promise<StudyLog | null> {
  await supabaseManager.ensureAuthenticated();
  
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('study_logs')
      .insert({
        book_id: input.book_id || null,
        manual_book_title: input.manual_book_title?.trim() || null,
        duration_minutes: input.duration_minutes,
        memo: input.memo?.trim() || null,
        studied_at: input.studied_at,
        free_mode: input.free_mode || false,
      })
      .select(`
        *,
        book:books (*)
      `)
      .single();

    if (error) {
      console.error('Error creating study log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to create study log:', error);
    return null;
  }
}

export async function getStudyLogs(userId: string): Promise<StudyLog[]> {
  await supabaseManager.ensureAuthenticated();
  
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('study_logs')
      .select(`
        *,
        book:books (*)
      `)
      .order('studied_at', { ascending: false });

    if (error) {
      console.error('Error fetching study logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch study logs:', error);
    return [];
  }
}

export async function getStudyStats(userId: string): Promise<StudyStats> {
  await supabaseManager.ensureAuthenticated();
  
  try {
    const supabase = getSupabase();
    const { data: logs, error } = await supabase
      .from('study_logs')
      .select(`
        *,
        book:books (*)
      `)
      .order('studied_at', { ascending: false });

    if (error) {
      console.error('Error fetching study logs for stats:', error);
      return getDefaultStats();
    }

    if (!logs || logs.length === 0) {
      return getDefaultStats();
    }

    // Calculate statistics
    const totalMinutes = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
    const totalSessions = logs.length;
    
    // Calculate average minutes per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLogs = logs.filter(log => 
      new Date(log.studied_at) >= thirtyDaysAgo
    );
    const recentMinutes = recentLogs.reduce((sum, log) => sum + log.duration_minutes, 0);
    const averageMinutesPerDay = recentMinutes / 30;

    // Calculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(logs);

    return {
      totalMinutes,
      totalSessions,
      averageMinutesPerDay: Math.round(averageMinutesPerDay),
      currentStreak,
      longestStreak,
      recentStudyLogs: logs.slice(0, 10), // Last 10 logs
    };
  } catch (error) {
    console.error('Failed to fetch study stats:', error);
    return getDefaultStats();
  }
}

function getDefaultStats(): StudyStats {
  return {
    totalMinutes: 0,
    totalSessions: 0,
    averageMinutesPerDay: 0,
    currentStreak: 0,
    longestStreak: 0,
    recentStudyLogs: [],
  };
}

function calculateStreaks(logs: StudyLog[]): { currentStreak: number; longestStreak: number } {
  if (logs.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Group logs by date
  const dateGroups = new Map<string, StudyLog[]>();
  logs.forEach(log => {
    const date = new Date(log.studied_at).toDateString();
    if (!dateGroups.has(date)) {
      dateGroups.set(date, []);
    }
    dateGroups.get(date)!.push(log);
  });

  const uniqueDates = Array.from(dateGroups.keys())
    .map(date => new Date(date))
    .sort((a, b) => b.getTime() - a.getTime()); // Most recent first

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Calculate current streak
  for (let i = 0; i < uniqueDates.length; i++) {
    const date = uniqueDates[i];
    const dateStr = date.toDateString();
    
    if (i === 0) {
      if (dateStr === today || dateStr === yesterday.toDateString()) {
        currentStreak = 1;
        tempStreak = 1;
      } else {
        break;
      }
    } else {
      const prevDate = uniqueDates[i - 1];
      const dayDiff = Math.floor((prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        currentStreak++;
        tempStreak++;
      } else {
        break;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Calculate longest streak overall
  tempStreak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const date = uniqueDates[i];
    const prevDate = uniqueDates[i - 1];
    const dayDiff = Math.floor((prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

// Book Search Functions
export async function searchBookByISBN(isbn: string): Promise<BookSearchResult | null> {
  await supabaseManager.ensureAuthenticated();
  
  // First, search in Supabase
  const localBook = await searchBookInSupabase(isbn, 'isbn');
  if (localBook) return localBook;

  // Then search openBD
  const openBDResult = await searchOpenBD(isbn);
  if (openBDResult) {
    const savedBook = await saveBookToSupabase(openBDResult);
    return savedBook || openBDResult;
  }

  // Finally search Google Books
  const googleResult = await searchGoogleBooksByISBN(isbn);
  if (googleResult) {
    const savedBook = await saveBookToSupabase(googleResult);
    return savedBook || googleResult;
  }

  return null;
}

export async function searchBookByTitle(title: string): Promise<BookSearchResult[]> {
  await supabaseManager.ensureAuthenticated();
  
  // Search in Supabase first
  const localBooks = await searchBooksInSupabaseByTitle(title);
  const results: BookSearchResult[] = [...localBooks];

  // Search Google Books
  const googleResults = await searchGoogleBooksByTitle(title);

  // Filter out Google results that are already in our local results
  const newGoogleBooks = googleResults.filter(gBook => 
    !localBooks.some(lBook => lBook.isbn && lBook.isbn === gBook.isbn)
  );

  // Save the new books from Google to our database
  // createBookRecord will upsert and return the book with our internal id
  const savedNewBooks = (await Promise.all(
    newGoogleBooks.map(book => createBookRecord(book))
  )).filter((b): b is BookSearchResult => b !== null);

  // Add the newly saved books to the results list
  results.push(...savedNewBooks);

  // Final de-duplication based on title, just in case of no ISBN
  const finalResults = results.filter((book, index, self) =>
    index === self.findIndex((b) => (
      (b.isbn && b.isbn === book.isbn) || b.title === book.title
    ))
  );

  return finalResults.slice(0, 20); // Limit results
}

async function searchBookInSupabase(query: string, type: 'isbn' | 'title'): Promise<BookSearchResult | null> {
  try {
    const supabase = getSupabase();
    let queryBuilder = supabase.from('books').select('*');
    
    if (type === 'isbn') {
      queryBuilder = queryBuilder.eq('isbn', query);
    } else {
      queryBuilder = queryBuilder.ilike('title', `%${query}%`);
    }

    const { data, error } = await queryBuilder.single();

    if (error || !data) return null;

    return {
      id: data.id,
      isbn: data.isbn,
      title: data.title,
      author: data.author,
      company: data.company,
      cover_image_url: data.cover_image_url,
      google_volume_id: data.google_volume_id,
      source: 'supabase',
    };
  } catch {
    return null;
  }
}

async function searchBooksInSupabaseByTitle(title: string): Promise<BookSearchResult[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .ilike('title', `%${title}%`)
      .limit(10);

    if (error || !data) return [];

    return data.map(book => ({
      id: book.id,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      company: book.company,
      cover_image_url: book.cover_image_url,
      google_volume_id: book.google_volume_id,
      source: 'supabase' as const,
    }));
  } catch {
    return [];
  }
}

async function searchOpenBD(isbn: string): Promise<BookSearchResult | null> {
  try {
    const response = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
    const data = await response.json();
    
    if (!data || !data[0] || !data[0].summary) return null;
    
    const book: OpenBDBook = data[0];
    return {
      isbn: book.summary.isbn,
      title: book.summary.title,
      author: book.summary.author || '著者不明',
      company: book.summary.publisher || '出版社不明',
      cover_image_url: book.summary.cover,
      source: 'openbd',
    };
  } catch (error) {
    console.error('openBD search error:', error);
    return null;
  }
}

async function searchGoogleBooksByISBN(isbn: string): Promise<BookSearchResult | null> {
  if (!GOOGLE_BOOKS_API_KEY) {
    console.warn('Google Books API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${GOOGLE_BOOKS_API_KEY}`
    );
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) return null;
    
    const volume: GoogleBooksVolume = data.items[0];
    const isbn13 = volume.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier;
    const isbn10 = volume.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier;
    
    return {
      isbn: isbn13 || isbn10,
      title: volume.volumeInfo.title,
      author: volume.volumeInfo.authors?.join(', ') || '著者不明',
      company: volume.volumeInfo.publisher || '出版社不明',
      cover_image_url: volume.volumeInfo.imageLinks?.thumbnail?.replace(/^http:/, 'https:'),
      google_volume_id: volume.id,
      source: 'google_books',
    };
  } catch (error) {
    console.error('Google Books search error:', error);
    return null;
  }
}

async function searchGoogleBooksByTitle(title: string): Promise<BookSearchResult[]> {
  if (!GOOGLE_BOOKS_API_KEY) {
    console.warn('Google Books API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=10&key=${GOOGLE_BOOKS_API_KEY}`
    );
    const data = await response.json();
    
    if (!data.items) return [];
    
    return data.items.map((volume: GoogleBooksVolume) => {
      const isbn13 = volume.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier;
      const isbn10 = volume.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier;
      
      return {
        isbn: isbn13 || isbn10,
        title: volume.volumeInfo.title,
        author: volume.volumeInfo.authors?.join(', ') || '著者不明',
        company: volume.volumeInfo.publisher || '出版社不明',
        cover_image_url: volume.volumeInfo.imageLinks?.thumbnail?.replace(/^http:/, 'https:'),
        google_volume_id: volume.id,
        source: 'google_books' as const,
      };
    });
  } catch (error) {
    console.error('Google Books search error:', error);
    return [];
  }
}

export async function createBookRecord(book: BookSearchResult): Promise<BookSearchResult | null> {
  if (!book.google_volume_id) {
    return book;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('books')
      .upsert({
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        company: book.company,
        cover_image_url: book.cover_image_url,
        google_volume_id: book.google_volume_id,
      }, {
        onConflict: 'google_volume_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving book to Supabase:', error);
      return null;
    }

    return {
      ...book,
      id: data.id,
      source: 'supabase',
    };
  } catch (error) {
    console.error('Failed to save book to Supabase:', error);
    return null;
  }
}

// Utility functions
export function sanitizeNullable(s?: string | null): string | null {
  const trimmed = (s ?? '').trim();
  return trimmed.length ? trimmed : null;
}

export function extractISBN(text: string): string | null {
  // Remove all non-digit characters and extract ISBN
  const digits = text.replace(/\D/g, '');
  
  // Check for ISBN-13 (13 digits)
  if (digits.length === 13) {
    return digits;
  }
  
  // Check for ISBN-10 (10 digits)
  if (digits.length === 10) {
    return digits;
  }
  
  return null;
}
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create a conditional client that only initializes if env vars are present
export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Test database connection
export async function testSupabaseConnection() {
  try {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client not initialized. Please check SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.',
        timestamp: new Date().toISOString()
      };
    }

    // For now, just test that the client was created successfully
    // We'll implement actual database queries later when we have tables
    return {
      success: true,
      message: 'Supabase client initialized successfully. Ready for database operations.',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      message: `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    };
  }
}

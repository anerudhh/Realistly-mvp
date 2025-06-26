import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create a client for anonymous operations (client-side)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Create a client with service role for admin operations (server-side only!)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default supabaseClient;

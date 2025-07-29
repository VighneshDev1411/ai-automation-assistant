import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection
export async function testConnection() {
  const { data, error } = await supabase
    .from('organizations')
    .select('count')
    
  if (error) {
    console.error('Connection failed:', error)
    return false
  }
  
  console.log('Connection successful!')
  return true
}
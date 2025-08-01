import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
  try {
    // Test query (using organizations table from your RLS setup)
    const { data, error } = await supabase
      .from('users')
      .select('count')
      

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      data: data?.[0] || null
    })
  } catch (error:any) {
    return NextResponse.json({
      success: false,
      message: 'Supabase connection failed',
      error: error.message
    }, { status: 500 })
  }
}
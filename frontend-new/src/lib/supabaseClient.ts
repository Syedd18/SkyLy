"use client"

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
	// Only instantiate in the browser where window is available
	if (typeof window === 'undefined') return null

	if (!_supabase) {
		const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
		const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
		
		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			// Do not throw during SSR/build — return null and allow callers to handle it
			console.warn('Supabase environment variables not found')
			return null
		}
		_supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
	}

	return _supabase
}

export default getSupabaseClient

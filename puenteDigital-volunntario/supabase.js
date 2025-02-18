import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yauqrvtjakfwbrtbacmj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhdXFydnRqYWtmd2JydGJhY21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNDAzMTQsImV4cCI6MjA1MzgxNjMxNH0.ZN6FHiaAmkh3-hR48tqM5o2z4L26IUFzogmNBU6s9F0'

export const supabase = createClient(supabaseUrl, supabaseKey)

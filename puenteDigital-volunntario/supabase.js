import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'URL'
const supabaseKey = 'KEY_EXAMPLE'

export const supabase = createClient(supabaseUrl, supabaseKey)

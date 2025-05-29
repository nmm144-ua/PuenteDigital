import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'URL'
const supabaseKey = 'KEY_EXAMPLE'

export const supabase = createClient(supabaseUrl, supabaseKey,{
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
});
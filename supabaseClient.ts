import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// ATENÇÃO: Substitua os valores abaixo pelos do seu projeto Supabase.
// Você encontra eles em: Project Settings > API
//
// Para evitar o erro "Invalid supabaseUrl", deixamos um valor padrão com formato https,
// mas ele não funcionará para login até que você coloque sua URL real.

const SUPABASE_URL = 'https://seu-projeto-id.supabase.co'; // Mantenha o formato https://...
const SUPABASE_ANON_KEY = 'sua-chave-publica-anon-aqui';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

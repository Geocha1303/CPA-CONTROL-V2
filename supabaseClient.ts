import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---

// 1. URL DO PROJETO
const SUPABASE_URL = 'https://hmtnpthypvzozroghzsc.supabase.co';

// 2. CHAVE ANON/PUBLIC
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtdG5wdGh5cHZ6b3pyb2doenNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzQ3NjMsImV4cCI6MjA4NTAxMDc2M30.r2psM6bPObKURIGxMhx96I-TKR9l585xugaYvdqkpeQ';

// Configuração otimizada para Realtime
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeatIntervalMs: 5000, // Tenta manter a conexão viva a cada 5s
    timeout: 10000, // Desiste e tenta reconectar após 10s
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
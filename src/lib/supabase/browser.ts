import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    "https://itihdyxxrhjbxxsnphtc.supabase.co", 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0aWhkeXh4cmhqYnh4c25waHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDQxNzAsImV4cCI6MjEwNjQyMDE3MH0.AWHZYXVgDBPZfgVR2yeoz1ESJdMFzi9ViSJ7-v_EHsM" // <-- วางคีย์ที่ก๊อปมาไว้ในเครื่องหมายคำพูด (ห้ามลบเครื่องหมายคำพูดออก)
  )
}

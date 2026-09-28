/* Public frontend configuration.
   These two values are safe to expose in the browser (anon/publishable key + project URL).
   The service-role key and FLAG_PEPPER live ONLY in server env vars, never here. */
window.SENTINEL_CONFIG = {
  SUPABASE_URL: "https://bbpeidhaenheqcqlndib.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicGVpZGhhZW5oZXFjcWxuZGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTEzODgsImV4cCI6MjEwNjE4NzM4OH0.-aulP4K-qjcb1TLuZebe5jMmLsvObbNhavhLX9j-VuU"
};

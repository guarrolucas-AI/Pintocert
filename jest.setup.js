// jest.setup.js
// Mock environment variables for tests (server actions don't need jest-dom)
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-supabase.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

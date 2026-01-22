export const environment = {
  production: true,
  supabaseUrl: (window as any)['env']?.['NG_APP_SUPABASE_URL'] || '',
  supabaseKey: (window as any)['env']?.['NG_APP_SUPABASE_KEY'] || ''
};

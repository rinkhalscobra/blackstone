import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAILS = [
  'dominicrey@grouptk.demo',
  'benjaminbrown@grouptk.demo',
  'joshuafurber@grouptk.demo',
  'robertoberhauser@grouptk.demo',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const results: any[] = [];
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const email of EMAILS) {
    const u = list.data?.users.find((x) => x.email?.toLowerCase() === email);
    if (!u) { results.push({ email, status: 'not_found' }); continue; }
    await admin.from('user_roles').delete().eq('user_id', u.id);
    await admin.from('profiles').delete().eq('id', u.id);
    const { error } = await admin.auth.admin.deleteUser(u.id);
    results.push({ email, status: error ? `error: ${JSON.stringify(error)}` : 'deleted' });
  }
  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

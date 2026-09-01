import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { email, password } = await req.json();
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = list?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (!u) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { error } = await admin.auth.admin.updateUserById(u.id, { password, email_confirm: true });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, email, id: u.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'err' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

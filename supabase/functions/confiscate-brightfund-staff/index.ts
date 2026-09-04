import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GLOBAL_ADMIN_EMAIL = 'durdentylerdurden23@gmail.com';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';

function generatePassword(len = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is the global admin
    if ((user.email || '').toLowerCase() !== GLOBAL_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Only the global admin can perform this action' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleRow } = await admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (roleRow?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all BrightFund staff (group_admin, supervisor, agent) except global admin
    const { data: roleRows, error: roleErr } = await admin
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['group_admin', 'supervisor', 'agent']);
    if (roleErr) throw roleErr;
    const roleMap = new Map((roleRows ?? []).map((r) => [r.user_id, r.role]));
    const staffIds = Array.from(roleMap.keys());
    if (staffIds.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targets, error: targetErr } = await admin
      .from('profiles')
      .select('id, email, first_name, last_name, platform')
      .eq('platform', 'brightfund')
      .in('id', staffIds);
    if (targetErr) throw targetErr;

    const filtered = (targets ?? []).filter(
      (p) => (p.email || '').toLowerCase() !== GLOBAL_ADMIN_EMAIL
    );

    const results: Array<Record<string, unknown>> = [];
    for (const p of filtered) {
      const newPassword = generatePassword(16);
      const { error: updErr } = await admin.auth.admin.updateUserById(p.id, { password: newPassword });
      results.push({
        id: p.id,
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        role: roleMap.get(p.id) ?? 'unknown',
        new_password: updErr ? '' : newPassword,
        status: updErr ? 'error' : 'ok',
        error: updErr?.message,
      });
    }

    console.log(`[confiscate-brightfund-staff] Reset ${results.filter(r => r.status === 'ok').length}/${results.length} accounts by ${user.email}`);

    return new Response(JSON.stringify({ results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('confiscate-brightfund-staff error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

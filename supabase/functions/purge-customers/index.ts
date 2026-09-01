import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to clean before deleting auth user.
// Each entry: [table, column-name(s) referencing the user]
const CLEANUP: Array<[string, string[]]> = [
  ['customer_balances', ['customer_id', 'updated_by']],
  ['customer_notes', ['customer_id', 'created_by']],
  ['case_timeline', ['customer_id', 'created_by']],
  ['transaction_requests', ['customer_id', 'processed_by']],
  ['portfolio_items', ['customer_id', 'created_by']],
  ['watchlist_items', ['user_id']],
  ['notifications', ['user_id', 'sender_id']],
  ['messages', ['sender_id', 'recipient_id']],
  ['password_reset_requests', ['user_id', 'requested_by', 'approved_by']],
  ['user_mfa', ['user_id']],
  ['user_sessions', ['user_id']],
  ['ip_validation_logs', ['user_id']],
  ['user_roles', ['user_id']],
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { batch_size = 25, dry_run = false, group_id = null, ids = null } = await req.json().catch(() => ({}));
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let targets: { id: string; email: string | null }[] = [];

    if (Array.isArray(ids) && ids.length > 0) {
      const { data, error } = await admin.from('profiles').select('id, email').in('id', ids);
      if (error) throw error;
      targets = data ?? [];
    } else {
      let q = admin.from('profiles').select('id, email');
      if (group_id) q = q.eq('group_id', group_id);
      const { data: profiles, error: pErr } = await q;
      if (pErr) throw pErr;
      const { data: roles, error: rErr } = await admin.from('user_roles').select('user_id, role');
      if (rErr) throw rErr;
      const staffRoles = new Set(['admin', 'group_admin', 'supervisor', 'agent']);
      const staffIds = new Set((roles ?? []).filter(r => staffRoles.has(r.role)).map(r => r.user_id));
      targets = (profiles ?? []).filter(p => !staffIds.has(p.id));
    }

    if (dry_run) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, count: targets.length, sample: targets.slice(0, 10) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const slice = targets.slice(0, batch_size);
    const targetIds = slice.map(t => t.id);

    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, done: true, deleted: 0, remaining: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let deletedAuth = 0;
    const errors: any[] = [];

    // 1. Clean dependent tables in bulk
    for (const [table, cols] of CLEANUP) {
      for (const col of cols) {
        const { error } = await admin.from(table).delete().in(col, targetIds);
        if (error && !/column .* does not exist|relation .* does not exist/i.test(error.message)) {
          errors.push({ table, col, msg: error.message });
        }
      }
    }

    // 2. Delete profile rows
    const { error: profDel } = await admin.from('profiles').delete().in('id', targetIds);
    if (profDel) errors.push({ table: 'profiles', msg: profDel.message });

    // 3. Delete from auth one-by-one
    for (const id of targetIds) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) errors.push({ auth_id: id, msg: error.message });
      else deletedAuth++;
    }

    return new Response(JSON.stringify({
      ok: true,
      processed: targetIds.length,
      deletedAuth,
      remaining: targets.length - targetIds.length,
      errors: errors.slice(0, 20),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'err' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

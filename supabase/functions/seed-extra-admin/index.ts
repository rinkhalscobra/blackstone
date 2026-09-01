import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { email, password, first_name = 'Global', last_name = 'Admin' } = await req.json();
    if (!email || !password) throw new Error('email and password required');

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let userId = list.data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;

    if (userId) {
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, platform: 'blackstone' },
      });
      if (error) throw error;
      userId = data.user.id;
    }

    await admin.from('profiles').update({
      first_name,
      last_name,
      is_super: true,
      is_archived: false,
      status: 'active',
      platform: 'blackstone',
    }).eq('id', userId);

    await admin.from('user_roles').delete().eq('user_id', userId);
    const { error: rErr } = await admin.from('user_roles').insert({ user_id: userId, role: 'admin' });
    if (rErr) throw rErr;

    return new Response(JSON.stringify({ ok: true, email, password, id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'err' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

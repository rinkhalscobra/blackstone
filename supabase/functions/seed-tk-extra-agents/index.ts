import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PASSWORD = 'GroupTK!2026Demo';
const PLATFORM = 'tk';
const GROUP_NAME = 'GROUP TK';

const agents = [
  { first: 'James', last: 'Blake' },
  { first: 'Tony', last: 'Jones' },
  { first: 'John', last: 'White' },
  { first: 'Tony', last: 'Gregor' },
  { first: 'Alex', last: 'Nowak' },
  { first: 'Tomas', last: 'Schnider' },
  { first: 'Benjamin', last: 'Brown' },
  { first: 'Joshua', last: 'Furber' },
  { first: 'Dominic', last: 'Rey' },
  { first: 'Alex', last: 'Manson' },
  { first: 'David', last: 'White' },
  { first: 'Roger', last: 'Mayer' },
  { first: 'Jordan', last: 'Sidwell' },
  { first: 'Harvey', last: 'Ginnley' },
  { first: 'Jeffrey', last: 'Harris' },
  { first: 'Robert', last: 'Oberhauser' },
  { first: 'Maximilian', last: 'Doebler' },
  { first: 'Robert', last: 'Scanlan' },
  { first: 'Dominic', last: 'Allan' },
  { first: 'Olivia', last: 'Rowell' },
  { first: 'Michelle Sylvia', last: 'Rodrigues' },
  { first: 'Mathias', last: 'Koch' },
  { first: 'Marvin', last: 'Isenov' },
  { first: 'Jason', last: 'Cook' },
  { first: 'Julia', last: 'Weiss' },
  { first: 'Martin', last: 'Wuttenberg' },
  { first: 'Kristine', last: 'Clark' },
  { first: 'Gabriel', last: 'Forca' },
  { first: 'Melisa', last: 'Brown' },
  { first: 'Jamed', last: 'Scott' },
  { first: 'Andy', last: 'Rogers' },
  { first: 'Roger', last: 'Rossini' },
  { first: 'Andrea', last: 'Shaper' },
  { first: 'Gabriel', last: 'Kadasi' },
  { first: 'Johny', last: 'Shirley' },
  { first: 'Jason', last: 'Andino' },
  { first: 'James', last: 'Morgan' },
  { first: 'Steven', last: 'Larsson' },
  { first: 'Anthony', last: 'Miller' },
  { first: 'Jacob', last: 'Bojan' },
  { first: 'Stephen', last: 'Valmas' },
  { first: 'Tommy', last: 'Kane' },
  { first: 'Antonio', last: 'Polverino' },
  { first: 'Iris', last: 'Henderson' },
  { first: 'Sebastian', last: 'John' },
  { first: 'Stephanie', last: 'Maison' },
  { first: 'Sarah', last: 'Parker' },
  { first: 'Lucas', last: 'Rossi' },
  { first: 'Robin', last: 'Clarsen' },
  { first: 'Adam', last: 'Beck' },
  { first: 'Steven', last: 'Larsen' },
];


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: group, error: gErr } = await admin
      .from('groups').select('id').eq('name', GROUP_NAME).maybeSingle();
    if (gErr || !group) throw new Error('GROUP TK not found');
    const groupId = group.id;

    // List existing users once
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingByEmail = new Map<string, string>();
    for (const u of list.data?.users ?? []) {
      if (u.email) existingByEmail.set(u.email.toLowerCase(), u.id);
    }

    const results: any[] = [];

    for (const a of agents) {
      const email = `${a.first.toLowerCase().replace(/\s+/g, '')}${a.last.toLowerCase().replace(/\s+/g, '')}@grouptk.demo`;
      let userId = existingByEmail.get(email);
      if (userId) {
        await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { first_name: a.first, last_name: a.last, platform: PLATFORM },
        });
        if (error) throw new Error(`create ${email}: ${error.message}`);
        userId = data.user.id;
      }

      await admin.from('profiles').update({
        group_id: groupId,
        platform: PLATFORM,
        first_name: a.first,
        last_name: a.last,
        is_archived: false,
        status: 'active',
      }).eq('id', userId);

      await admin.from('user_roles').delete().eq('user_id', userId);
      const { error: rErr } = await admin.from('user_roles').insert({ user_id: userId, role: 'agent' });
      if (rErr) throw new Error(`role ${email}: ${rErr.message}`);

      results.push({ email, name: `${a.first} ${a.last}`, password: PASSWORD });
    }

    return new Response(JSON.stringify({ ok: true, group: GROUP_NAME, count: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'err' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

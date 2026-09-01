import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PASSWORD = 'GroupTK!2026Demo';
const PLATFORM = 'tk';
const GROUP_NAME = 'GROUP TK';

const staff = [
  { email: 'groupadmin@grouptk.demo', first: 'Thomas', last: 'Keller', role: 'group_admin' },
  { email: 'supervisor@grouptk.demo', first: 'Sophia', last: 'Lambert', role: 'supervisor' },
  { email: 'agent1@grouptk.demo', first: 'Lucas', last: 'Becker', role: 'agent' },
  { email: 'agent2@grouptk.demo', first: 'Camille', last: 'Moreau', role: 'agent' },
  { email: 'agent3@grouptk.demo', first: 'Mateo', last: 'Rossi', role: 'agent' },
];

const customers = [
  { email: 'client1@grouptk.demo', first: 'Anna', last: 'Schmidt', case_phase: 'submitted' },
  { email: 'client2@grouptk.demo', first: 'Pierre', last: 'Dubois', case_phase: 'investigation' },
  { email: 'client3@grouptk.demo', first: 'Marco', last: 'Bianchi', case_phase: 'recovery' },
  { email: 'client4@grouptk.demo', first: 'Elena', last: 'Fischer', case_phase: 'negotiation' },
  { email: 'client5@grouptk.demo', first: 'Julien', last: 'Laurent', case_phase: 'completed' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get or create group
    let groupId: string;
    const { data: existing } = await admin.from('groups').select('id').eq('name', GROUP_NAME).maybeSingle();
    if (existing) {
      groupId = existing.id;
    } else {
      const { data: g, error } = await admin.from('groups').insert({ name: GROUP_NAME }).select('id').single();
      if (error) throw new Error('group: ' + error.message);
      groupId = g.id;
    }

    const results: any[] = [];

    const createUser = async (u: { email: string; first: string; last: string }) => {
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list.data?.users?.find(x => x.email?.toLowerCase() === u.email.toLowerCase());
      if (found) {
        await admin.auth.admin.updateUserById(found.id, { password: PASSWORD, email_confirm: true });
        return found.id;
      }
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: u.first, last_name: u.last },
      });
      if (error) throw new Error(`create ${u.email}: ${error.message}`);
      return data.user.id;
    };

    // Staff
    let groupAdminId = '';
    let supervisorId = '';
    const agentIds: string[] = [];
    for (const s of staff) {
      const id = await createUser(s);
      await admin.from('profiles').update({
        group_id: groupId,
        platform: PLATFORM,
        first_name: s.first,
        last_name: s.last,
        is_archived: false,
        status: 'active',
      }).eq('id', id);
      await admin.from('user_roles').delete().eq('user_id', id);
      await admin.from('user_roles').insert({ user_id: id, role: s.role });
      if (s.role === 'group_admin') groupAdminId = id;
      if (s.role === 'supervisor') supervisorId = id;
      if (s.role === 'agent') agentIds.push(id);
      results.push({ email: s.email, role: s.role, password: PASSWORD });
    }

    // Customers
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      const id = await createUser(c);
      const agentId = agentIds[i % agentIds.length];
      await admin.from('profiles').update({
        group_id: groupId,
        platform: PLATFORM,
        first_name: c.first,
        last_name: c.last,
        case_phase: c.case_phase,
        case_number: `TK-${String(1001 + i)}`,
        assigned_to: agentId,
        is_archived: false,
        status: 'active',
        subscription: 'BASIC',
      }).eq('id', id);
      // Make sure no staff role
      await admin.from('user_roles').delete().eq('user_id', id);
      results.push({ email: c.email, role: 'customer', password: PASSWORD, case_number: `TK-${1001 + i}` });
    }

    return new Response(JSON.stringify({ ok: true, groupId, group: GROUP_NAME, platform: PLATFORM, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'err' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZyraUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'group_admin' | 'supervisor' | 'agent';
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 14; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const zyraUsers: ZyraUser[] = [
  { email: 'groupadmin_zyra1@zyra.com', password: generatePassword(), firstName: 'Marcus', lastName: 'Chen', role: 'group_admin' },
  { email: 'supervisor_zyra1@zyra.com', password: generatePassword(), firstName: 'Elena', lastName: 'Rodriguez', role: 'supervisor' },
  { email: 'agent1_zyra1@zyra.com', password: generatePassword(), firstName: 'James', lastName: 'Wilson', role: 'agent' },
  { email: 'agent2_zyra1@zyra.com', password: generatePassword(), firstName: 'Sarah', lastName: 'Thompson', role: 'agent' },
  { email: 'agent3_zyra1@zyra.com', password: generatePassword(), firstName: 'Michael', lastName: 'Brown', role: 'agent' },
  { email: 'agent4_zyra1@zyra.com', password: generatePassword(), firstName: 'Emily', lastName: 'Davis', role: 'agent' },
  { email: 'agent5_zyra1@zyra.com', password: generatePassword(), firstName: 'David', lastName: 'Martinez', role: 'agent' },
  { email: 'agent6_zyra1@zyra.com', password: generatePassword(), firstName: 'Jessica', lastName: 'Garcia', role: 'agent' },
  { email: 'agent7_zyra1@zyra.com', password: generatePassword(), firstName: 'Daniel', lastName: 'Anderson', role: 'agent' },
  { email: 'agent8_zyra1@zyra.com', password: generatePassword(), firstName: 'Ashley', lastName: 'Taylor', role: 'agent' },
  { email: 'agent9_zyra1@zyra.com', password: generatePassword(), firstName: 'Christopher', lastName: 'Moore', role: 'agent' },
  { email: 'agent10_zyra1@zyra.com', password: generatePassword(), firstName: 'Amanda', lastName: 'Jackson', role: 'agent' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create or get the Zyra 1 group
    let groupId: string;
    const { data: existingGroup } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('name', 'Zyra 1')
      .single();

    if (existingGroup) {
      groupId = existingGroup.id;
      console.log('Using existing Zyra 1 group:', groupId);
    } else {
      const { data: newGroup, error: groupError } = await supabaseAdmin
        .from('groups')
        .insert({ name: 'Zyra 1' })
        .select('id')
        .single();

      if (groupError) throw new Error(`Failed to create group: ${groupError.message}`);
      groupId = newGroup.id;
      console.log('Created new Zyra 1 group:', groupId);
    }

    const results: { email: string; password: string; role: string; success: boolean; error?: string }[] = [];

    for (const user of zyraUsers) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === user.email);

        if (existingUser) {
          results.push({ email: user.email, password: '(already exists)', role: user.role, success: false, error: 'User already exists' });
          continue;
        }

        // Create user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: { first_name: user.firstName, last_name: user.lastName }
        });

        if (authError) throw authError;

        const userId = authData.user.id;

        // Update profile with group_id
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            group_id: groupId,
            first_name: user.firstName,
            last_name: user.lastName
          })
          .eq('id', userId);

        if (profileError) console.error('Profile update error:', profileError);

        // Insert role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role: user.role });

        if (roleError) console.error('Role insert error:', roleError);

        results.push({ email: user.email, password: user.password, role: user.role, success: true });
        console.log(`Created user: ${user.email} as ${user.role}`);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to create ${user.email}:`, error);
        results.push({ email: user.email, password: user.password, role: user.role, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Zyra 1 group seeded: ${successCount} created, ${failedCount} failed/skipped`,
        groupId,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

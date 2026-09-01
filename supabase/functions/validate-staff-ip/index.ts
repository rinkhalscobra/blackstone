import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogEntry {
  user_id: string | null;
  email: string | null;
  ipv4_address: string | null;
  ipv6_address: string | null;
  user_agent: string | null;
  action: 'ALLOWED' | 'DENIED' | 'ERROR';
  reason: string;
  matched_rule_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Helper function to log validation attempt
  const logValidation = async (entry: LogEntry) => {
    try {
      await supabase.from('ip_validation_logs').insert(entry);
    } catch (err) {
      console.error('Failed to log IP validation:', err);
    }
  };

  try {
    const { user_id, client_ip, client_ipv4, client_ipv6, user_agent, email } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ allowed: true, reason: 'No user ID provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect all IPs to check (both IPv4 and IPv6 if available)
    const ipsToCheck: string[] = [];
    if (client_ipv4) ipsToCheck.push(client_ipv4);
    if (client_ipv6) ipsToCheck.push(client_ipv6);
    if (client_ip && !ipsToCheck.includes(client_ip)) ipsToCheck.push(client_ip);

    console.log(`Validating IP for user: ${user_id}, IPs: ${ipsToCheck.join(', ')}`);

    // Check if user has a staff role (admin, group_admin, supervisor, agent)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .maybeSingle();

    if (roleError) {
      console.error('Error fetching role:', roleError);
      await logValidation({
        user_id,
        email: email || null,
        ipv4_address: client_ipv4 || null,
        ipv6_address: client_ipv6 || null,
        user_agent: user_agent || null,
        action: 'ERROR',
        reason: 'Error fetching role',
        matched_rule_id: null,
      });
      return new Response(
        JSON.stringify({ allowed: true, reason: 'Error fetching role, allowing access' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no role (regular user/client), allow access - no IP restrictions (don't log regular users)
    if (!roleData) {
      console.log('User has no staff role, allowing access');
      return new Response(
        JSON.stringify({ allowed: true, reason: 'Not a staff member' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const staffRoles = ['admin', 'group_admin', 'supervisor', 'agent'];
    if (!staffRoles.includes(roleData.role)) {
      console.log('User role is not staff, allowing access');
      return new Response(
        JSON.stringify({ allowed: true, reason: 'Not a staff role' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User is staff with role: ${roleData.role}`);

    // Allow demo accounts to bypass IP validation
    const demoEmails = ['admin@demo.com', 'supervisor@demo.com', 'agent@demo.com', 'office@demo.com'];
    const lowerEmail = (email || '').toLowerCase();
    const isDemoDomain =
      lowerEmail.endsWith('@grouptk.demo') ||
      lowerEmail.endsWith('.demo') ||
      lowerEmail.endsWith('@demo.com');
    if (lowerEmail && (demoEmails.includes(lowerEmail) || isDemoDomain)) {
      console.log(`Demo account ${email} - bypassing IP validation`);
      return new Response(
        JSON.stringify({ allowed: true, reason: 'Demo account - IP validation bypassed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile for group and email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('group_id, email')
      .eq('id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      await logValidation({
        user_id,
        email: email || null,
        ipv4_address: client_ipv4 || null,
        ipv6_address: client_ipv6 || null,
        user_agent: user_agent || null,
        action: 'ERROR',
        reason: 'Error fetching profile',
        matched_rule_id: null,
      });
      return new Response(
        JSON.stringify({ allowed: true, reason: 'Error fetching profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = email || profile?.email || null;

    // TK group is exempt from IP whitelist entirely
    const TK_GROUP_ID = '087f55d1-6f79-4603-9705-b0c21dc10ec1';
    if (profile?.group_id === TK_GROUP_ID) {
      console.log('TK group member - bypassing IP validation');
      return new Response(
        JSON.stringify({ allowed: true, reason: 'TK group - IP validation disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch global IP whitelist rules (group_id is NULL - applies to all staff)
    const { data: globalRules, error: globalRulesError } = await supabase
      .from('ip_whitelist')
      .select('*')
      .is('group_id', null);

    if (globalRulesError) {
      console.error('Error fetching global IP rules:', globalRulesError);
    }

    // Fetch group-specific IP whitelist rules (if user has a group)
    let groupRules: any[] = [];
    if (profile?.group_id) {
      const { data: grpRules, error: grpRulesError } = await supabase
        .from('ip_whitelist')
        .select('*')
        .eq('group_id', profile.group_id);

      if (grpRulesError) {
        console.error('Error fetching group IP rules:', grpRulesError);
      } else {
        groupRules = grpRules || [];
      }
    }

    // Combine global and group-specific rules
    const rules = [...(globalRules || []), ...groupRules];

    // If no rules exist, allow access (no restrictions configured)
    if (rules.length === 0) {
      console.log('No IP rules configured (global or group), allowing access');
      await logValidation({
        user_id,
        email: userEmail,
        ipv4_address: client_ipv4 || null,
        ipv6_address: client_ipv6 || null,
        user_agent: user_agent || null,
        action: 'ALLOWED',
        reason: 'No IP rules configured',
        matched_rule_id: null,
      });
      return new Response(
        JSON.stringify({ allowed: true, reason: 'No IP rules configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${rules.length} IP rules for group`);

    // Check if client IP matches any rule
    // Filter rules that apply to this user (STAFF applies to all, SPECIFIC_USER must match user_id)
    const applicableRules = rules.filter(rule => {
      if (rule.subject === 'STAFF' || rule.subject === 'EVERYONE') return true;
      if (rule.subject === 'SPECIFIC_USER' && rule.user_id === user_id) return true;
      return false;
    });

    if (applicableRules.length === 0) {
      console.log('No applicable rules for this user, allowing access');
      await logValidation({
        user_id,
        email: userEmail,
        ipv4_address: client_ipv4 || null,
        ipv6_address: client_ipv6 || null,
        user_agent: user_agent || null,
        action: 'ALLOWED',
        reason: 'No applicable rules',
        matched_rule_id: null,
      });
      return new Response(
        JSON.stringify({ allowed: true, reason: 'No applicable rules' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for DENY rules first (they take precedence)
    const denyRules = applicableRules.filter(r => r.action === 'DENY');
    for (const ip of ipsToCheck) {
      for (const rule of denyRules) {
        if (matchIP(ip, rule.ip_address)) {
          console.log(`IP ${ip} matched DENY rule: ${rule.ip_address}`);
          await logValidation({
            user_id,
            email: userEmail,
            ipv4_address: client_ipv4 || null,
            ipv6_address: client_ipv6 || null,
            user_agent: user_agent || null,
            action: 'DENIED',
            reason: `IP ${ip} matched DENY rule: ${rule.ip_address}`,
            matched_rule_id: rule.id,
          });
          return new Response(
            JSON.stringify({ allowed: false, reason: 'IP address is explicitly denied' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Check ALLOW rules
    const allowRules = applicableRules.filter(r => r.action === 'ALLOW');
    
    // If there are ALLOW rules, at least one of the user's IPs must match
    if (allowRules.length > 0) {
      for (const ip of ipsToCheck) {
        for (const rule of allowRules) {
          if (matchIP(ip, rule.ip_address)) {
            console.log(`IP ${ip} matched ALLOW rule: ${rule.ip_address}`);
            await logValidation({
              user_id,
              email: userEmail,
              ipv4_address: client_ipv4 || null,
              ipv6_address: client_ipv6 || null,
              user_agent: user_agent || null,
              action: 'ALLOWED',
              reason: `IP ${ip} matched ALLOW rule: ${rule.ip_address}`,
              matched_rule_id: rule.id,
            });
            return new Response(
              JSON.stringify({ allowed: true, reason: 'IP address is allowed' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
      
      // No IP matched any ALLOW rule
      console.log(`None of the IPs (${ipsToCheck.join(', ')}) matched any ALLOW rule`);
      await logValidation({
        user_id,
        email: userEmail,
        ipv4_address: client_ipv4 || null,
        ipv6_address: client_ipv6 || null,
        user_agent: user_agent || null,
        action: 'DENIED',
        reason: `None of the IPs (${ipsToCheck.join(', ')}) matched any ALLOW rule`,
        matched_rule_id: null,
      });
      return new Response(
        JSON.stringify({ allowed: false, reason: 'IP address is not in the whitelist' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No ALLOW rules configured, allow by default
    await logValidation({
      user_id,
      email: userEmail,
      ipv4_address: client_ipv4 || null,
      ipv6_address: client_ipv6 || null,
      user_agent: user_agent || null,
      action: 'ALLOWED',
      reason: 'No ALLOW rules configured',
      matched_rule_id: null,
    });
    return new Response(
      JSON.stringify({ allowed: true, reason: 'No ALLOW rules configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-staff-ip:', error);
    return new Response(
      JSON.stringify({ allowed: true, reason: 'Error occurred, allowing access' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to match IP addresses (supports wildcard *)
function matchIP(clientIP: string, ruleIP: string): boolean {
  if (!clientIP) return false;
  if (ruleIP === '*') return true;
  
  // Exact match
  if (clientIP === ruleIP) return true;
  
  // CIDR-style wildcard matching (e.g., 192.168.1.*)
  if (ruleIP.includes('*')) {
    const pattern = ruleIP.replace(/\./g, '\\.').replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(clientIP);
  }
  
  return false;
}
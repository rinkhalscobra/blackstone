import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { requestId, action, newPassword } = await req.json();

    if (!requestId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing requestId or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "approve" or "reject"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check requester's role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    const requestingRole = roleData?.role;

    if (!['admin', 'group_admin', 'supervisor'].includes(requestingRole)) {
      return new Response(
        JSON.stringify({ error: 'Only Admins, Group Admins, and Supervisors can approve password resets' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the password reset request
    const { data: resetRequest, error: fetchError } = await supabaseAdmin
      .from('password_reset_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !resetRequest) {
      return new Response(
        JSON.stringify({ error: 'Password reset request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (resetRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'This request has already been processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify group access for non-admins
    if (requestingRole !== 'admin') {
      const { data: requestingProfile } = await supabaseAdmin
        .from('profiles')
        .select('group_id')
        .eq('id', requestingUser.id)
        .single();

      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('group_id')
        .eq('id', resetRequest.target_user_id)
        .single();

      if (requestingProfile?.group_id !== targetProfile?.group_id) {
        return new Response(
          JSON.stringify({ error: 'You can only approve requests for users in your group' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'approve') {
      // Use the provided new password or the stored one
      const passwordToUse = newPassword || resetRequest.new_password_hash;
      
      if (!passwordToUse) {
        return new Response(
          JSON.stringify({ error: 'No password provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reset the password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        resetRequest.target_user_id,
        { password: passwordToUse }
      );

      if (updateError) {
        console.error('Password reset error:', updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update the request status
    const { error: statusError } = await supabaseAdmin
      .from('password_reset_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        processed_by: requestingUser.id,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (statusError) {
      console.error('Status update error:', statusError);
      return new Response(
        JSON.stringify({ error: 'Failed to update request status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Password reset request ${requestId} ${action}d by ${requestingUser.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: action === 'approve' 
          ? 'Password has been reset successfully' 
          : 'Password reset request has been rejected'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in approve-password-reset:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authorization header to verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller's JWT and get their user ID
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller's role
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles ?? []).map((r: { role: string }) => r.role);
    const isAdmin = roles.includes("admin");
    const isGroupStaff = roles.includes("group_admin") || roles.includes("supervisor");

    if (!isAdmin && !isGroupStaff) {
      return new Response(JSON.stringify({ error: "Not allowed to delete users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent deleting yourself
    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group admins / supervisors may only delete clients inside their own group
    if (!isAdmin) {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("group_id")
        .eq("id", caller.id)
        .maybeSingle();

      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("group_id")
        .eq("id", userId)
        .maybeSingle();

      if (!callerProfile?.group_id || callerProfile.group_id !== targetProfile?.group_id) {
        return new Response(JSON.stringify({ error: "You can only delete users in your own group" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const targetRoleList = (targetRoles ?? []).map((r: { role: string }) => r.role);
      const isClient = targetRoleList.length === 0 || targetRoleList.every((r) => r === "user");

      if (!isClient) {
        return new Response(JSON.stringify({ error: "Only client accounts can be deleted" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    console.log(`Admin ${caller.id} attempting to delete user ${userId}`);

    // Delete all related records first (order matters due to potential foreign keys)
    const tablesToClean = [
      { table: "messages", column: "sender_id" },
      { table: "messages", column: "recipient_id" },
      { table: "notifications", column: "user_id" },
      { table: "transaction_requests", column: "customer_id" },
      { table: "customer_balances", column: "customer_id" },
      { table: "customer_notes", column: "customer_id" },
      { table: "case_timeline", column: "customer_id" },
      { table: "portfolio_items", column: "user_id" },
      { table: "watchlist_items", column: "user_id" },
      { table: "user_sessions", column: "user_id" },
      { table: "user_roles", column: "user_id" },
      { table: "ip_whitelist", column: "user_id" },
      { table: "ip_validation_logs", column: "user_id" },
      { table: "user_mfa", column: "user_id" },
      { table: "case_timeline", column: "created_by" },
      { table: "customer_notes", column: "created_by" },
      { table: "password_reset_requests", column: "target_user_id" },
      { table: "password_reset_requests", column: "requested_by" },

    ];

    for (const { table, column } of tablesToClean) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, userId);
      
      if (error) {
        console.log(`Note: Could not delete from ${table}.${column}: ${error.message}`);
        // Continue anyway - some tables might not have records for this user
      } else {
        console.log(`Cleaned ${table}.${column} for user ${userId}`);
      }
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.log(`Note: Could not delete profile: ${profileError.message}`);
    } else {
      console.log(`Deleted profile for user ${userId}`);
    }

    // Finally delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`User ${userId} deleted successfully by admin ${caller.id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

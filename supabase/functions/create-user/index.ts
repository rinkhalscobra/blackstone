import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getJwtSubject(token: string): string | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const claims = JSON.parse(atob(padded));
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) return null;
    return typeof claims.sub === "string" && claims.sub ? claims.sub : null;
  } catch (error) {
    console.error("JWT payload decode failed:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authorized
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token || token === "undefined" || token === "null") {
      throw new Error("Unauthorized");
    }

    // Supabase Edge Gateway verifies this token before the function runs.
    // Decode the already-verified JWT payload locally so staff tokens do not
    // fail on Supabase Auth session lookups (`AuthSessionMissingError`).
    const requestingUserId = getJwtSubject(token);
    if (!requestingUserId) {
      console.error("JWT subject missing or expired");
      throw new Error("Unauthorized");
    }
    const requestingUser = { id: requestingUserId };


    // Check if requesting user has permission (admin, supervisor, or agent)
    const [{ data: roleData, error: roleError }, { data: creatorProfile }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", requestingUser.id)
        .single(),
      supabaseAdmin
        .from("profiles")
        .select("platform")
        .eq("id", requestingUser.id)
        .single(),
    ]);

    if (roleError) {
      throw new Error("Could not verify user role");
    }

    const creatorPlatform = creatorProfile?.platform || "chargeback";
    const userRole = roleData?.role;
    const isAdmin = userRole === "admin";
    const isGroupAdmin = userRole === "group_admin";
    const isSupervisor = userRole === "supervisor";
    const isAgent = userRole === "agent";

    if (!isAdmin && !isGroupAdmin && !isSupervisor && !isAgent) {
      throw new Error("Only staff members can create users");
    }

    // Get request body
    const { email: rawEmail, password, firstName, lastName, role, groupId, createdBy, assignedTo } = await req.json();
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email || !password || !role || !groupId) {
      throw new Error("Missing required fields: email, password, role, groupId");
    }

    // Validate role permissions
    // Admins can create any role except admin through bulk
    // Group Admins can create supervisors, agents and users in their group (not admin or group_admin)
    // Supervisors can only create agents and users in their group
    // Agents can only create users assigned to themselves

    if (isAgent) {
      if (role !== "user") {
        throw new Error("Agents can only create client accounts");
      }
    } else if (isSupervisor) {
      if (!["agent", "user"].includes(role)) {
        throw new Error("Supervisors can only create agents or clients");
      }
      // Verify supervisor is in the same group
      const { data: supervisorProfile } = await supabaseAdmin
        .from("profiles")
        .select("group_id")
        .eq("id", requestingUser.id)
        .single();
      
      if (supervisorProfile?.group_id !== groupId) {
        throw new Error("Supervisors can only create users in their own group");
      }
    } else if (isGroupAdmin) {
      if (!["supervisor", "agent", "user"].includes(role)) {
        throw new Error("Group admins can only create supervisors, agents, or clients");
      }
      // Verify group admin is in the same group
      const { data: groupAdminProfile } = await supabaseAdmin
        .from("profiles")
        .select("group_id")
        .eq("id", requestingUser.id)
        .single();
      
      if (groupAdminProfile?.group_id !== groupId) {
        throw new Error("Group admins can only create users in their own group");
      }
    } else if (isAdmin) {
      if (!["group_admin", "supervisor", "agent", "user"].includes(role)) {
        throw new Error("Invalid role. Must be group_admin, supervisor, agent, or user");
      }
    }

    // Determine target platform from the group's tag (falls back to creator).
    let targetPlatform = creatorPlatform;
    const { data: targetGroup } = await supabaseAdmin
      .from("groups")
      .select("name, platform")
      .eq("id", groupId)
      .maybeSingle();
    if (targetGroup?.platform) {
      targetPlatform = targetGroup.platform;
    } else if (targetGroup?.name && /^zyra/i.test(targetGroup.name)) {
      targetPlatform = "exloss";
    }
    // Freeze legacy exloss: never create new clients on it — route to TK.
    if (role === "user" && targetPlatform === "exloss") {
      targetPlatform = "tk";
    }

    // Block duplicates within the same platform
    if (role === "user") {
      const { data: existingRows } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .eq("platform", targetPlatform)
        .limit(1);
      if (existingRows && existingRows.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "email_exists",
            error: "A user with this email already exists on this brand.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    console.log(`Creating user: ${email} role=${role} by=${userRole} platform=${targetPlatform}`);

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        platform: targetPlatform,
        display_email: email,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      if (
        createError.code === "email_exists" ||
        createError.message.toLowerCase().includes("already been registered")
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "email_exists",
            error: "A user with this email address already exists. Please use a different email.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      throw new Error(createError.message);
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    const userId = newUser.user.id;
    console.log(`User created with ID: ${userId}`);

    // Determine who the user should be assigned to
    let finalAssignedTo = assignedTo;
    if (isAgent && role === "user") {
      // Agents creating clients - auto-assign to themselves
      finalAssignedTo = requestingUser.id;
    }

    // Update the profile with group, created_by, and the RAW display email
    // (handle_new_user trigger stored the aliased auth email; we overwrite it).
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        group_id: groupId,
        created_by: createdBy || requestingUser.id,
        first_name: firstName,
        last_name: lastName,
        assigned_to: finalAssignedTo || null,
        platform: targetPlatform,
        email: email,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Don't throw, user is already created
    }

    // Create the user role (skip for regular users as they have no entry in user_roles)
    if (role !== "user") {
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role,
        });

      if (roleInsertError) {
        console.error("Error inserting role:", roleInsertError);
        throw new Error(`User created but failed to assign role: ${roleInsertError.message}`);
      }
    }

    console.log(`User ${email} created successfully with role ${role}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        email,
        role,
        platform: targetPlatform,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-user function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});

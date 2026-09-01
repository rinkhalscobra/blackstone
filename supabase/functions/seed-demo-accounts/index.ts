import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'supervisor' | 'agent' | 'user' | 'group_admin';
}

const demoUsers: DemoUser[] = [
  { email: "admin@demo.com", password: "Demo123!", firstName: "Demo", lastName: "Admin", role: "admin" },
  { email: "supervisor@demo.com", password: "Demo123!", firstName: "Demo", lastName: "Supervisor", role: "supervisor" },
  { email: "agent@demo.com", password: "Demo123!", firstName: "Demo", lastName: "Agent", role: "agent" },
  { email: "user@demo.com", password: "Demo123!", firstName: "Demo", lastName: "User", role: "user" },
  { email: "office@demo.com", password: "Demo123!", firstName: "Demo", lastName: "Office", role: "group_admin" as any },
];

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

    console.log("Starting demo accounts creation...");

    // First, create a demo group for the users
    let groupId: string;
    
    // Check if demo group exists
    const { data: existingGroup } = await supabaseAdmin
      .from("groups")
      .select("id")
      .eq("name", "Demo Group")
      .single();

    if (existingGroup) {
      groupId = existingGroup.id;
      console.log("Using existing Demo Group:", groupId);
    } else {
      // Create demo group
      const { data: newGroup, error: groupError } = await supabaseAdmin
        .from("groups")
        .insert({ name: "Demo Group", description: "Demo group for testing" })
        .select()
        .single();

      if (groupError) {
        console.error("Error creating group:", groupError);
        throw new Error(`Failed to create demo group: ${groupError.message}`);
      }
      groupId = newGroup.id;
      console.log("Created Demo Group:", groupId);
    }

    const results: Array<{ email: string; role: string; status: string; error?: string }> = [];

    for (const demoUser of demoUsers) {
      try {
        console.log(`Creating user: ${demoUser.email} with role: ${demoUser.role}`);

        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === demoUser.email);

        if (existingUser) {
          console.log(`User ${demoUser.email} already exists, skipping...`);
          results.push({ 
            email: demoUser.email, 
            role: demoUser.role, 
            status: "skipped", 
            error: "User already exists" 
          });
          continue;
        }

        // Create the user with admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: demoUser.email,
          password: demoUser.password,
          email_confirm: true,
          user_metadata: {
            first_name: demoUser.firstName,
            last_name: demoUser.lastName,
          },
        });

        if (createError) {
          console.error(`Error creating user ${demoUser.email}:`, createError);
          results.push({ 
            email: demoUser.email, 
            role: demoUser.role, 
            status: "failed", 
            error: createError.message 
          });
          continue;
        }

        if (!newUser.user) {
          results.push({ 
            email: demoUser.email, 
            role: demoUser.role, 
            status: "failed", 
            error: "No user returned" 
          });
          continue;
        }

        const userId = newUser.user.id;
        console.log(`User created with ID: ${userId}`);

        // Update the profile with group
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            group_id: groupId,
            first_name: demoUser.firstName,
            last_name: demoUser.lastName,
          })
          .eq("id", userId);

        if (profileError) {
          console.error(`Error updating profile for ${demoUser.email}:`, profileError);
        }

        // Create the user role
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: userId,
            role: demoUser.role,
          });

        if (roleInsertError) {
          console.error(`Error inserting role for ${demoUser.email}:`, roleInsertError);
          results.push({ 
            email: demoUser.email, 
            role: demoUser.role, 
            status: "partial", 
            error: `User created but role assignment failed: ${roleInsertError.message}` 
          });
          continue;
        }

        console.log(`User ${demoUser.email} created successfully with role ${demoUser.role}`);
        results.push({ 
          email: demoUser.email, 
          role: demoUser.role, 
          status: "success" 
        });

      } catch (userError: unknown) {
        const errorMsg = userError instanceof Error ? userError.message : "Unknown error";
        console.error(`Error processing user ${demoUser.email}:`, errorMsg);
        results.push({ 
          email: demoUser.email, 
          role: demoUser.role, 
          status: "failed", 
          error: errorMsg 
        });
      }
    }

    const successCount = results.filter(r => r.status === "success").length;
    const skippedCount = results.filter(r => r.status === "skipped").length;
    const failedCount = results.filter(r => r.status === "failed" || r.status === "partial").length;

    console.log(`Demo accounts creation complete: ${successCount} created, ${skippedCount} skipped, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Demo accounts created: ${successCount} new, ${skippedCount} existing, ${failedCount} failed`,
        results: results.map(r => ({ email: r.email, role: r.role, status: r.status }))
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in seed-demo-accounts function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});

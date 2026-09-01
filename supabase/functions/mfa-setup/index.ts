import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TOTP implementation (RFC 6238)
function generateSecret(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    secret += chars[randomBytes[i] % chars.length];
  }
  return secret;
}

function base32Decode(encoded: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of encoded.toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

async function generateTOTP(secret: string, time?: number): Promise<string> {
  const timeStep = 30;
  const counter = Math.floor((time || Date.now() / 1000) / timeStep);
  
  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  
  const secretBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, counterBytes);
  const hmac = new Uint8Array(signature);
  
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = 
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
}

async function verifyTOTP(secret: string, token: string, window = 1): Promise<boolean> {
  const currentTime = Date.now() / 1000;
  const timeStep = 30;
  
  for (let i = -window; i <= window; i++) {
    const checkTime = currentTime + (i * timeStep);
    const expectedToken = await generateTOTP(secret, checkTime);
    if (expectedToken === token) {
      return true;
    }
  }
  return false;
}

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin or group_admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'group_admin')) {
      return new Response(JSON.stringify({ error: 'MFA is only available for admins' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, code } = await req.json();
    console.log(`MFA action: ${action} for user: ${user.id}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'setup') {
      // Generate new secret
      const secret = generateSecret(20);
      const backupCodes = generateBackupCodes(8);
      
      // Create OTP Auth URL for QR code
      const issuer = 'BlackStone Recovery';
      const accountName = user.email || user.id;
      const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      // Check if user already has MFA record
      const { data: existingMfa } = await supabaseAdmin
        .from('user_mfa')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingMfa?.is_enabled) {
        return new Response(JSON.stringify({ error: 'MFA is already enabled' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert MFA record (not yet enabled)
      const { error: upsertError } = await supabaseAdmin
        .from('user_mfa')
        .upsert({
          user_id: user.id,
          totp_secret: secret,
          backup_codes: backupCodes,
          is_enabled: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        throw upsertError;
      }

      console.log('MFA setup initiated for user:', user.id);

      return new Response(JSON.stringify({
        secret,
        otpAuthUrl,
        backupCodes,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      if (!code) {
        return new Response(JSON.stringify({ error: 'Code is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get the pending MFA secret
      const { data: mfaData, error: mfaError } = await supabaseAdmin
        .from('user_mfa')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (mfaError || !mfaData) {
        return new Response(JSON.stringify({ error: 'MFA setup not found. Please start setup again.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify the code
      const isValid = await verifyTOTP(mfaData.totp_secret, code);

      if (!isValid) {
        console.log('Invalid TOTP code for user:', user.id);
        return new Response(JSON.stringify({ error: 'Invalid code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Enable MFA
      const { error: updateError } = await supabaseAdmin
        .from('user_mfa')
        .update({
          is_enabled: true,
          verified_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('MFA enabled for user:', user.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'MFA has been enabled successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disable') {
      if (!code) {
        return new Response(JSON.stringify({ error: 'Code is required to disable MFA' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get MFA data
      const { data: mfaData, error: mfaError } = await supabaseAdmin
        .from('user_mfa')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (mfaError || !mfaData || !mfaData.is_enabled) {
        return new Response(JSON.stringify({ error: 'MFA is not enabled' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify code or backup code
      const isValidTOTP = await verifyTOTP(mfaData.totp_secret, code);
      const isValidBackup = mfaData.backup_codes?.includes(code);

      if (!isValidTOTP && !isValidBackup) {
        return new Response(JSON.stringify({ error: 'Invalid code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete MFA record
      const { error: deleteError } = await supabaseAdmin
        .from('user_mfa')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      console.log('MFA disabled for user:', user.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'MFA has been disabled',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'status') {
      const { data: mfaData } = await supabaseAdmin
        .from('user_mfa')
        .select('is_enabled, verified_at')
        .eq('user_id', user.id)
        .single();

      return new Response(JSON.stringify({
        isEnabled: mfaData?.is_enabled || false,
        verifiedAt: mfaData?.verified_at || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('MFA setup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TOTP verification implementation
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, code, email } = await req.json();
    
    console.log(`MFA validation attempt for user: ${userId || email}`);

    if (!code) {
      return new Response(JSON.stringify({ error: 'Code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!userId && !email) {
      return new Response(JSON.stringify({ error: 'User ID or email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user ID from email if provided
    let targetUserId = userId;
    if (!targetUserId && email) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) {
        console.error('User lookup error:', userError);
        throw userError;
      }
      const foundUser = userData.users.find(u => u.email === email);
      if (!foundUser) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetUserId = foundUser.id;
    }

    // Get MFA data
    const { data: mfaData, error: mfaError } = await supabaseAdmin
      .from('user_mfa')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (mfaError || !mfaData || !mfaData.is_enabled) {
      // MFA not required for this user
      return new Response(JSON.stringify({ 
        valid: true, 
        mfaRequired: false,
        message: 'MFA not enabled for this user' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if it's a backup code
    if (mfaData.backup_codes?.includes(code)) {
      // Remove used backup code
      const updatedCodes = mfaData.backup_codes.filter((c: string) => c !== code);
      await supabaseAdmin
        .from('user_mfa')
        .update({ backup_codes: updatedCodes })
        .eq('user_id', targetUserId);

      console.log('MFA validated with backup code for user:', targetUserId);

      return new Response(JSON.stringify({ 
        valid: true, 
        usedBackupCode: true,
        remainingBackupCodes: updatedCodes.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify TOTP code
    const isValid = await verifyTOTP(mfaData.totp_secret, code);

    if (!isValid) {
      console.log('Invalid MFA code for user:', targetUserId);
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Invalid code' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('MFA validated successfully for user:', targetUserId);

    return new Response(JSON.stringify({ 
      valid: true,
      message: 'MFA code verified successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('MFA validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
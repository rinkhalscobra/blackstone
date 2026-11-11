The global IP whitelist switch is under Admin → IP Whitelist. Only global admins
can change it. Turning it off bypasses both global and group IP rules without
deleting them. Turning it on uses the existing staff validation rules and exemptions
for new password sign-ins; existing sessions are not revoked.

Deployment order:

1. Apply `migrations/20261111120000_ip_whitelist_settings.sql` (`supabase db push`).
2. Redeploy the validator (`supabase functions deploy validate-staff-ip`).
3. Deploy the frontend.

The migration starts with enforcement off to preserve the previously unrestricted
staff sign-in behavior. The switch becomes available after the migration is applied.

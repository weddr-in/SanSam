import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, guestName } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Missing phone number' });
  }

  try {
    // Use a phone-derived email for Supabase (proxy pattern)
    const cleanPhone = phone.replace(/\D/g, '');
    const proxyEmail = `${cleanPhone}@phone.weddr.in`;

    // Look up user by email directly — avoids listing all users (O(n) at scale)
    // Supabase admin API doesn't have getUserByEmail, so we use a targeted list with filter
    let existingUser = null;

    // Try to create the user first — if they already exist, we'll get a specific error
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: proxyEmail,
      email_confirm: true,
      user_metadata: { guest_name: guestName || '', phone_number: phone },
    });

    if (createError) {
      // User already exists — look them up
      if (createError.message?.includes('already been registered') || createError.status === 422) {
        // Find the existing user using a targeted list
        const { data: users } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });
        // Since listUsers doesn't support email filter in all versions,
        // use the service role to query auth.users directly
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('email', proxyEmail)
          .single();

        // Fallback: use admin API if direct query doesn't work (different schema)
        if (userRow) {
          existingUser = { id: userRow.id };
        } else {
          // Last resort: list with the admin API
          const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 50 });
          existingUser = allUsers?.users?.find((u: any) => u.email === proxyEmail);
        }

        if (!existingUser) {
          return res.status(500).json({ error: 'User exists but could not be found' });
        }

        // Update guest name if provided
        if (guestName) {
          await supabase.auth.admin.updateUserById(existingUser.id, {
            user_metadata: { guest_name: guestName, phone_number: phone },
          });
        }
      } else {
        console.error('Supabase create user error:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
    }

    // Generate a magic link to establish a Supabase session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: proxyEmail,
    });

    if (linkError || !linkData) {
      console.error('Generate link error:', linkError);
      return res.status(500).json({ error: 'Failed to generate session' });
    }

    const hashedToken = linkData.properties?.hashed_token;

    if (!hashedToken) {
      console.error('No hashed_token in link data');
      return res.status(500).json({ error: 'Failed to generate session token' });
    }

    return res.status(200).json({
      email: proxyEmail,
      hashedToken,
    });
  } catch (err: any) {
    console.error('Phone login error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

import { createClient } from './supabase';

export async function signInWithMagicLink(email) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/callback`,
    },
  });
  if (error) {
    console.error('[auth] signInWithMagicLink error:', error.message);
    if (error.status === 429) {
      return { success: false, error: 'Too many requests. Please wait before trying again.' };
    }
  }
  return { success: true, error: null };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[auth] signOut error:', error.message);
    return { error: 'Failed to sign out. Please try again.' };
  }
  return { error: null };
}

export async function getSession() {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) { console.error('[auth] getSession error:', error.message); return null; }
  return session;
}

export async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    if (!error.message.includes('Auth session missing')) {
      console.error('[auth] getUser error:', error.message);
    }
    return null;
  }
  return user;
}

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

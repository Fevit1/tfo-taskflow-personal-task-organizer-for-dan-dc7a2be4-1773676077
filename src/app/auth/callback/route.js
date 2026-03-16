import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('[auth/callback] Supabase error:', error, errorDescription);
    return NextResponse.redirect(`${origin}/login?error=link_invalid`, { status: 302 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });
        });
      },
    },
  });

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('[auth/callback] exchangeCodeForSession error:', exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=link_invalid`, { status: 302 });
    }
    return NextResponse.redirect(`${origin}/tasks`, { status: 302 });
  }

  if (tokenHash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (verifyError) {
      console.error('[auth/callback] verifyOtp error:', verifyError.message);
      return NextResponse.redirect(`${origin}/login?error=link_invalid`, { status: 302 });
    }
    return NextResponse.redirect(`${origin}/tasks`, { status: 302 });
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalid`, { status: 302 });
}

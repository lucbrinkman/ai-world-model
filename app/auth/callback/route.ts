import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      // Clean URL - redirect without any query parameters
      const cleanNext = next.split('?')[0]

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${cleanNext}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${cleanNext}`)
      } else {
        return NextResponse.redirect(`${origin}${cleanNext}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

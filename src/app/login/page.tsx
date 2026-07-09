'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black">
      <form onSubmit={signIn} className="panel p-8 w-full max-w-sm flex flex-col gap-4 border-t-4 border-t-accent">
        <div className="flex flex-col items-center gap-2 mb-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.fitnessnation.au/cdn/shop/files/FN_logo.png?width=160"
            alt="Fitness Nation"
            className="w-20 h-20 object-contain"
          />
          <div className="font-display uppercase italic text-2xl text-white leading-tight">
            Fitness<span className="text-accent"> Nation</span>
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-[0.3em]">EOS Dashboard</div>
        </div>
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button className="btn" disabled={loading}><span>{loading ? 'Signing in…' : 'Sign in'}</span></button>
      </form>
    </div>
  );
}

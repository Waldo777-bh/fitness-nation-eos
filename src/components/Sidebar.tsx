'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/scorecard', label: 'Scorecard' },
  { href: '/rocks', label: 'Rocks' },
  { href: '/issues', label: 'Issues' },
  { href: '/todos', label: 'To-Dos' },
  { href: '/meeting', label: 'Meeting' },
  { href: '/weekly-update', label: 'Weekly Update' },
  { href: '/quarter-setup', label: 'Quarter Setup' },
  { href: '/history', label: 'History' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === '/login') return null;

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="w-60 shrink-0 border-r border-panelBorder bg-black p-4 flex flex-col gap-1 sticky top-0 h-screen">
      <div className="flex items-center gap-3 px-2 py-4 mb-3 border-b border-panelBorder">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.fitnessnation.au/cdn/shop/files/FN_logo.png?width=120"
          alt="Fitness Nation"
          className="w-12 h-12 object-contain"
        />
        <div>
          <div className="font-display uppercase italic text-white leading-tight text-lg">
            Fitness<span className="text-accent"> Nation</span>
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">EOS Dashboard</div>
        </div>
      </div>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={`nav-link ${pathname === l.href ? 'active' : ''}`}>
          {l.label}
        </Link>
      ))}
      <button onClick={signOut} className="nav-link mt-auto text-left">
        Sign out
      </button>
    </aside>
  );
}

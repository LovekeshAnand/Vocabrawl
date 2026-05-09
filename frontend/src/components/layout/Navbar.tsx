'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { 
  LucidePalette as Palette, 
  LucideTrophy as Trophy, 
  Info, 
  Home, 
  LogOut, 
  LucideSunMoon as SunMoon, 
  LucideSword as Sword, 
  LucideZap as Zap, 
  Gamepad2,
  ExternalLink
} from 'lucide-react';
import { GitHubIcon as Github } from '../ui/Icons';
import { useAuthStore } from '../../store/authStore';

export function Navbar() {
  const { user, logout, hydrate } = useAuthStore();
  const pathname = usePathname();
  useEffect(() => { 
    hydrate(); 
    const saved = localStorage.getItem('vb_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const gameLinks = [
    { href: '/lobbies', label: 'Scribbl', icon: <Palette size={18} /> },
    { href: '/gauntlet', label: 'Gauntlet', icon: <Zap size={18} /> },
    { href: '/arena', label: 'Arena', icon: <Sword size={18} />, private: true },
  ];

  const mainLinks = [
    { href: '/leaderboard', label: 'Ranks', icon: <Trophy size={18} /> },
    { href: '/about', label: 'Info', icon: <Info size={18} /> },
  ];

  return (
    <nav style={{ 
      position: 'sticky', top: 0, zIndex: 1000, 
      background: 'rgba(255, 255, 255, 0.85)', 
      backdropFilter: 'blur(16px)',
      borderBottom: '2.5px solid var(--wb-border)', 
      boxShadow: '0 4px 0 var(--wb-border)' 
    }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--wb-ink)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Gamepad2 size={22} />
            </div>
            <span className="font-hand" style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--wb-ink)' }}>VocaBrawl</span>
          </Link>

          <div style={{ display: 'flex', gap: 4, background: 'var(--wb-paper-alt)', padding: 4, borderRadius: 12, border: '1.5px solid var(--wb-border)' }}>
            {gameLinks.map((link) => (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <span className="font-hand" style={{ 
                  fontSize: '1.1rem', fontWeight: 700, padding: '8px 16px', borderRadius: 8, 
                  color: pathname === link.href ? 'white' : 'var(--wb-ink)', 
                  background: pathname === link.href ? 'var(--wb-blue)' : 'transparent', 
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                }}>
                  {link.icon}
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {mainLinks.map((link) => (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <span className="font-hand" style={{ 
                  fontSize: '1.2rem', fontWeight: 700, 
                  color: pathname === link.href ? 'var(--wb-blue)' : 'var(--wb-ink)',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}>
                  {link.icon}
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          <div style={{ width: 2, height: 24, background: 'var(--wb-border)', opacity: 0.5 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="https://github.com/LovekeshAnand/Vocabrawl" target="_blank" rel="noopener noreferrer" style={{ 
              color: 'var(--wb-ink)', transition: 'transform 0.2s' 
            }} className="hover-scale">
              <Github size={24} />
            </a>
            
            <button 
              className="wb-btn wb-btn-sm" 
              onClick={() => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('vb_theme', next);
              }}
              style={{ padding: '8px', background: 'transparent', boxShadow: 'none', border: 'none', color: 'var(--wb-ink)' }}
            >
              <SunMoon size={24} />
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="wb-btn wb-btn-sm wb-btn-indigo" onClick={logout} style={{ padding: '8px 16px', fontSize: '1rem' }}>
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link href="/login"><button className="wb-btn wb-btn-primary wb-btn-sm" style={{ padding: '8px 20px' }}>Join</button></Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

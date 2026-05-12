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
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitHubIcon as Github } from '../ui/Icons';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';

export function Navbar() {
  const { user, logout, hydrate } = useAuthStore();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => { 
    hydrate(); 
    const saved = localStorage.getItem('vb_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    // Close menu on route change
    setIsMenuOpen(false);
  }, [pathname]);

  const gameLinks = [
    { href: '/lobbies', label: 'SketchBrawl', icon: <Palette size={18} /> },
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
      backdropFilter: 'blur(16px)',
      borderBottom: '2.5px solid var(--wb-border)', 
      boxShadow: '0 4px 0 var(--wb-border)' 
    }} className="wb-nav">
      <div className="wb-nav-inner" style={{ maxWidth: 1600, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        
        <div className="wb-nav-left" style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="wb-nav-logo" style={{ width: 36, height: 36, background: 'var(--wb-ink)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--wb-paper)' }}>
              <Gamepad2 size={22} />
            </div>
            <span className="font-hand wb-nav-brand" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.4rem)', fontWeight: 900, color: 'var(--wb-ink)' }}>VocaBrawl</span>
          </Link>

          <div className="wb-nav-games" style={{ display: 'flex', gap: 4, background: 'var(--wb-paper-alt)', padding: 4, borderRadius: 12, border: '1.5px solid var(--wb-border)' }}>
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

        <div className="wb-nav-main" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div className="wb-nav-secondary" style={{ display: 'flex', gap: 12 }}>
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

          <div className="wb-nav-secondary" style={{ width: 2, height: 24, background: 'var(--wb-border)', opacity: 0.5 }} />

          <div className="wb-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              <div className="wb-nav-auth-item" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="wb-btn wb-btn-sm wb-btn-indigo" onClick={logout} style={{ padding: '8px 16px', fontSize: '1rem' }}>
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link href="/login" className="wb-nav-auth-item"><button className="wb-btn wb-btn-primary wb-btn-sm" style={{ padding: '8px 20px' }}>Join</button></Link>
            )}

            {/* Hamburger Toggle */}
            <button 
              className="wb-nav-toggle wb-btn wb-btn-sm" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ display: 'none', padding: 8, background: 'transparent', border: 'none', boxShadow: 'none', color: 'var(--wb-ink)' }}
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ 
              background: 'var(--wb-paper)', 
              borderBottom: '2.5px solid var(--wb-border)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="font-hand" style={{ fontSize: '0.9rem', color: 'var(--wb-ink-faint)', marginBottom: 4 }}>Games</p>
              {gameLinks.map(link => (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
                    background: pathname === link.href ? 'var(--wb-paper-alt)' : 'transparent',
                    border: '1.5px solid', borderColor: pathname === link.href ? 'var(--wb-border)' : 'transparent',
                    color: pathname === link.href ? 'var(--wb-blue)' : 'var(--wb-ink)',
                  }}>
                    {link.icon}
                    <span className="font-hand" style={{ fontSize: '1.3rem', fontWeight: 700 }}>{link.label}</span>
                  </div>
                </Link>
              ))}
              
              <hr style={{ border: 'none', borderTop: '1px dashed var(--wb-border)', margin: '8px 0' }} />
              
              <p className="font-hand" style={{ fontSize: '0.9rem', color: 'var(--wb-ink-faint)', marginBottom: 4 }}>Arena</p>
              {mainLinks.map(link => (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    color: pathname === link.href ? 'var(--wb-blue)' : 'var(--wb-ink)',
                  }}>
                    {link.icon}
                    <span className="font-hand" style={{ fontSize: '1.3rem', fontWeight: 700 }}>{link.label}</span>
                  </div>
                </Link>
              ))}

              <hr style={{ border: 'none', borderTop: '1px dashed var(--wb-border)', margin: '8px 0' }} />

              <div style={{ padding: '4px' }}>
                {user ? (
                  <button className="wb-btn wb-btn-indigo" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                ) : (
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <button className="wb-btn wb-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      Join VocaBrawl
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}


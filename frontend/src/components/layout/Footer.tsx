import Link from 'next/link';
import { 
  LucidePalette as Palette, 
  LucideTrophy as Trophy, 
  Info, 
  Home,
  ExternalLink
} from 'lucide-react';
import { GitHubIcon as Github, LinkedInIcon as Linkedin, PortfolioIcon } from '../ui/Icons';

export function Footer() {
  const currentYear = 2026;
  
  const siteLinks = [
    { href: '/', label: 'Home', icon: <Home size={14} /> },
    { href: '/lobbies', label: 'Scribbl', icon: <Palette size={14} /> },
    { href: '/leaderboard', label: 'Ranks', icon: <Trophy size={14} /> },
    { href: '/about', label: 'Info', icon: <Info size={14} /> },
  ];

  const socialLinks = [
    { href: 'https://github.com/LovekeshAnand', icon: <Github size={20} />, label: 'GitHub' },
    { href: 'https://www.linkedin.com/in/lovekesh-anand-443138318/', icon: <Linkedin size={20} />, label: 'LinkedIn' },
    { href: 'https://lovekeshanand.vercel.app/', icon: <PortfolioIcon size={20} />, label: 'Portfolio' },
  ];

  return (
    <footer style={{ 
      borderTop: '2.5px solid var(--wb-border)', 
      background: 'var(--wb-paper)', 
      padding: '60px 40px 40px', 
      marginTop: 'auto' 
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 60, marginBottom: 60 }}>
          
          {/* Brand Column */}
          <div>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, background: 'var(--wb-ink)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Palette size={20} />
              </div>
              <span className="font-hand" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--wb-ink)' }}>VocaBrawl</span>
            </Link>
            <p style={{ color: 'var(--wb-ink-light)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 300 }}>
              The ultimate competitive arena for word enthusiasts and artists alike. 
              Designed for speed, fun, and glory.
            </p>
          </div>

          {/* Links Column */}
          <div>
            <h4 className="font-hand" style={{ fontSize: '1.5rem', marginBottom: 24, color: 'var(--wb-ink)' }}>Explore</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {siteLinks.map(l => (
                <Link key={l.href} href={l.href} style={{ 
                  textDecoration: 'none', color: 'var(--wb-ink-light)', fontSize: '1rem',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.2s'
                }} className="hover-blue">
                  {l.icon} {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social Column */}
          <div>
            <h4 className="font-hand" style={{ fontSize: '1.5rem', marginBottom: 24, color: 'var(--wb-ink)' }}>Connect</h4>
            <div style={{ display: 'flex', gap: 16 }}>
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ 
                  width: 44, height: 44, borderRadius: '50%', background: 'white',
                  border: '2.5px solid var(--wb-border)', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: 'var(--wb-ink)', transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }} title={s.label}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

        </div>

        <div style={{ 
          borderTop: '2px dashed var(--wb-border)', 
          paddingTop: 30, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }}>
          <span className="font-hand" style={{ fontSize: '1.2rem', color: 'var(--wb-ink)' }}>
            VocaBrawl @{currentYear} — Made by <span style={{ color: 'var(--wb-blue)', fontWeight: 800 }}>Lovekesh Anand</span>
          </span>
          <span style={{ color: 'var(--wb-ink-faint)', fontSize: '0.9rem' }}>
            Built with ❤️ for word warriors everywhere.
          </span>
        </div>
      </div>
    </footer>
  );
}

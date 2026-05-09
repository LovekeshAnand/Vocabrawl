import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

export const metadata = { title: 'Leaderboard — VocaBrawl' };

async function getLeaderboard() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/leaderboard`, {
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return data.leaderboard ?? [];
  } catch { return []; }
}

const TIER_LABELS = [
  { min: 1800, label: '👑 Oracle',       color: 'var(--wb-purple)' },
  { min: 1600, label: '🔮 Grandmaster',  color: '#7C3AED' },
  { min: 1400, label: '💎 Sage',         color: 'var(--wb-blue)' },
  { min: 1200, label: '⚡ Lexicon',      color: '#EA580C' },
  { min: 1000, label: '🥇 Scholar',      color: 'var(--wb-correct)' },
  { min: 0,    label: '✏️ Scribe',       color: 'var(--wb-ink-light)' },
];

function getTier(elo: number) {
  return TIER_LABELS.find(t => elo >= t.min) ?? TIER_LABELS[TIER_LABELS.length - 1];
}

export default async function LeaderboardPage() {
  const board = await getLeaderboard();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main style={{ flex: 1, padding: '40px 24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <h1 className="font-hand" style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--wb-ink)', marginBottom: 8 }}>🏆 Global Leaderboard</h1>
        <p style={{ color: 'var(--wb-ink-light)', marginBottom: 32 }}>Top players ranked by ELO. Updated after every match.</p>

        {board.length === 0 ? (
          <div className="wb-card" style={{ padding: 40, textAlign: 'center' }}>
            <p className="font-hand" style={{ fontSize: '1.5rem', color: 'var(--wb-ink-faint)' }}>No matches played yet. Be the first! ⚔️</p>
          </div>
        ) : (
          <div className="wb-card" style={{ overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px', padding: '12px 24px', background: 'var(--wb-ink)', color: 'white' }}>
              {['#', 'Player', 'ELO', 'W/L'].map(h => (
                <span key={h} className="font-hand" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{h}</span>
              ))}
            </div>
            {board.map((player: { rank: number; username: string; elo: number; gamesWon: number; gamesPlayed: number }, i: number) => {
              const tier = getTier(player.elo);
              const isTop3 = i < 3;
              return (
                <div
                  key={player.username}
                  style={{
                    display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px',
                    padding: '14px 24px',
                    borderBottom: '1.5px solid var(--wb-grid)',
                    background: isTop3 ? (i === 0 ? '#FFFBEB' : i === 1 ? '#F5F5F5' : '#FFF7ED') : 'white',
                    transition: 'background 0.15s',
                  }}
                >
                  <span className="font-hand" style={{ fontSize: '1.4rem', fontWeight: 700, color: i === 0 ? '#F59E0B' : i === 1 ? '#6B7280' : i === 2 ? '#B45309' : 'var(--wb-ink-faint)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : player.rank}
                  </span>
                  <div>
                    <span className="font-hand" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--wb-ink)' }}>{player.username}</span>
                    <span style={{ marginLeft: 8, fontSize: '0.75rem', color: tier.color, fontWeight: 600 }}>{tier.label}</span>
                  </div>
                  <span className="font-hand" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--wb-blue)' }}>{player.elo}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--wb-ink-light)' }}>
                    {player.gamesWon}W / {player.gamesPlayed - player.gamesWon}L
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

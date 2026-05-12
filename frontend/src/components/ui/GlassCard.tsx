'use client';
import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  intensity?: 'low' | 'mid' | 'high';
}

export function GlassCard({ children, intensity = 'mid', style, ...props }: GlassCardProps) {
  const blur = intensity === 'low' ? 8 : intensity === 'mid' ? 16 : 24;
  const surface = intensity === 'high' ? 'var(--wb-surface-strong)' : 'var(--wb-surface)';

  return (
    <motion.div
      {...props}
      style={{
        background: surface,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        border: '1.5px solid var(--wb-border)',
        boxShadow: 'var(--shadow-md)',
        borderRadius: 12,
        ...style
      }}
    >
      {children}
    </motion.div>
  );
}

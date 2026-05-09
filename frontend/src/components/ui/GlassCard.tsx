'use client';
import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  intensity?: 'low' | 'mid' | 'high';
}

export function GlassCard({ children, intensity = 'mid', style, ...props }: GlassCardProps) {
  const blur = intensity === 'low' ? 8 : intensity === 'mid' ? 16 : 24;
  const opacity = intensity === 'low' ? 0.4 : intensity === 'mid' ? 0.6 : 0.8;

  return (
    <motion.div
      {...props}
      style={{
        background: `rgba(255, 255, 255, ${opacity})`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        border: '1.5px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        borderRadius: 16,
        ...style
      }}
    >
      {children}
    </motion.div>
  );
}

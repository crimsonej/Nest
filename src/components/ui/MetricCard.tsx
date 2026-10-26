'use client';

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent } from './Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  href?: string;
}

export function MetricCard({ title, value, icon, color, onClick, href }: MetricCardProps) {
  const colorClasses = {
    primary: 'bg-primary text-white shadow-md shadow-[var(--color-primary)]/25',
    success: 'bg-gradient-to-tr from-[var(--color-success)] to-[var(--color-success-light)] text-white shadow-md shadow-[var(--color-success)]/30',
    warning: 'bg-gradient-to-tr from-[var(--color-warning)] to-[var(--color-warning-light)] text-white shadow-md shadow-[var(--color-warning)]/30',
    danger: 'bg-gradient-to-tr from-[var(--color-danger)] to-[var(--color-danger-light)] text-white shadow-md shadow-[var(--color-danger)]/30',
  };

  const handleClick = () => {
    if (onClick) onClick();
  };

  const content = (
    <Card hover={Boolean(onClick || href)} className="group" onClick={handleClick}>
      <div className={`absolute top-0 inset-x-0 h-1 bg-${color === 'primary' ? 'primary' : color === 'success' ? 'var(--color-success)' : color === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)'} opacity-80 transition-opacity group-hover:opacity-100`} />
      <CardContent className="p-4 sm:p-6">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase leading-snug tracking-[0.1em] text-text-muted sm:text-[11px] sm:tracking-[0.16em]">{title}</p>
            <p className="mt-2 text-2xl font-black leading-none text-text-primary tracking-tight sm:text-4xl">{value}</p>
          </div>
          <div className={cn('shrink-0 rounded-xl p-2 sm:rounded-2xl sm:p-3', colorClasses[color])}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}
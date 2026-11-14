'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  href?: string;
}

const iconClasses = {
  primary: 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20',
  secondary: 'bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/20',
  success: 'bg-success/10 text-success ring-1 ring-inset ring-success/20',
  warning: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/25',
  danger: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/20',
};

const accentClasses = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export function MetricCard({ title, value, icon, color, onClick, href }: MetricCardProps) {
  const interactive = Boolean(onClick || href);

  const content = (
    <Card
      hover={interactive}
      className="group h-full"
      onClick={onClick}
      {...(onClick && !href
        ? {
            role: 'button',
            tabIndex: 0,
            onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            },
          }
        : {})}
    >
      <div className={cn('absolute top-0 inset-x-0 h-1 opacity-80 transition-opacity group-hover:opacity-100', accentClasses[color])} aria-hidden="true" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase leading-snug tracking-[0.1em] text-text-muted sm:text-[11px] sm:tracking-[0.16em]">{title}</p>
            <p className="mt-2 text-2xl font-black leading-none text-text-primary tracking-tight sm:text-4xl">{value}</p>
          </div>
          <div className={cn('shrink-0 rounded-xl p-2 sm:rounded-2xl sm:p-3', iconClasses[color])} aria-hidden="true">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        {content}
      </Link>
    );
  }

  return content;
}

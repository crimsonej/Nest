import React from 'react';
import { cn } from '@/lib/utils';

type ReportCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export const ReportCard: React.FC<ReportCardProps> = ({ title, children, className }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/30 bg-surface/80 p-5 shadow-lg transition-colors hover:border-primary/40',
        className
      )}
    >
      <h2 className="mb-3 text-lg font-semibold text-text-primary">{title}</h2>
      {children}
    </div>
  );
};

export default ReportCard;

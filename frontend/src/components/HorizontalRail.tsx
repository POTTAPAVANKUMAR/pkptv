import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalRailProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onViewAll?: () => void;
  children: React.ReactNode;
}

export const HorizontalRail: React.FC<HorizontalRailProps> = ({
  title,
  subtitle,
  icon,
  onViewAll,
  children,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -600 : 600;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section className="mb-10 relative group/rail">
      {/* Header Row */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-xl">{icon}</span>}
          <div>
            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors mr-2"
            >
              See all →
            </button>
          )}

          {/* Left Arrow */}
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full bg-slate-900/80 border border-white/10 hover:bg-slate-800 text-white shadow-lg transition-all"
            title="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full bg-slate-900/80 border border-white/10 hover:bg-slate-800 text-white shadow-lg transition-all"
            title="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
      >
        {children}
      </div>
    </section>
  );
};

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { StreamingProvider } from '../types';

interface ProviderBarProps {
  providers: StreamingProvider[];
}

export const ProviderBar: React.FC<ProviderBarProps> = ({ providers }) => {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between px-1 mb-3">
        <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <span>🚀</span> Streaming Hub & Connected Apps
        </h2>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Launch supported platforms directly
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {providers.map((p) => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${p.color} 0%, rgba(14, 18, 28, 0.9) 100%)`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{p.icon}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${p.accent}20`, color: p.accent }}
              >
                {p.badge}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">
                  {p.name}
                </h3>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-300/80 line-clamp-2 mt-1">
                {p.description}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

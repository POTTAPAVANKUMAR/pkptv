import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  RefreshCw,
  Share2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Channel } from '../types';
import { api } from '../services/api';

interface PlayerProps {
  channel: Channel;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  channel,
  onClose,
  onNext,
  onPrev,
  isFavorite,
  onToggleFavorite,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('pkp_tv_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState<boolean>(false);
  const [qualities, setQualities] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 = Auto
  const [copied, setCopied] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideControlsTimer = useRef<number | null>(null);

  // Determine stream URL (direct or proxied)
  const streamUrl = useProxy
    ? api.getProxiedStreamUrl(channel.stream_url)
    : channel.stream_url;

  // Initialize and attach HLS stream
  const setupStream = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);

    // Destroy existing Hls instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        const levels = data.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height,
          bitrate: lvl.bitrate,
        }));
        setQualities(levels);
        video.play().catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // If direct connection failed, auto-attempt with proxy
              if (!useProxy) {
                console.warn('Direct stream failed. Auto-switching to stream proxy...');
                setUseProxy(true);
              } else {
                setError('Failed to load stream (Server offline or invalid stream).');
                setIsLoading(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setError('Playback error encountered.');
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS support
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      });
      video.addEventListener('error', () => {
        if (!useProxy) {
          setUseProxy(true);
        } else {
          setError('Failed to load stream in native player.');
          setIsLoading(false);
        }
      });
    } else {
      setError('HLS playback is not supported by your browser.');
      setIsLoading(false);
    }
  }, [streamUrl, useProxy]);

  useEffect(() => {
    setupStream();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [setupStream]);

  // Handle Volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem('pkp_tv_volume', volume.toString());
  }, [volume, isMuted]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume((v) => Math.min(1, v + 0.1));
          setIsMuted(false);
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume((v) => Math.max(0, v - 0.1));
          break;
        case 'arrowright':
          if (onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case 'arrowleft':
          if (onPrev) {
            e.preventDefault();
            onPrev();
          }
          break;
        case 'escape':
          if (isFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onNext, onPrev, onClose]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  const handleQualityChange = (levelIndex: number) => {
    setSelectedQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  };

  const copyStreamUrl = () => {
    navigator.clipboard.writeText(channel.stream_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-surface-border group ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''
      }`}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <RefreshCw className="w-12 h-12 text-brand-primary animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-300">Connecting to {channel.name}...</p>
          <span className="text-xs text-slate-500 mt-1">
            {useProxy ? 'Using Raspberry Pi Stream Proxy' : 'Attempting direct stream'}
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-20 p-6 text-center">
          <AlertCircle className="w-14 h-14 text-rose-500 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Playback Error</h3>
          <p className="text-sm text-slate-300 max-w-md mb-6">{error}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setUseProxy(!useProxy);
                setupStream();
              }}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-hover text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {useProxy ? 'Try Direct Stream' : 'Switch to Stream Proxy'}
            </button>
            {onNext && (
              <button
                onClick={onNext}
                className="px-4 py-2 bg-surface hover:bg-surface-hover text-slate-200 rounded-lg font-medium text-sm transition-all"
              >
                Next Channel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Player Header Bar (Channel info & quick actions) */}
      <div
        className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="w-10 h-10 object-contain rounded-lg bg-surface/80 p-1 border border-surface-border"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-lg">
              {channel.country_flag || '📺'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white drop-shadow-md">{channel.name}</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/90 text-white tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-live-dot" />
                LIVE
              </span>
              {channel.quality && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10">
                  {channel.quality}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {channel.country_flag} {channel.country_name || channel.country} •{' '}
              {channel.categories.join(', ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Proxy status toggle */}
          <button
            onClick={() => setUseProxy(!useProxy)}
            title={useProxy ? 'Proxy Active (Bypassing CORS & Mixed Content)' : 'Direct Mode'}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              useProxy
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            {useProxy ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {useProxy ? 'Proxy ON' : 'Direct'}
          </button>

          {/* Copy Stream URL */}
          <button
            onClick={copyStreamUrl}
            title="Copy Stream URL"
            className="p-2 rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 transition-all text-xs flex items-center gap-1"
          >
            <Share2 className="w-4 h-4" />
            {copied && <span className="text-[10px] text-emerald-400">Copied!</span>}
          </button>

          {/* Favorite Toggle */}
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`p-2 rounded-lg transition-all ${
                isFavorite
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              ★
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 text-slate-300 hover:bg-rose-500/80 hover:text-white transition-all"
            title="Close Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Player Bottom Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Play / Next / Prev & Volume */}
        <div className="flex items-center gap-3">
          {onPrev && (
            <button
              onClick={onPrev}
              title="Previous Channel (Left Arrow)"
              className="p-2 rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="p-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>

          {onNext && (
            <button
              onClick={onNext}
              title="Next Channel (Right Arrow)"
              className="p-2 rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-2 ml-2 group/volume">
            <button
              onClick={() => setIsMuted(!isMuted)}
              title="Mute / Unmute (M)"
              className="p-2 text-slate-300 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-rose-400" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
          </div>
        </div>

        {/* Quality / PiP / Fullscreen */}
        <div className="flex items-center gap-2">
          {qualities.length > 0 && (
            <select
              value={selectedQuality}
              onChange={(e) => handleQualityChange(parseInt(e.target.value, 10))}
              className="bg-black/60 border border-white/20 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-primary"
            >
              <option value={-1}>Auto Quality</option>
              {qualities.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.height ? `${q.height}p` : `${Math.round(q.bitrate / 1000)}k`}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={togglePiP}
            title="Picture in Picture (P)"
            className="p-2 rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-all"
          >
            <PictureInPicture className="w-5 h-5" />
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            className="p-2 rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

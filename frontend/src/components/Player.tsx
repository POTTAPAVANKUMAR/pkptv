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
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Radio,
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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
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

  // Seeking & Timeshift State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [seekStart, setSeekStart] = useState<number>(0);
  const [seekEnd, setSeekEnd] = useState<number>(0);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const [isAtLiveEdge, setIsAtLiveEdge] = useState<boolean>(true);

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
    setCurrentTime(0);
    setDuration(0);

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

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        setIsLiveStream(data.details.live);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
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

  // Track playback time, seekable DVR buffer, and live edge
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const cur = video.currentTime;
      setCurrentTime(cur);

      if (video.seekable && video.seekable.length > 0) {
        const s = video.seekable.start(0);
        const e = video.seekable.end(video.seekable.length - 1);
        setSeekStart(s);
        setSeekEnd(e);
        // If within 5 seconds of the live edge, consider at live edge
        setIsAtLiveEdge(e - cur <= 6);
      } else if (Number.isFinite(video.duration) && video.duration > 0) {
        setSeekStart(0);
        setSeekEnd(video.duration);
        setIsAtLiveEdge(video.duration - cur <= 1);
      }
    };

    const handleDurationChange = () => {
      const dur = video.duration;
      if (Number.isFinite(dur)) {
        setDuration(dur);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, []);

  // Handle Volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem('pkp_tv_volume', volume.toString());
  }, [volume, isMuted]);

  // Backward 10s
  const seekBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    let target = video.currentTime - 10;
    if (video.seekable && video.seekable.length > 0) {
      target = Math.max(video.seekable.start(0), target);
    } else {
      target = Math.max(0, target);
    }
    video.currentTime = target;
  };

  // Forward 10s
  const seekForward = () => {
    const video = videoRef.current;
    if (!video) return;
    let target = video.currentTime + 10;
    if (video.seekable && video.seekable.length > 0) {
      target = Math.min(video.seekable.end(video.seekable.length - 1), target);
    } else if (Number.isFinite(video.duration)) {
      target = Math.min(video.duration, target);
    }
    video.currentTime = target;
  };

  // Jump to real-time live edge
  const jumpToLive = () => {
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current && hlsRef.current.liveSyncPosition) {
      video.currentTime = hlsRef.current.liveSyncPosition;
    } else if (video.seekable && video.seekable.length > 0) {
      video.currentTime = video.seekable.end(video.seekable.length - 1);
    }
    video.play().catch(() => {});
    setIsPlaying(true);
    setIsAtLiveEdge(true);
  };

  // Handle Timeline Scrubbing
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newPos = parseFloat(e.target.value);
    video.currentTime = newPos;
    setCurrentTime(newPos);
  };

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
        case 'l':
          e.preventDefault();
          jumpToLive();
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
        case 'arrowleft':
          // Backward 10s
          e.preventDefault();
          seekBackward();
          break;
        case 'arrowright':
          // Forward 10s
          e.preventDefault();
          seekForward();
          break;
        case '[':
        case 'pageup':
          // Previous Channel
          if (onPrev) {
            e.preventDefault();
            onPrev();
          }
          break;
        case ']':
        case 'pagedown':
          // Next Channel
          if (onNext) {
            e.preventDefault();
            onNext();
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
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
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
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
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

  // Calculate live timeshift offset if user is rewound in live stream
  const timeshiftOffsetSeconds = Math.max(0, Math.round(seekEnd - currentTime));

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group select-none ${
        isFullscreen ? 'rounded-none' : ''
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <RefreshCw className="w-12 h-12 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm font-semibold text-white tracking-wide">Connecting to stream...</p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md z-20 p-6 text-center">
          <AlertCircle className="w-14 h-14 text-rose-500 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Stream Error</h3>
          <p className="text-xs text-slate-300 max-w-md mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setUseProxy(!useProxy);
                setupStream();
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
            >
              Retry with {useProxy ? 'Direct' : 'Proxy'} Mode
            </button>
            <button
              onClick={setupStream}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
            >
              Reload Stream
            </button>
          </div>
        </div>
      )}

      {/* Top Header Overlay */}
      <div
        className={`absolute top-0 inset-x-0 p-4 md:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="w-10 h-10 object-contain rounded-lg bg-black/50 p-1 border border-white/10"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-lg">
              {channel.country_flag || '📺'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-bold text-white drop-shadow-md">
                {channel.name}
              </h2>

              {/* Dynamic Live / Timeshift Badge */}
              {isAtLiveEdge ? (
                <button
                  onClick={jumpToLive}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.6)] cursor-default"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-live-dot" />
                  <span>LIVE</span>
                </button>
              ) : (
                <button
                  onClick={jumpToLive}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md animate-pulse"
                  title="Click to jump back to live broadcast (L)"
                >
                  <Radio className="w-3 h-3" />
                  <span>JUMP TO LIVE (-{formatTime(timeshiftOffsetSeconds)})</span>
                </button>
              )}

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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              useProxy
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            {useProxy ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{useProxy ? 'Proxy ON' : 'Direct'}</span>
          </button>

          {/* Copy Stream URL */}
          <button
            onClick={copyStreamUrl}
            title="Copy Stream URL"
            className="p-2 rounded-xl bg-white/10 text-slate-200 hover:bg-white/20 transition-all text-xs flex items-center gap-1"
          >
            <Share2 className="w-4 h-4" />
            {copied && <span className="text-[10px] text-emerald-400">Copied!</span>}
          </button>

          {/* Favorite Toggle */}
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`p-2 rounded-xl transition-all ${
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
            className="p-2 rounded-xl bg-white/10 text-slate-300 hover:bg-rose-500/80 hover:text-white transition-all"
            title="Close Player (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Player Bottom Control Deck */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-3 z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* DVR / Scrubber Timeline Bar */}
        {seekEnd > seekStart && (
          <div className="w-full flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 min-w-[42px] text-right">
              {formatTime(currentTime - seekStart)}
            </span>

            <div className="relative flex-1 flex items-center group/timeline py-1">
              <input
                type="range"
                min={seekStart}
                max={seekEnd}
                step={0.5}
                value={currentTime}
                onChange={handleScrubberChange}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
                title="Seek along stream buffer"
              />
            </div>

            <span className="text-[11px] font-mono text-slate-400 min-w-[50px]">
              {isLiveStream
                ? isAtLiveEdge
                  ? 'LIVE'
                  : `-${formatTime(timeshiftOffsetSeconds)}`
                : formatTime(duration)}
            </span>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Channel Switching + Seeking + Volume */}
          <div className="flex items-center gap-2">
            {/* Previous Channel */}
            {onPrev && (
              <button
                onClick={onPrev}
                title="Previous Channel ( [ )"
                className="p-2 rounded-xl bg-white/10 text-slate-200 hover:bg-white/20 transition-all flex items-center gap-1"
              >
                <SkipBack className="w-4 h-4" />
                <span className="text-[10px] hidden md:inline">Prev</span>
              </button>
            )}

            {/* Rewind 10s Backward */}
            <button
              onClick={seekBackward}
              title="Rewind 10s (Left Arrow)"
              className="p-2 rounded-xl bg-white/10 text-slate-200 hover:bg-white/20 transition-all flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-bold">10s</span>
            </button>

            {/* Main Play / Pause Button */}
            <button
              onClick={togglePlay}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              className="p-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Fast-Forward 10s */}
            <button
              onClick={seekForward}
              title="Forward 10s (Right Arrow)"
              className="p-2 rounded-xl bg-white/10 text-slate-200 hover:bg-white/20 transition-all flex items-center gap-1"
            >
              <RotateCw className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-bold">10s</span>
            </button>

            {/* Next Channel */}
            {onNext && (
              <button
                onClick={onNext}
                title="Next Channel ( ] )"
                className="p-2 rounded-xl bg-white/10 text-slate-200 hover:bg-white/20 transition-all flex items-center gap-1"
              >
                <span className="text-[10px] hidden md:inline">Next</span>
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            {/* Jump to Live Quick Pill (if rewound) */}
            {!isAtLiveEdge && (
              <button
                onClick={jumpToLive}
                title="Jump to live edge (L)"
                className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black transition-all flex items-center gap-1.5 shadow-md ml-1"
              >
                <Radio className="w-3 h-3" />
                <span>Go Live</span>
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
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
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
                className="w-16 md:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Quality / PiP / Fullscreen Controls */}
          <div className="flex items-center gap-2">
            {qualities.length > 0 && (
              <select
                value={selectedQuality}
                onChange={(e) => handleQualityChange(parseInt(e.target.value, 10))}
                className="bg-black/60 border border-white/20 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
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
              className="p-2 rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-all"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              className="p-2 rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-all"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

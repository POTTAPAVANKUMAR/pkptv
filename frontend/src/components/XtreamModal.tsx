import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Key,
  User,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Tv,
  Globe,
  Zap,
  Play,
  Film,
} from 'lucide-react';
import { api } from '../services/api';
import { Channel, LocalXtreamUser, XtreamAccount } from '../types';

interface XtreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: XtreamAccount | null;
  onSaveAccount: (account: XtreamAccount | null) => void;
  onLoadLiveChannels?: (channels: Channel[], name: string) => void;
  onSwitchToMovies?: () => void;
}

export const XtreamModal: React.FC<XtreamModalProps> = ({
  isOpen,
  onClose,
  account,
  onSaveAccount,
  onLoadLiveChannels,
  onSwitchToMovies,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'provider' | 'server'>('provider');

  // Upstream Provider form state
  const [serverUrl, setServerUrl] = useState(account?.server || '');
  const [username, setUsername] = useState(account?.username || '');
  const [password, setPassword] = useState(account?.password || '');
  const [format, setFormat] = useState<'m3u8' | 'ts'>(account?.format || 'm3u8');
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    exp_date?: string;
    max_connections?: string;
  } | null>(null);

  // Self-hosted users state
  const [localUsers, setLocalUsers] = useState<LocalXtreamUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newExpDays, setNewExpDays] = useState(365);
  const [newMaxCons, setNewMaxCons] = useState(3);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLocalUsers();
    }
  }, [isOpen]);

  const loadLocalUsers = async () => {
    try {
      const users = await api.getLocalXtreamUsers();
      setLocalUsers(users);
    } catch (e) {
      console.error('Failed to load local users:', e);
    }
  };

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!serverUrl || !username) {
      setTestResult({ success: false, message: 'Server URL and Username are required.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.testXtreamAuth(serverUrl, username, password);
      if (res.auth) {
        let expFormatted = 'Unlimited';
        if (res.exp_date) {
          const d = new Date(parseInt(res.exp_date, 10) * 1000);
          expFormatted = d.toLocaleDateString();
        }
        setTestResult({
          success: true,
          message: `Connected successfully! Status: ${res.status || 'Active'}`,
          exp_date: expFormatted,
          max_connections: res.max_connections,
        });

        // Save account
        onSaveAccount({
          server: serverUrl,
          username,
          password,
          format,
          isActive: true,
          status: res.status,
          exp_date: expFormatted,
          max_connections: res.max_connections,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Authentication failed. Check your password or account status.',
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Could not reach the server.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    onSaveAccount(null);
    setTestResult(null);
  };

  const handleLoadLiveChannels = async () => {
    const acc = account || (testResult?.success ? { server: serverUrl, username, password, format } : null);
    if (!acc) return;
    setIsLoadingLive(true);
    try {
      const channels = await api.getXtreamLiveStreams(acc.server, acc.username, acc.password, format);
      if (channels.length === 0) {
        setTestResult({
          success: false,
          message: 'No live channels returned by provider or account expired.',
        });
      } else {
        onLoadLiveChannels?.(channels, `Xtream Provider (${acc.username})`);
        onClose();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to load live channels from Xtream server.',
      });
    } finally {
      setIsLoadingLive(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      setUserError('Username and Password are required.');
      return;
    }
    setIsCreatingUser(true);
    setUserError(null);

    try {
      await api.createLocalXtreamUser({
        username: newUsername,
        password: newPassword,
        exp_days: newExpDays,
        max_connections: newMaxCons,
      });
      setNewUsername('');
      setNewPassword('');
      await loadLocalUsers();
    } catch (err: any) {
      setUserError(err.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userToDelete: string) => {
    if (confirm(`Delete user '${userToDelete}'?`)) {
      await api.deleteLocalXtreamUser(userToDelete);
      await loadLocalUsers();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">Xtream Codes & Media Server</h2>
              <p className="text-xs text-slate-400">
                Connect external providers or manage self-hosted Pi users
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 my-4 p-1 bg-slate-950/60 rounded-2xl border border-white/5 shrink-0">
          <button
            onClick={() => setActiveSubTab('provider')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeSubTab === 'provider'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            Connect Provider (e.g. 8kplayers)
          </button>
          <button
            onClick={() => setActiveSubTab('server')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeSubTab === 'server'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            Self-Hosted Server (Your Pi)
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* =========================================================================
              SUBTAB 1: Connect Provider (8kplayers.com, etc.)
              ========================================================================= */}
          {activeSubTab === 'provider' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed">
                Connect your Xtream Codes subscription. All movies and channels will be proxied
                through your Pi with full CORS bypass, and you can download movies permanently to
                your Pi drive.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Server URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://8kplayers.com:8080"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="varunbt24"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter provider password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Stream Type (MPEG vs HLS)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      format === 'm3u8'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="streamFormat"
                      checked={format === 'm3u8'}
                      onChange={() => setFormat('m3u8')}
                      className="accent-indigo-500 mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">HLS (.m3u8) — Recommended</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Native web browser format with instant seeking and smooth playback.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      format === 'ts'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="streamFormat"
                      checked={format === 'ts'}
                      onChange={() => setFormat('ts')}
                      className="accent-indigo-500 mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">MPEG-TS (.ts)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Classic MPEG transport stream (auto-adapted for browser player).
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Status Result Message */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold">{testResult.message}</div>
                    {testResult.exp_date && (
                      <div className="text-[11px] opacity-80">
                        Expires: {testResult.exp_date} | Max Connections:{' '}
                        {testResult.max_connections || '1'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Connected Account Watch Actions */}
              {(account || testResult?.success) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-cyan-950/70 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Subscription Active — Ready to Stream
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {username} @ {serverUrl ? serverUrl.replace(/^https?:\/\//, '').split(':')[0] : 'Xtream'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleLoadLiveChannels}
                      disabled={isLoadingLive}
                      className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                    >
                      {isLoadingLive ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>{isLoadingLive ? 'Loading Live TV...' : 'Watch Live Channels Now'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchToMovies?.();
                        onClose();
                      }}
                      className="py-3 px-4 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/30"
                    >
                      <Film className="w-4 h-4" />
                      <span>Browse Xtream Movies (VOD)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isTesting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {isTesting ? 'Verifying with Server...' : 'Test & Save Account'}
                </button>

                {account && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="py-3 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              SUBTAB 2: Self-Hosted Pi Server (Your Own Xtream Provider)
              ========================================================================= */}
          {activeSubTab === 'server' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed">
                <div className="font-bold mb-1">Your Personal Xtream Server is Active!</div>
                You can connect external apps (like <b>TiviMate</b>, <b>IPTV Smarters</b>, <b>MMN Player</b>, or <b>VLC</b>) directly to your Pi using the credentials below:
                <div className="mt-2 p-2 rounded-lg bg-slate-950 font-mono text-[11px] text-white">
                  Server URL: <span className="text-emerald-400">http://{window.location.hostname}:8085</span> (or your Cloudflare domain)
                </div>
              </div>

              {/* Existing Users List */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Active Free Users ({localUsers.length})
                </h3>
                <div className="space-y-2">
                  {localUsers.map((u) => (
                    <div
                      key={u.username}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{u.username}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-normal">
                              Active
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Pass: {u.password} | Max Cons: {u.max_connections} | Never expires
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteUser(u.username)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create User Form */}
              <form onSubmit={handleCreateUser} className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  Create New Free User
                </h4>

                {userError && (
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 text-xs">
                    {userError}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. livingroom"
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Password
                    </label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="e.g. tvpass123"
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Days Valid
                    </label>
                    <input
                      type="number"
                      value={newExpDays}
                      onChange={(e) => setNewExpDays(parseInt(e.target.value, 10) || 365)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Max Devices
                    </label>
                    <input
                      type="number"
                      value={newMaxCons}
                      onChange={(e) => setNewMaxCons(parseInt(e.target.value, 10) || 3)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create Free Account
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

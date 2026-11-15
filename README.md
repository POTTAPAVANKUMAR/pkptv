# PKP TV 📺

An ultra-modern, high-performance IPTV streaming web player and channel directory server tailored for local desktop use and self-hosting on a **Raspberry Pi** with Docker.

---

## Features

- **Cinematic Dark-Mode Player**:
  - Powered by **Hls.js** with seamless fallback to Safari native HLS.
  - Custom keyboard shortcuts: `Space` (Play/Pause), `M` (Mute), `F` (Fullscreen), `P` (Picture-in-Picture), `↑/↓` (Volume), `←/→` (Channels).
  - Stream quality selector (1080p, 720p, Auto), audio track selection, and stream health status.
- **Automated Stream Proxy**:
  - Built-in FastAPI streaming proxy that rewrites `.m3u8` playlists and chunks on the fly.
  - Automatically bypasses CORS restrictions and browser Mixed-Content blocking (HTTP streams running on HTTPS domains).
- **Curated Worldwide Channel Catalog**:
  - Over 18,000+ live television channels automatically indexed and categorized from `iptv-org`.
  - Filter by Genre/Category (News, Sports, Music, Movies, Kids, Documentary, Animation, etc.).
  - Filter by Country (US, India, UK, Canada, Australia, France, Germany, etc.) with flags.
  - Sub-millisecond instant search across channel names, aliases, and categories.
- **Custom Playlists**:
  - Import external `.m3u` or `.m3u8` URLs or upload local playlist files from your laptop.
- **Raspberry Pi Hardware Monitor**:
  - Live diagnostics widget showing CPU load, CPU temperature (`°C`), RAM usage, disk usage, and uptime in the header.
- **Production Logging & Observability**:
  - Structured request logging with UUID `X-Request-ID` tracing, response latency timing (`ms`), and client IP.
  - Integrated **Dozzle** real-time container log viewer.

---

## Project Structure

```
pkptv/
├── backend/                  # FastAPI Backend API & Stream Proxy
│   ├── app/
│   │   ├── api/v1/           # Channel, category, country, proxy, and system routers
│   │   ├── core/             # Configuration, structured logging, middleware
│   │   └── services/         # Playlist indexing, stream proxy, Pi system monitor
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # Vite + React 18 + TypeScript + Tailwind CSS UI
│   ├── src/
│   │   ├── components/       # Player, ChannelCard, Sidebar, Header, Modals
│   │   ├── services/         # API client
│   │   └── types/            # TypeScript schemas
│   ├── Dockerfile
│   └── nginx.conf            # Reverse proxy + SPA server
├── docker-compose.yml        # Multi-container orchestration (API + Web + Dozzle)
├── start-dev.sh              # One-command local startup script
├── DEPLOYMENT_PI.md          # Raspberry Pi & Cloudflare Tunnel guide
└── README.md
```

---

## Quick Start (Local Development)

To run PKP TV locally on your laptop:

```bash
cd /Users/pavankumarpotta/Workspace/pkptv
./start-dev.sh
```

- **Web Player**: [http://localhost:3005](http://localhost:3005)
- **API Documentation**: [http://localhost:8085/docs](http://localhost:8085/docs)
- **Health Check**: [http://localhost:8085/health](http://localhost:8085/health)

---

## Raspberry Pi Deployment

Deploy on your Raspberry Pi (`pottapk.win`) with Docker Compose:

```bash
docker compose up --build -d
```

See [DEPLOYMENT_PI.md](file:///Users/pavankumarpotta/Workspace/pkptv/DEPLOYMENT_PI.md) for full instructions on configuring Cloudflare Tunnel routes for `tv.pottapk.win` and `tvlogs.pottapk.win`.

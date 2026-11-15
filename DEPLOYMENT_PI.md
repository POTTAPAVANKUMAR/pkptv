# PKP TV - Raspberry Pi Deployment & Setup Guide

This guide walks you through deploying **PKP TV** on your Raspberry Pi (`192.168.1.151`) with Docker and routing it securely through your Cloudflare Tunnel (`pottapk.win`).

---

## 1. Cloudflare Tunnel Configuration

To expose **PKP TV** to the internet at `https://tv.pottapk.win` without port forwarding:

### Step 1: Add DNS Routes to your Cloudflare Tunnel
On your Raspberry Pi, run:
```bash
cloudflared tunnel route dns pottapk-tunnel tv.pottapk.win
cloudflared tunnel route dns pottapk-tunnel tvlogs.pottapk.win
```

### Step 2: Update `/etc/cloudflared/config.yml`
Open the tunnel config:
```bash
sudo nano /etc/cloudflared/config.yml
```

Add the `tv.pottapk.win` and `tvlogs.pottapk.win` entries to your `ingress` list (before the `http_status:404` catch-all):

```yaml
tunnel: f49cf9d5-aee5-4d96-a2ae-a6356c901c7e
credentials-file: /etc/cloudflared/f49cf9d5-aee5-4d96-a2ae-a6356c901c7e.json

ingress:
  - hostname: tv.pottapk.win
    service: http://localhost:3005
  - hostname: tvlogs.pottapk.win
    service: http://localhost:8889
  - hostname: maps.pottapk.win
    service: http://localhost:6000
  - hostname: pottapk.win
    service: http://localhost:3000
  - hostname: app.pottapk.win
    service: http://localhost:8080
  - hostname: api.pottapk.win
    service: http://localhost:5000
  - hostname: cloud.pottapk.win
    service: http://localhost:80
  - hostname: pkpmusic.pottapk.win
    service: http://localhost:8000
  - hostname: portainer.pottapk.win
    service: http://localhost:9000
  - hostname: postgresql.pottapk.win
    service: http://localhost:5050
  - hostname: pkpmusicweb.pottapk.win
    service: http://localhost:3001
  - hostname: pkpmusiclogs.pottapk.win
    service: http://localhost:8888
  - service: http_status:404
```

### Step 3: Restart Cloudflare Tunnel
```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared
```

---

## 2. Deploying on the Raspberry Pi

### Step 1: Transfer or Clone Repository
From your laptop:
```bash
# Push your code to GitHub or transfer via rsync
rsync -avz --exclude 'node_modules' --exclude 'venv' --exclude '.git' \
  /Users/pavankumarpotta/Workspace/pkptv/ pavankumarpotta@192.168.1.151:~/pkptv/
```
*(Or clone your Git repository directly onto the Pi into `~/pkptv`).*

### Step 2: Start with Docker Compose
SSH into your Raspberry Pi:
```bash
ssh pavankumarpotta@192.168.1.151
cd ~/pkptv

# Copy environment template
cp .env.example .env

# Build and start containers in the background
docker compose up --build -d
```

### Step 3: Verify Running Services
```bash
docker compose ps
```
You should see:
- `pkptv-api` (Port `8085` -> healthy)
- `pkptv-web` (Port `3005` -> running)
- `pkptv-logs` (Port `8889` -> Dozzle live log viewer)

---

## 3. URLs & Management

| Service | Local URL | Public Cloudflare URL | Description |
|---|---|---|---|
| **PKP TV Web Player** | `http://192.168.1.151:3005` | `https://tv.pottapk.win` | Full responsive IPTV web app |
| **FastAPI Swagger Docs** | `http://192.168.1.151:8085/docs` | -- | Interactive API documentation |
| **Live Container Logs** | `http://192.168.1.151:8889` | `https://tvlogs.pottapk.win` | Dozzle web interface for live logs |

---

## 4. Better Logging & Observability

- **Structured Access Logs**: Every API and video proxy request is logged with timestamp, HTTP method, path, response latency (ms), client IP, and a unique `X-Request-ID`.
- **Dozzle GUI**: Visit `http://192.168.1.151:8889` or `https://tvlogs.pottapk.win` to view, filter, and stream colorized logs in real-time.
- **CLI Log Tailing**:
  ```bash
  docker compose logs -f backend   # Tail API logs
  docker compose logs -f web       # Tail Nginx logs
  ```

---

## 5. Maintenance Commands

**Update & Redeploy:**
```bash
cd ~/pkptv
git pull
docker compose up --build -d
```

**Restart Services:**
```bash
docker compose restart
```

**Check Thermal Status & Health:**
```bash
curl http://localhost:8085/api/v1/system/stats
```

import asyncio
import logging
import os
import shutil
import subprocess
import time
from typing import Any, Dict, List, Optional
from app.core.config import settings

logger = logging.getLogger("pkp_tv.dvr")


class DvrService:
    """Manages 12-hour rolling sliding window DVR recordings using FFmpeg.

    - Records live HLS streams into 6-second segments with a 7,200-segment circular buffer (12 hours).
    - Automatically purges segments older than 12 hours via -hls_flags delete_segments.
    - Uses zero-transcode remuxing (-c copy) for minimal CPU utilization (<1% on Raspberry Pi).
    """

    def __init__(self):
        self.dvr_dir = os.path.join(settings.DATA_DIR, "dvr")
        os.makedirs(self.dvr_dir, exist_ok=True)
        self.active_processes: Dict[str, subprocess.Popen] = {}
        self.recordings_meta: Dict[str, Dict[str, Any]] = {}

    def start_recording(
        self,
        channel_id: str,
        stream_url: str,
        channel_name: Optional[str] = None,
        channel_logo: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Starts a 12-hour rolling circular buffer recording for the specified channel."""
        # Sanitize channel_id for filesystem safety
        safe_id = "".join(c for c in channel_id if c.isalnum() or c in ("-", "_", "."))

        # If already recording, return existing metadata
        if safe_id in self.active_processes and self.active_processes[safe_id].poll() is None:
            logger.info(f"DVR for channel '{safe_id}' is already actively recording.")
            return self.get_status(safe_id) or {}

        chan_dir = os.path.join(self.dvr_dir, safe_id)
        os.makedirs(chan_dir, exist_ok=True)

        playlist_path = os.path.join(chan_dir, "index.m3u8")
        segment_pattern = os.path.join(chan_dir, "seg_%06d.ts")

        # FFmpeg command for 12-hour rolling buffer:
        # - 6-second chunks (-hls_time 6)
        # - 7,200 chunks = 43,200 seconds = 12 hours (-hls_list_size 7200)
        # - delete_segments automatically purges chunks older than 12 hours
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "warning",
            "-user_agent", "IPTVSmartersPro",
            "-reconnect", "1",
            "-reconnect_at_eof", "1",
            "-reconnect_streamed", "1",
            "-reconnect_delay_max", "5",
            "-i", stream_url,
            "-c", "copy",
            "-f", "hls",
            "-hls_time", "6",
            "-hls_list_size", "7200",
            "-hls_flags", "delete_segments+append_list",
            "-hls_segment_filename", segment_pattern,
            playlist_path,
        ]

        logger.info(f"Starting 12h DVR buffer for '{safe_id}' -> {playlist_path}")
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            self.active_processes[safe_id] = proc
            self.recordings_meta[safe_id] = {
                "channel_id": safe_id,
                "channel_name": channel_name or safe_id,
                "channel_logo": channel_logo or "",
                "stream_url": stream_url,
                "started_at": time.time(),
                "playlist_path": playlist_path,
                "dvr_url": f"/api/v1/dvr/{safe_id}/index.m3u8",
                "max_window_hours": 12,
            }
            return self.get_status(safe_id) or {}
        except Exception as e:
            logger.error(f"Failed to start FFmpeg DVR process for '{safe_id}': {e}", exc_info=True)
            raise RuntimeError(f"Could not start DVR capture: {e}")

    def stop_recording(self, channel_id: str) -> bool:
        """Stops the rolling DVR recording for a channel."""
        safe_id = "".join(c for c in channel_id if c.isalnum() or c in ("-", "_", "."))
        proc = self.active_processes.get(safe_id)
        if proc:
            logger.info(f"Stopping DVR process for channel '{safe_id}'...")
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                proc.kill()
            del self.active_processes[safe_id]
            return True
        return False

    def delete_recording(self, channel_id: str) -> bool:
        """Stops recording and wipes the buffer folder from disk."""
        safe_id = "".join(c for c in channel_id if c.isalnum() or c in ("-", "_", "."))
        self.stop_recording(safe_id)
        if safe_id in self.recordings_meta:
            del self.recordings_meta[safe_id]
        chan_dir = os.path.join(self.dvr_dir, safe_id)
        if os.path.exists(chan_dir):
            try:
                shutil.rmtree(chan_dir)
                logger.info(f"Deleted DVR directory '{chan_dir}'")
                return True
            except Exception as e:
                logger.error(f"Failed to delete DVR directory '{chan_dir}': {e}")
        return False

    def get_status(self, channel_id: Optional[str] = None) -> Any:
        """Returns metadata and buffer status for one or all DVR recordings."""
        if channel_id:
            safe_id = "".join(c for c in channel_id if c.isalnum() or c in ("-", "_", "."))
            meta = self.recordings_meta.get(safe_id)
            if not meta:
                # Check if directory exists on disk even if server was restarted
                chan_dir = os.path.join(self.dvr_dir, safe_id)
                pl = os.path.join(chan_dir, "index.m3u8")
                if os.path.exists(pl):
                    meta = {
                        "channel_id": safe_id,
                        "channel_name": safe_id,
                        "started_at": os.path.getctime(pl),
                        "playlist_path": pl,
                        "dvr_url": f"/api/v1/dvr/{safe_id}/index.m3u8",
                        "max_window_hours": 12,
                    }
                else:
                    return None

            proc = self.active_processes.get(safe_id)
            is_active = proc is not None and proc.poll() is None

            # Calculate disk space used and buffer duration
            chan_dir = os.path.join(self.dvr_dir, safe_id)
            size_bytes = 0
            seg_count = 0
            if os.path.exists(chan_dir):
                for f in os.listdir(chan_dir):
                    fp = os.path.join(chan_dir, f)
                    if os.path.isfile(fp):
                        size_bytes += os.path.getsize(fp)
                        if f.endswith(".ts"):
                            seg_count += 1

            # Estimated buffered seconds (seg_count * 6s)
            buffered_seconds = seg_count * 6
            elapsed = time.time() - meta["started_at"] if "started_at" in meta else buffered_seconds

            return {
                **meta,
                "is_active": is_active,
                "size_mb": round(size_bytes / (1024 * 1024), 1),
                "segments_count": seg_count,
                "buffered_seconds": min(buffered_seconds, 43200),
                "buffered_display": self._format_duration(min(buffered_seconds, 43200)),
                "elapsed_seconds": int(elapsed),
            }

        # Return all active/existing recordings
        results = []
        # Inspect all subdirectories in dvr_dir
        if os.path.exists(self.dvr_dir):
            for d in os.listdir(self.dvr_dir):
                stat = self.get_status(d)
                if stat:
                    results.append(stat)
        return results

    def get_playlist_content(self, channel_id: str) -> Optional[str]:
        """Reads and returns the rolling index.m3u8 content."""
        safe_id = "".join(c for c in channel_id if c.isalnum() or c in ("-", "_", "."))
        pl_path = os.path.join(self.dvr_dir, safe_id, "index.m3u8")
        if os.path.exists(pl_path):
            try:
                with open(pl_path, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Error reading playlist for '{safe_id}': {e}")
        return None

    def get_segment_file(self, channel_id: str, segment_name: str) -> Optional[str]:
        """Resolves file path for a .ts segment."""
        safe_id = "".join(c for c in channel_id if c.isalnum() or c in ("-", "_", "."))
        safe_seg = os.path.basename(segment_name)
        seg_path = os.path.join(self.dvr_dir, safe_id, safe_seg)
        if os.path.exists(seg_path):
            return seg_path
        return None

    @staticmethod
    def _format_duration(seconds: int) -> str:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        elif minutes > 0:
            return f"{minutes}m {secs}s"
        return f"{secs}s"

    def shutdown(self):
        """Clean up running FFmpeg subprocesses on service termination."""
        for cid, proc in list(self.active_processes.items()):
            try:
                proc.terminate()
            except Exception:
                pass


dvr_service = DvrService()

import os
import platform
import subprocess
import time
from typing import Any, Dict
import psutil

START_TIME = time.time()


class SystemService:
    @staticmethod
    def get_cpu_temperature() -> Dict[str, Any]:
        """
        Reads CPU temperature on Raspberry Pi (/sys/class/thermal/thermal_zone0/temp)
        or via vcgencmd / psutil.
        """
        # Try Raspberry Pi sysfs thermal file
        thermal_path = "/sys/class/thermal/thermal_zone0/temp"
        if os.path.exists(thermal_path):
            try:
                with open(thermal_path, "r") as f:
                    temp_milli = float(f.read().strip())
                    return {"celsius": round(temp_milli / 1000.0, 1), "source": "sysfs"}
            except Exception:
                pass

        # Try host_sys mounted from docker (/host_sys/class/thermal/thermal_zone0/temp)
        host_thermal = "/host_sys/class/thermal/thermal_zone0/temp"
        if os.path.exists(host_thermal):
            try:
                with open(host_thermal, "r") as f:
                    temp_milli = float(f.read().strip())
                    return {"celsius": round(temp_milli / 1000.0, 1), "source": "host_sysfs"}
            except Exception:
                pass

        # Try vcgencmd (Raspberry Pi native utility)
        try:
            res = subprocess.run(["vcgencmd", "measure_temp"], capture_output=True, text=True, timeout=1)
            if res.returncode == 0 and "temp=" in res.stdout:
                # Output like: temp=48.2'C
                raw = res.stdout.replace("temp=", "").replace("'C", "").strip()
                return {"celsius": float(raw), "source": "vcgencmd"}
        except Exception:
            pass

        # Fallback to psutil sensors
        try:
            sensors = psutil.sensors_temperatures()
            for key in ["cpu_thermal", "cpu-thermal", "coretemp", "k10temp"]:
                if key in sensors and sensors[key]:
                    return {"celsius": round(sensors[key][0].current, 1), "source": key}
        except Exception:
            pass

        return {"celsius": None, "source": "unavailable"}

    @classmethod
    def get_system_stats(cls) -> Dict[str, Any]:
        """Gathers system metrics: CPU, memory, disk, uptime, temperature."""
        cpu_percent = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        temp_data = cls.get_cpu_temperature()
        uptime_seconds = int(time.time() - psutil.boot_time())
        app_uptime = int(time.time() - START_TIME)

        return {
            "platform": {
                "system": platform.system(),
                "release": platform.release(),
                "machine": platform.machine(),
                "is_raspberry_pi": (
                    platform.machine() in ["aarch64", "armv7l"]
                    or os.path.exists("/sys/firmware/devicetree/base/model")
                ),
            },
            "cpu": {
                "usage_percent": cpu_percent,
                "cores": psutil.cpu_count(logical=True),
                "temperature": temp_data,
            },
            "memory": {
                "total_mb": round(mem.total / (1024 * 1024), 1),
                "used_mb": round(mem.used / (1024 * 1024), 1),
                "free_mb": round(mem.available / (1024 * 1024), 1),
                "percent": mem.percent,
            },
            "disk": {
                "total_gb": round(disk.total / (1024 * 1024 * 1024), 1),
                "used_gb": round(disk.used / (1024 * 1024 * 1024), 1),
                "free_gb": round(disk.free / (1024 * 1024 * 1024), 1),
                "percent": disk.percent,
            },
            "uptime": {
                "system_seconds": uptime_seconds,
                "app_seconds": app_uptime,
            },
        }


system_service = SystemService()

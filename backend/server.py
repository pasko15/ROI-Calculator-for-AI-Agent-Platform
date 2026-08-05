from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from backend.pricing_catalog import add_or_update_manual_model, load_catalog
from backend.roi_model import calculate_dashboard


ROOT = Path(__file__).resolve().parent.parent
FRONTEND_ROOT = ROOT / "frontend"
ASSETS_ROOT = FRONTEND_ROOT / "assets"
HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "8000"))


class ROIRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path in ("/", "/index.html"):
            self._send_file(FRONTEND_ROOT / "index.html", "text/html; charset=utf-8")
            return
        if parsed.path == "/app.js":
            self._send_file(FRONTEND_ROOT / "app.js", "text/javascript; charset=utf-8")
            return
        if parsed.path == "/roirobot.png":
            self._send_file(ASSETS_ROOT / "roirobot.png", "image/png")
            return
        if parsed.path == "/api/model-catalog":
            query = parse_qs(parsed.query)
            refresh = query.get("refresh", ["0"])[0] == "1"
            self._send_json(load_catalog(refresh=refresh))
            return

        self.send_error(404, "Not found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/calculate":
            try:
                payload = self._read_json_body()
                result = calculate_dashboard(payload)
            except ValueError as error:
                self._send_json({"error": str(error)}, status=400)
                return
            except Exception as error:
                self._send_json({"error": f"Calculation failed: {error}"}, status=500)
                return

            self._send_json(result)
            return

        if parsed.path == "/api/model-catalog":
            try:
                payload = self._read_json_body()
                catalog = add_or_update_manual_model(payload)
            except ValueError as error:
                self._send_json({"error": str(error)}, status=400)
                return
            except Exception as error:
                self._send_json({"error": f"Catalog update failed: {error}"}, status=500)
                return

            self._send_json(catalog)
            return

        self.send_error(404, "Not found")

    def log_message(self, format: str, *args: Any) -> None:
        print(f"{self.address_string()} - {format % args}")

    def _read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length)
        if not raw_body:
            return {}

        body = json.loads(raw_body.decode("utf-8"))
        if not isinstance(body, dict):
            raise ValueError("Request body must be a JSON object.")
        return body

    def _send_file(self, path: Path, content_type: str) -> None:
        if not path.exists():
            self.send_error(404, "Not found")
            return

        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, body: dict[str, Any], status: int = 200) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main() -> None:
    port = PORT
    while True:
        try:
            server = ThreadingHTTPServer((HOST, port), ROIRequestHandler)
            break
        except OSError as error:
            if port >= PORT + 20:
                raise error
            port += 1

    print(f"ROI dashboard running at http://{HOST}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()

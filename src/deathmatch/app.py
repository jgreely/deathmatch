"""
Five-Star Deathmatch: Flask app packaged for installation.

Usage (after poetry install):
    poetry run deathmatch [IMAGE_DIR]

If IMAGE_DIR is omitted, the current working directory is used.
"""
from __future__ import annotations

import click
import logging
import os
import sys
import threading
import time
from pathlib import Path
from typing import Any, Dict, List

from flask import Flask, abort, jsonify, render_template, request, send_file

# Configuration constants
SUPPORTED_EXTENSIONS = (".png", ".jpg", ".jpeg")
RANK_RANGE = (-1, 5)  # -1 for rejected, 0-5 for star ratings
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5000

url = 'http://127.0.0.1:5000'

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Globals initialized in create_app
BASE_DIR: Path
RANK_FILE: Path
state_lock: threading.Lock
files: List[str]
meta: Dict[str, Dict[str, Any]]


def create_app(base_dir: Path) -> Flask:
    """Application factory. Sets up Flask with proper folders and routes."""
    global BASE_DIR, RANK_FILE, state_lock, files, meta

    BASE_DIR = base_dir.resolve()
    RANK_FILE = BASE_DIR / "_rank.txt"
    state_lock = threading.Lock()
    files = []
    meta = {}

    here = Path(__file__).parent.resolve()
    app = Flask(
        __name__,
        template_folder=str(here / "templates"),
        static_folder=str(here / "static"),
    )

    # ---------------- State management ----------------
    def load_state() -> None:
        """Load files and metadata from disk and rank file."""
        global files, meta
        files = sorted(
            [f.name for f in BASE_DIR.iterdir() if f.suffix.lower() in SUPPORTED_EXTENSIONS],
            key=lambda fn: (BASE_DIR / fn).stat().st_mtime,
        )
        meta = {}
        if RANK_FILE.exists():
            try:
                for line in RANK_FILE.read_text().splitlines():
                    parts = line.split("\t")
                    if not parts:
                        continue
                    fname = parts[0]
                    try:
                        rank = int(parts[1]) if len(parts) > 1 and parts[1] else 0
                    except ValueError:
                        logger.warning("Invalid rank for %s; defaulting to 0", fname)
                        rank = 0
                    flags = set(parts[2].split(",")) if len(parts) > 2 and parts[2] else set()
                    meta[fname] = {"rank": rank, "flags": flags}
            except Exception as e:
                logger.error("Error reading rank file: %s", e)
                meta = {}
        for f in files:
            if f not in meta:
                meta[f] = {"rank": 0, "flags": set()}

    def save_state() -> None:
        try:
            with open(RANK_FILE, "w") as fp:
                for fname in files:
                    entry = meta.get(fname, {"rank": 0, "flags": set()})
                    flags_str = ",".join(sorted(entry["flags"])) if entry["flags"] else ""
                    fp.write(f"{fname}\t{entry['rank']}\t{flags_str}\n")
        except Exception as e:
            logger.error("Error saving rank file: %s", e)
            raise

    # ---------------- Routes ----------------
    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/image/<path:fname>")
    def get_image(fname: str):
        if not fname:
            abort(404)
        target = (BASE_DIR / fname).resolve()
        try:
            _ = target.relative_to(BASE_DIR)
        except ValueError:
            abort(403)
        if not target.exists():
            abort(404)
        return send_file(str(target))

    @app.route("/api/state")
    def api_state():
        with state_lock:
            safe_meta = {
                fn: {"rank": e.get("rank", 0), "flags": sorted(e.get("flags", []))}
                for fn, e in meta.items()
            }
            return jsonify({"files": files, "meta": safe_meta})

    @app.route("/api/update", methods=["POST"])
    def api_update():
        data = request.json or {}
        fname = data.get("file")
        if fname not in meta:
            abort(400)
        with state_lock:
            if "rank" in data:
                meta[fname]["rank"] = data["rank"]
            if "toggle_flag" in data:
                fl = data["toggle_flag"]
                if fl in meta[fname]["flags"]:
                    meta[fname]["flags"].remove(fl)
                else:
                    meta[fname]["flags"].add(fl)
            save_state()
        return jsonify(success=True)

    @app.route("/api/reload", methods=["POST"])
    def api_reload():
        with state_lock:
            load_state()
        return jsonify(success=True)

    # Initial load
    load_state()

    return app

def launchurl():
    time.sleep(1)
    click.launch(url)

@click.command()
@click.option('-h', '--host', type=str,
    default=DEFAULT_HOST, help=f"Host to bind (default: {DEFAULT_HOST})")
@click.option('-p', '--port', type=int,
    default=DEFAULT_PORT, help=f"Port (default: {DEFAULT_PORT})")
@click.option('-d', '--debug', is_flag=True,
    help="Enable Flask debug mode")
@click.argument('directory', nargs=-1)
def main(directory, host, port, debug):
    '''
    Five-Star Deathmatch: 

    A Flask web application for ranking and flagging images in a
    directory. This tool provides a simple lightweight interface to view,
    rank, and flag images using keyboard shortcuts.

    Usage:

        deathmatch [DIRECTORY]

        poetry run deathmatch [DIRECTORY]

    If DIRECTORY is omitted, the current working directory is used.
    '''
    if directory and directory[0]:
        directory = directory[0]
    else:
        directory = os.getcwd()
    base_dir = Path(directory).resolve()
    if not base_dir.exists() or not base_dir.is_dir():
        print(f"Error: directory not found: {base_dir}", file=sys.stderr)
        sys.exit(2)

    logger.info("Starting Five-Star Deathmatch")
    logger.info("Base directory: %s", base_dir)

    app = create_app(base_dir)
    url = f'http://{host}:{port}'
    threading.Thread(target=launchurl).start()
    app.run(host, port, debug=debug)

if __name__ == "__main__":  # pragma: no cover
    main()

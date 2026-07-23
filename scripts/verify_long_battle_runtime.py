#!/usr/bin/env python3
"""Regression coverage for long-battle runtime freezes and object lifetimes."""

from __future__ import annotations

import re
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "index.html"
SOAK_FRAMES = 120_000
failures = 0


def check(condition: bool, message: str) -> None:
    global failures
    if condition:
        print(f"[OK] {message}")
    else:
        failures += 1
        print(f"[FAIL] {message}")


def game_engine_source(html: str) -> str:
    start = html.find("    class GameEngine {")
    end = html.find("\n    class UIManager {", start)
    if start < 0 or end < 0:
        return ""
    return html[start:end]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format: str, *args: object) -> None:
        pass


def launch_browser(playwright):
    candidates = (
        {"channel": "chrome"},
        {"channel": "msedge"},
        {"executable_path": r"C:\Program Files\Google\Chrome\Application\chrome.exe"},
        {"executable_path": r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"},
    )
    errors = []
    for options in candidates:
        executable = options.get("executable_path")
        if executable and not Path(executable).exists():
            continue
        try:
            return playwright.chromium.launch(headless=True, **options)
        except PlaywrightError as error:
            errors.append(str(error).splitlines()[0])
    raise RuntimeError("unable to launch Chromium: " + " | ".join(errors))


html = HTML_PATH.read_text(encoding="utf-8")
engine_source = game_engine_source(html)
check(bool(engine_source), "GameEngine class is extractable")

method_names = set(
    re.findall(
        r"^        (?:async\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(",
        engine_source,
        re.MULTILINE,
    )
)
direct_method_calls = set(
    re.findall(r"\bthis\.([A-Za-z_$][A-Za-z0-9_$]*)\s*\(", engine_source)
)
missing_methods = sorted(direct_method_calls - method_names)
check(
    not missing_methods,
    "all direct GameEngine method calls resolve"
    + (f": missing {', '.join(missing_methods)}" if missing_methods else ""),
)
check(
    "enemyGridColumn" in method_names,
    "boss hazard grid conversion helper exists",
)

handler = partial(QuietHandler, directory=str(ROOT))
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()

try:
    with sync_playwright() as playwright:
        browser = launch_browser(playwright)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page_errors: list[str] = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(
            f"http://127.0.0.1:{server.server_port}/index.html",
            wait_until="networkidle",
        )

        try:
            hazard_result = page.evaluate(
                """() => {
                    const probe = Object.create(GameEngine.prototype);
                    probe.C = 9;
                    probe.G = 80;
                    probe.OX = 120;
                    probe.OY = 40;
                    probe.objs = [];
                    probe.spawnVfxPhase = () => {};
                    probe.startBossVulnerability = () => {};
                    probe.floatText = () => {};
                    probe.announce = () => {};
                    probe.transitionBossPhase = () => false;
                    const enemy = {
                        id: 'super_boss',
                        hp: 1000,
                        maxHp: 1000,
                        x: probe.OX + probe.G * 4,
                        y: probe.OY + probe.G * 2,
                        r: 2,
                        bossPhaseTransitioning: true,
                        bossPhaseQueue: []
                    };
                    const phase = {
                        hazard: 'crystalField',
                        telegraph: 30,
                        vulnerability: 60
                    };
                    const executed = probe.executeBossPhaseAction({
                        enemy,
                        phase,
                        cfg: null
                    });
                    const hazard = probe.objs.find(obj => obj.type === 'dirtyZone');
                    return {
                        executed,
                        hazardColumn: hazard && hazard.c,
                        leftColumn: probe.enemyGridColumn({ x: -10000 }),
                        middleColumn: probe.enemyGridColumn({
                            x: probe.OX + probe.G * 4
                        }),
                        rightColumn: probe.enemyGridColumn({ x: 10000 })
                    };
                }"""
            )
            check(
                hazard_result["executed"] is True,
                "Boss phase action executes its hazard path",
            )
            check(
                hazard_result["hazardColumn"] == 3,
                "Boss hazard starts one clamped grid column left of the enemy",
            )
            check(
                hazard_result["leftColumn"] == 0
                and hazard_result["middleColumn"] == 4
                and hazard_result["rightColumn"] == 8,
                "enemy grid conversion clamps to [0, C - 1]",
            )
        except PlaywrightError as error:
            failures += 1
            print(f"[FAIL] Boss phase hazard runtime threw: {error}")

        try:
            soak = page.evaluate(
                f"""() => {{
                    const probe = Object.create(GameEngine.prototype);
                    probe.phase = 'td';
                    probe.callbacks = {{}};
                    probe.C = 9;
                    probe.R = 5;
                    probe.G = 80;
                    probe.OX = 120;
                    probe.OY = 40;
                    probe.w = 1280;
                    probe.h = 720;
                    probe.hp = 999;
                    probe.mp = 400;
                    probe.frame = 0;
                    probe.levelIdx = 10;
                    probe.waveIdx = 0;
                    probe.challengeRule = null;
                    probe.combatPaused = false;
                    probe.towerCooldowns = {{}};
                    probe.laneWarnings = [];
                    probe.bossMarks = [];
                    probe.bossTimer = Number.MAX_SAFE_INTEGER;
                    probe.freezeTimer = 0;
                    probe.naturalSunTimer = Number.MAX_SAFE_INTEGER;
                    probe.starTimer = Number.MAX_SAFE_INTEGER;
                    probe.spawnState = {{ active: false }};
                    probe.waitNextWave = Infinity;
                    probe.objs = [];
                    probe.particles = [];
                    probe.floatTexts = [];
                    probe.updateStats = () => {{}};
                    probe.pushCombatState = () => {{}};

                    const enemy = {{
                        x: probe.OX + probe.G * 4,
                        y: probe.OY + probe.G * 2,
                        r: 2
                    }};
                    const phase = {{ telegraph: 30 }};
                    const peak = {{ objs: 0, particles: 0, floatTexts: 0 }};
                    const started = performance.now();

                    for (let frame = 0; frame < {SOAK_FRAMES}; frame++) {{
                        if (frame % 120 === 0) probe.spawnBossHazard(enemy, phase);
                        if (frame % 30 === 0) {{
                            probe.spawnParticles(enemy.x, enemy.y, '#a855f7', 3);
                        }}
                        if (frame % 45 === 0) {{
                            probe.floatText('soak', enemy.x, enemy.y, '#fff', 40, 16);
                        }}
                        probe.update();
                        peak.objs = Math.max(peak.objs, probe.objs.length);
                        peak.particles = Math.max(
                            peak.particles,
                            probe.particles.length
                        );
                        peak.floatTexts = Math.max(
                            peak.floatTexts,
                            probe.floatTexts.length
                        );
                    }}
                    for (let frame = 0; frame < 240; frame++) probe.update();

                    return {{
                        frames: {SOAK_FRAMES},
                        elapsedMs: Math.round(performance.now() - started),
                        peak,
                        final: {{
                            objs: probe.objs.length,
                            particles: probe.particles.length,
                            floatTexts: probe.floatTexts.length
                        }}
                    }};
                }}"""
            )
            check(
                soak["peak"]["objs"] <= 2
                and soak["peak"]["particles"] <= 9
                and soak["peak"]["floatTexts"] <= 1,
                "120,000-frame soak keeps object peaks bounded "
                f"(objs={soak['peak']['objs']}, "
                f"particles={soak['peak']['particles']}, "
                f"floatTexts={soak['peak']['floatTexts']})",
            )
            check(
                soak["final"]
                == {"objs": 0, "particles": 0, "floatTexts": 0},
                "soak-created objects drain after their configured lifetimes",
            )
            print(
                f"[INFO] soak frames={soak['frames']} "
                f"elapsedMs={soak['elapsedMs']} final={soak['final']}"
            )
        except PlaywrightError as error:
            failures += 1
            print(f"[FAIL] Long-battle runtime soak threw: {error}")

        frame_before = page.evaluate("engine.frame")
        page.wait_for_timeout(250)
        frame_after = page.evaluate("engine.frame")
        check(
            frame_after > frame_before,
            f"requestAnimationFrame loop remains responsive "
            f"({frame_before} -> {frame_after})",
        )
        check(
            not page_errors,
            "browser reported no uncaught page errors"
            + (f": {' | '.join(page_errors)}" if page_errors else ""),
        )
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    server_thread.join(timeout=5)

if failures:
    raise SystemExit(1)

print("[PASS] long-battle runtime regression suite")

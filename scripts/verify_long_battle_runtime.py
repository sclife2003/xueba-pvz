#!/usr/bin/env python3
"""Regression coverage for long-battle runtime freezes and object lifetimes."""

from __future__ import annotations

import re
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image
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

minigame_scene_ids = (
    "chalk_shooter",
    "relay_target",
    "quiet_snipe",
    "exam_defense",
)
for minigame_id in minigame_scene_ids:
    scene_sizes = {}
    for orientation, minimum in (
        ("landscape", (2048, 1152)),
        ("portrait", (1152, 2048)),
    ):
        for extension in ("png", "webp"):
            asset_path = (
                ROOT
                / "assets"
                / "scenes"
                / f"minigame_{minigame_id}_{orientation}.{extension}"
            )
            with Image.open(asset_path) as image:
                scene_sizes[(orientation, extension)] = image.size
            width, height = scene_sizes[(orientation, extension)]
            check(
                width >= minimum[0] and height >= minimum[1],
                f"{asset_path.name} is at least {minimum[0]}x{minimum[1]} "
                f"(actual={width}x{height})",
            )
        check(
            scene_sizes[(orientation, "png")]
            == scene_sizes[(orientation, "webp")],
            f"{minigame_id} {orientation} PNG/WebP dimensions match",
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
            vfx_runtime = page.evaluate(
                """async () => {
                    const families = [
                        'corrosion', 'impact', 'paper', 'doodle',
                        'soundwave', 'sunshine', 'crystal'
                    ];
                    const profiles = Object.values(VFX_MANIFEST);
                    await ASSETS.loadEntries(families.map(family => {
                        const profile = profiles.find(item => item.family === family);
                        return [
                            'vfx_' + family,
                            profile.runtime,
                            profile.fallback
                        ];
                    }));
                    const assetPixels = {};
                    for (const family of families) {
                        const image = ASSETS.images['vfx_' + family];
                        const canvas = document.createElement('canvas');
                        canvas.width = 160;
                        canvas.height = 160;
                        const ctx = canvas.getContext('2d', {
                            willReadFrequently: true
                        });
                        if (image) ctx.drawImage(image, 0, 0, 160, 160);
                        const pixels = ctx.getImageData(0, 0, 160, 160).data;
                        let nontransparent = 0;
                        for (let i = 3; i < pixels.length; i += 4) {
                            if (pixels[i] > 0) nontransparent++;
                        }
                        assetPixels[family] = nontransparent;
                    }

                    const probe = Object.create(GameEngine.prototype);
                    probe.objs = [];
                    probe.G = 80;
                    probe.w = 960;
                    probe.h = 540;
                    probe.frame = 0;
                    const enemy = {
                        id: 'super_boss',
                        x: 720,
                        y: 180,
                        data: { color: '#a855f7' }
                    };
                    const target = { x: 180, y: 260 };
                    for (let cast = 0; cast < 80; cast++) {
                        probe.spawnSpecialFx(enemy, target, {
                            label: 'dense cast'
                        });
                    }
                    const denseTypes = Array.from(
                        new Set(probe.objs.map(obj => obj.type))
                    );
                    const densePeak = probe.objs.length;
                    probe.phase = 'minigame';
                    probe.spawnVfxPhase(enemy, 'travel', { target });
                    const landscapeMinigameOrientation =
                        probe.objs[probe.objs.length - 1].orientation;
                    for (let frame = 0; frame < 180; frame++) {
                        probe.updateRasterFxObjects();
                    }

                    const signatures = {};
                    for (const phase of [
                        'telegraph', 'cast', 'travel', 'impact'
                    ]) {
                        const canvas = document.createElement('canvas');
                        canvas.width = 320;
                        canvas.height = 320;
                        const ctx = canvas.getContext('2d', {
                            willReadFrequently: true
                        });
                        probe.drawRasterFx(ctx, {
                            type: 'rasterFx',
                            assetId: 'vfx_crystal',
                            phase,
                            x: 160,
                            y: 160,
                            sourceX: 80,
                            sourceY: 160,
                            targetX: 240,
                            targetY: 160,
                            size: 100,
                            life: 20,
                            maxLife: 30,
                            delay: 0,
                            orientation: 'landscape',
                            landscapeSafeArea: {
                                x: 0.08, y: 0.14, w: 0.84, h: 0.72,
                                axis: 'horizontal'
                            },
                            portraitSafeArea: {
                                x: 0.14, y: 0.08, w: 0.72, h: 0.84,
                                axis: 'vertical'
                            }
                        });
                        const pixels = ctx.getImageData(
                            0, 0, canvas.width, canvas.height
                        ).data;
                        let alphaCount = 0;
                        let alphaSum = 0;
                        let minX = canvas.width;
                        let maxX = -1;
                        let minY = canvas.height;
                        let maxY = -1;
                        for (let pixel = 0; pixel < pixels.length; pixel += 4) {
                            const alpha = pixels[pixel + 3];
                            if (!alpha) continue;
                            const index = pixel / 4;
                            const x = index % canvas.width;
                            const y = Math.floor(index / canvas.width);
                            alphaCount++;
                            alphaSum += alpha;
                            minX = Math.min(minX, x);
                            maxX = Math.max(maxX, x);
                            minY = Math.min(minY, y);
                            maxY = Math.max(maxY, y);
                        }
                        signatures[phase] = {
                            alphaCount,
                            alphaSum,
                            width: maxX >= minX ? maxX - minX + 1 : 0,
                            height: maxY >= minY ? maxY - minY + 1 : 0
                        };
                    }

                    return {
                        assetPixels,
                        denseTypes,
                        densePeak,
                        denseFinal: probe.objs.length,
                        landscapeMinigameOrientation,
                        signatures
                    };
                }"""
            )
            check(
                all(count > 0 for count in vfx_runtime["assetPixels"].values()),
                "all seven raster VFX families contain nontransparent pixels",
            )
            check(
                vfx_runtime["denseTypes"] == ["rasterFx"],
                "dense formal skill casts create rasterFx only "
                f"(types={vfx_runtime['denseTypes']})",
            )
            check(
                vfx_runtime["densePeak"] <= 160,
                "dense casts keep rasterFx count bounded "
                f"(peak={vfx_runtime['densePeak']})",
            )
            check(
                vfx_runtime["denseFinal"] == 0,
                "dense rasterFx lifecycle drains completely",
            )
            check(
                vfx_runtime["landscapeMinigameOrientation"] == "landscape",
                "landscape minigame defaults to a landscape-safe VFX profile",
            )
            signatures = vfx_runtime["signatures"]
            signature_values = {
                (
                    value["alphaCount"],
                    value["alphaSum"],
                    value["width"],
                    value["height"],
                )
                for value in signatures.values()
            }
            check(
                all(value["alphaCount"] > 0 for value in signatures.values())
                and len(signature_values) == 4,
                "telegraph/cast/travel/impact render nontransparent, distinct "
                f"pixel signatures ({signatures})",
            )
        except PlaywrightError as error:
            failures += 1
            print(f"[FAIL] Raster VFX runtime contract threw: {error}")

        try:
            portrait_minigame = page.evaluate(
                """() => {
                    const probe = Object.create(GameEngine.prototype);
                    probe.w = 420;
                    probe.h = 760;
                    probe.G = 80;
                    probe.frame = 0;
                    probe.objs = [{
                        type: 'rasterFx',
                        phase: 'telegraph',
                        life: 10,
                        maxLife: 10,
                        delay: 0
                    }];
                    probe.particles = [];
                    probe.floatTexts = [];
                    probe.canvas = {
                        getBoundingClientRect: () => ({
                            left: 0, top: 0, width: 420, height: 760
                        })
                    };
                    probe.callbacks = { onMinigameState: () => {} };
                    probe.spawnParticles = () => {};
                    probe.floatText = () => {};
                    probe.minigame = {
                        id: 'chalk_shooter',
                        reward: 120,
                        hits: 0,
                        shots: 0,
                        score: 0,
                        rewardEarned: 0,
                        targets: [{
                            x: 210,
                            y: 380,
                            radius: 30,
                            hp: 1,
                            maxHp: 1,
                            kind: 'normal',
                            vfxEnemyId: 'slime'
                        }],
                        crosshair: { x: 210, y: 380 }
                    };
                    probe.handleMinigameInput('start', 210, 380);
                    const portraitFx = probe.objs.filter(
                        obj => obj.type === 'rasterFx'
                            && obj.orientation === 'portrait'
                    );
                    return {
                        hits: probe.minigame.hits,
                        targets: probe.minigame.targets.length,
                        portraitFx: portraitFx.length,
                        allHavePortraitSafeArea: portraitFx.every(
                            obj => obj.portraitSafeArea
                                && obj.portraitSafeArea.axis === 'vertical'
                        )
                    };
                }"""
            )
            check(
                portrait_minigame["hits"] == 1
                and portrait_minigame["targets"] == 0,
                "portrait raster VFX does not intercept minigame input",
            )
            check(
                portrait_minigame["portraitFx"] >= 2
                and portrait_minigame["allHavePortraitSafeArea"],
                "portrait minigame hit emits portrait-safe raster VFX",
            )
        except PlaywrightError as error:
            failures += 1
            print(f"[FAIL] Portrait minigame VFX runtime threw: {error}")

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

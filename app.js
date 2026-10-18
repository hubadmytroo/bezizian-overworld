/*
 * Copyright (c) 2026 Dmytro (@bezizian / @hubadmytroo) — BEZIZIAN Studio.
 * ALL RIGHTS RESERVED. All songs, clips, characters, and code are proprietary.
 */
/**
 * BEZIZIAN OVERWORLD — Interactive Spatial Audio, Chronological Instagram Reels & Photo Gallery
 * Bilingual (EN / UK). Zero Russian characters.
 */

(function () {
  "use strict";

  const TRACKS = window.BEZIZIAN_TRACKS || [];
  const REELS = window.BEZIZIAN_REELS || [];
  const GALLERY = window.BEZIZIAN_GALLERY || [];
  const I18N = window.BEZIZIAN_I18N || {};
  const EXPRESSIONS = window.DUDA_EXPRESSIONS || [];

  const STAMP_TEXTS = {
    en: [
      "PERMIT: PENDING · BRING FISH TUESDAY",
      "APPROVED BY SEA LION · ARF! ARF!",
      "ELEVATOR 4B: TUBA CLEARED",
      "PERFECT! · 100% RHYTHM VERIFIED",
      "CITY PLAYGROUND: SPARK AUTHORIZED"
    ],
    uk: [
      "ДОЗВІЛ: ОЧІКУЄ · ПРИНЕСИ РИБУ У ВІВТОРОК",
      "СХВАЛЕНО МОРСЬКИМ ЛЕВОМ · АУ-АУ!",
      "ЛІФТ 4B: ТУБУ ДОЗВОЛЕНО",
      "PERFECT! · 100% РИТМ ПІДТВЕРДЖЕНО",
      "МІСЬКИЙ МАЙДАНЧИК: ІСКРУ ДОЗВОЛЕНО"
    ]
  };

  // Application State
  const state = {
    lang: "en",
    currentTrackIndex: 5, // Start on 06 · Our Empty Playground (New Premiere) while strip shows 01..06
    activeClipVariantIndex: 0,
    isPlaying: false,
    activeTab: "video",
    activeLyricIndex: -1,
    lastFlashedLyricIndex: -1,
    rainActive: true,
    stampMode: false,
    ambienceActive: false,
    selectedExpressionId: 1,
    barkCounter: 0,
    stampCounter: 0,
    galleryFilter: "all",
    filteredGallery: [],
    lightboxIndex: 0,
    fsCinemaOpen: false
  };

  // Virtual World Dimensions & Camera State
  const WORLD = { width: 2400, height: 1440 };
  const camera = {
    x: WORLD.width * 0.56,
    y: WORLD.height * 0.36,
    zoom: 1.08,
    targetX: WORLD.width * 0.67,
    targetY: WORLD.height * 0.21,
    targetZoom: 1.35,
    vx: 0,
    vy: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    pointerMoved: false
  };

  // Primary Audio & Ambience
  const mainAudio = new Audio();
  mainAudio.preload = "auto";
  mainAudio.crossOrigin = "anonymous";

  const ambAudio = new Audio("sfx/amb_bed.wav");
  ambAudio.loop = true;
  ambAudio.volume = 0.22;

  const sfxFiles = {
    bark1: "sfx/au_long.wav",
    bark2: "sfx/arf_1.wav",
    bark3: "sfx/arf_2.wav",
    shutter: "sfx/shutter.wav",
    stamp: "sfx/paper_wrap.wav",
    splash: "sfx/splash.wav",
    horn: "sfx/horn_far.wav"
  };

  let audioCtx = null;
  let analyser = null;
  let freqData = null;
  const audioEnergy = { sub: 0.12, brass: 0.1, vox: 0.08 };

  // DOM References
  const viewportEl = document.getElementById("overworld-viewport");
  const canvas = document.getElementById("overworld-canvas");
  const ctx = canvas.getContext("2d");
  const markersLayer = document.getElementById("map-markers-layer");
  const stampLayer = document.getElementById("stamp-layer");
  const drawerReelVideo = document.getElementById("drawer-reel-video");
  const fsCinemaModal = document.getElementById("fullscreen-cinema-modal");
  const fsCinemaVideo = document.getElementById("fs-cinema-video");

  const mapImage = new Image();
  let mapImageLoaded = false;
  mapImage.onload = function () {
    mapImageLoaded = true;
  };
  mapImage.src = "images/overworld/overworld_city_map.jpg";

  const ripples = [];
  const sparks = [];
  const rainDrops = [];
  const markerDomNodes = [];

  for (let i = 0; i < 95; i++) {
    sparks.push({
      wx: Math.random() * WORLD.width,
      wy: Math.random() * WORLD.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.4 - Math.random() * 1.4,
      size: 1.5 + Math.random() * 3.2,
      alpha: 0.25 + Math.random() * 0.7,
      hue: Math.random() > 0.45 ? "#FF5A1F" : "#F4A23E"
    });
  }

  for (let i = 0; i < 130; i++) {
    rainDrops.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      len: 14 + Math.random() * 18,
      speed: 13 + Math.random() * 9
    });
  }

  // ============================================================================
  // NEW YORK CITY LIVE TIME OF DAY · LIVE WEATHER · 4 SEASONS ENGINE
  // ============================================================================
  const nycEnv = {
    todOverride: "auto",     // "auto" | "dawn" | "day" | "sunset" | "night"
    weatherOverride: "auto", // "auto" | "clear" | "rain" | "snow" | "storm" | "fog"
    seasonOverride: "auto",  // "auto" | "winter" | "spring" | "summer" | "autumn"
    liveTimeStr: "--:--",
    liveHourFloat: 22.0,
    liveTod: "night",
    liveSeason: "autumn",
    liveWeather: "clear",
    liveTempC: null,
    liveTempF: null,
    liveWindKmh: 12,
    liveWeatherDesc: "CLEAR",
    stormFlashAlpha: 0,
    popoverOpen: false
  };

  // Multi-depth Snowflakes (190 flakes across 3 depth layers)
  const snowFlakes = [];
  for (let i = 0; i < 190; i++) {
    const layer = i < 45 ? 2 : i < 120 ? 1 : 0; // 2=foreground big, 1=mid, 0=distant powder
    snowFlakes.push({
      x: Math.random() * 2000,
      y: Math.random() * 1200,
      r: layer === 2 ? 3.2 + Math.random() * 2.2 : layer === 1 ? 1.8 + Math.random() * 1.4 : 1.0 + Math.random() * 0.9,
      speedY: layer === 2 ? 1.8 + Math.random() * 1.3 : layer === 1 ? 1.1 + Math.random() * 0.9 : 0.65 + Math.random() * 0.5,
      driftX: (Math.random() - 0.35) * 0.8,
      swayAmp: 0.4 + Math.random() * 1.1,
      swayFreq: 0.01 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      alpha: layer === 2 ? 0.88 : layer === 1 ? 0.68 : 0.45,
      star: layer === 2 && Math.random() > 0.45
    });
  }

  // Swirling World-Space Autumn Leaves (75 leaves)
  const autumnLeaves = [];
  const AUTUMN_COLORS = ["#EA580C", "#F59E0B", "#DC2626", "#D97706", "#B45309"];
  for (let i = 0; i < 75; i++) {
    autumnLeaves.push({
      wx: Math.random() * WORLD.width,
      wy: Math.random() * WORLD.height,
      vx: 0.65 + Math.random() * 1.15,
      vy: 0.45 + Math.random() * 0.85,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.06,
      size: 4.2 + Math.random() * 3.8,
      color: AUTUMN_COLORS[i % AUTUMN_COLORS.length],
      swayPhase: Math.random() * Math.PI * 2
    });
  }

  // Floating World-Space Spring Cherry/Magnolia Petals (70 petals)
  const springPetals = [];
  const SPRING_COLORS = ["#F9A8D4", "#FBCFE8", "#FFF1F2", "#F472B6"];
  for (let i = 0; i < 70; i++) {
    springPetals.push({
      wx: Math.random() * WORLD.width,
      wy: Math.random() * WORLD.height,
      vx: 0.45 + Math.random() * 0.75,
      vy: 0.3 + Math.random() * 0.55,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      size: 3.2 + Math.random() * 2.6,
      color: SPRING_COLORS[i % SPRING_COLORS.length],
      swayPhase: Math.random() * Math.PI * 2
    });
  }

  // Glowing World-Space Summer Fireflies (60 fireflies)
  const summerFireflies = [];
  for (let i = 0; i < 60; i++) {
    summerFireflies.push({
      wx: (0.15 + Math.random() * 0.78) * WORLD.width,
      wy: (0.22 + Math.random() * 0.65) * WORLD.height,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.45,
      phase: Math.random() * Math.PI * 2,
      size: 2.2 + Math.random() * 2.2
    });
  }

  // Volumetric Harbor Fog Banks
  const fogBanks = [];
  for (let i = 0; i < 7; i++) {
    fogBanks.push({
      xRatio: Math.random(),
      yRatio: 0.12 + (i / 7) * 0.75,
      wRatio: 0.45 + Math.random() * 0.35,
      hRatio: 0.16 + Math.random() * 0.12,
      speed: (0.00018 + Math.random() * 0.00022) * (i % 2 === 0 ? 1 : -1),
      alpha: 0.14 + Math.random() * 0.12
    });
  }

  function getEffectiveTod() {
    return nycEnv.todOverride === "auto" ? nycEnv.liveTod : nycEnv.todOverride;
  }
  function getEffectiveWeather() {
    return nycEnv.weatherOverride === "auto" ? nycEnv.liveWeather : nycEnv.weatherOverride;
  }
  function getEffectiveSeason() {
    return nycEnv.seasonOverride === "auto" ? nycEnv.liveSeason : nycEnv.seasonOverride;
  }

  function updateNycClockAndSeason() {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour12: false,
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).formatToParts(now);

      const map = {};
      parts.forEach((p) => {
        map[p.type] = p.value;
      });
      const month = parseInt(map.month || "10", 10);
      let hour24 = parseInt(map.hour || "22", 10);
      if (hour24 === 24) hour24 = 0;
      const minute = parseInt(map.minute || "0", 10);

      nycEnv.liveHourFloat = hour24 + minute / 60;
      const ampm = hour24 >= 12 ? "PM" : "AM";
      const hr12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
      nycEnv.liveTimeStr = `${String(hr12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`;

      // Determine Time of Day in New York
      const h = nycEnv.liveHourFloat;
      if (h >= 5.5 && h < 8.25) {
        nycEnv.liveTod = "dawn";
      } else if (h >= 8.25 && h < 16.75) {
        nycEnv.liveTod = "day";
      } else if (h >= 16.75 && h < 19.75) {
        nycEnv.liveTod = "sunset";
      } else {
        nycEnv.liveTod = "night";
      }

      // Determine Season in New York
      if (month === 12 || month === 1 || month === 2) {
        nycEnv.liveSeason = "winter";
      } else if (month >= 3 && month <= 5) {
        nycEnv.liveSeason = "spring";
      } else if (month >= 6 && month <= 8) {
        nycEnv.liveSeason = "summer";
      } else {
        nycEnv.liveSeason = "autumn";
      }
    } catch (_) {}

    syncNycEnvHud();
  }

  async function fetchLiveNycWeather() {
    try {
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=America%2FNew_York";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather fetch failed");
      const data = await res.json();
      if (data && data.current) {
        const c = data.current;
        const tempC = Math.round(c.temperature_2m);
        nycEnv.liveTempC = tempC;
        nycEnv.liveTempF = Math.round((tempC * 9) / 5 + 32);
        nycEnv.liveWindKmh = Math.round(c.wind_speed_10m || 10);
        const code = Number(c.weather_code || 0);

        if ([71, 73, 75, 77, 85, 86].includes(code)) {
          nycEnv.liveWeather = "snow";
          nycEnv.liveWeatherDesc = "SNOW";
        } else if ([95, 96, 99].includes(code)) {
          nycEnv.liveWeather = "storm";
          nycEnv.liveWeatherDesc = "THUNDERSTORM";
        } else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
          nycEnv.liveWeather = "rain";
          nycEnv.liveWeatherDesc = "RAIN";
        } else if ([45, 48].includes(code)) {
          nycEnv.liveWeather = "fog";
          nycEnv.liveWeatherDesc = "HARBOR FOG";
        } else if ([2, 3].includes(code)) {
          nycEnv.liveWeather = "clear";
          nycEnv.liveWeatherDesc = "CLOUDY";
        } else {
          nycEnv.liveWeather = "clear";
          nycEnv.liveWeatherDesc = "CLEAR";
        }
      }
    } catch (_) {
      // Fallback if offline
      if (nycEnv.liveTempC === null) {
        nycEnv.liveTempC = 12;
        nycEnv.liveTempF = 54;
      }
    }
    syncNycEnvHud();
  }

  function syncNycEnvHud() {
    const tod = getEffectiveTod();
    const weather = getEffectiveWeather();
    const season = getEffectiveSeason();
    const isAuto =
      nycEnv.todOverride === "auto" &&
      nycEnv.weatherOverride === "auto" &&
      nycEnv.seasonOverride === "auto";

    // Keep state.rainActive synced for backwards compatibility
    state.rainActive = weather === "rain" || weather === "storm";

    const rainBtn = document.getElementById("toy-rain-btn");
    const snowBtn = document.getElementById("toy-snow-btn");
    if (rainBtn) rainBtn.classList.toggle("is-active", weather === "rain" || weather === "storm");
    if (snowBtn) snowBtn.classList.toggle("is-active", weather === "snow");

    const envBtn = document.getElementById("nyc-env-btn");
    const envIcon = document.getElementById("nyc-env-icon");
    const envLabel = document.getElementById("nyc-env-label");
    const telemetryEl = document.getElementById("nyc-pop-telemetry");
    const autoBtn = document.getElementById("nyc-sync-auto-btn");

    if (envBtn) {
      envBtn.classList.toggle("is-manual", !isAuto);
      envBtn.classList.toggle("is-synced", isAuto);
    }
    if (autoBtn) {
      autoBtn.classList.toggle("is-active", isAuto);
    }

    const weatherIcons = {
      snow: "❄️",
      rain: "🌧️",
      storm: "⛈️",
      fog: "🌫️",
      clear: tod === "day" ? "☀️" : tod === "dawn" ? "🌅" : tod === "sunset" ? "🌇" : "🌙"
    };
    const seasonShort = {
      winter: "❄️ WINTER",
      spring: "🌸 SPRING",
      summer: "☀️ SUMMER",
      autumn: "🍂 AUTUMN"
    };

    if (envIcon) envIcon.textContent = weatherIcons[weather] || "🗽";
    const tempPart = nycEnv.liveTempC !== null ? `${nycEnv.liveTempC}°C` : "";
    const modePrefix = isAuto ? "NYC" : "NYC*";
    if (envLabel) {
      envLabel.textContent = `${modePrefix} ${nycEnv.liveTimeStr}${tempPart ? " · " + tempPart : ""} · ${seasonShort[season] || "AUTUMN"}`;
    }

    if (telemetryEl) {
      const statusMode = isAuto ? "LIVE MANHATTAN SYNC" : "MANUAL PREVIEW OVERRIDE";
      const tStr = nycEnv.liveTempC !== null ? `${nycEnv.liveTempC}°C (${nycEnv.liveTempF}°F)` : "SYNCED";
      telemetryEl.textContent = `${statusMode} · ${nycEnv.liveTimeStr} · ${tStr} · ${weather.toUpperCase()} · ${season.toUpperCase()}`;
    }

    // Highlight active pills in popover
    document.querySelectorAll("#nyc-tod-pills .nyc-opt-pill").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.tod === nycEnv.todOverride);
    });
    document.querySelectorAll("#nyc-weather-pills .nyc-opt-pill").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.weather === nycEnv.weatherOverride);
    });
    document.querySelectorAll("#nyc-season-pills .nyc-opt-pill").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.season === nycEnv.seasonOverride);
    });
  }

  // World-space seasonal & time-of-day rendering on top of the city map
  function drawNycWorldAtmosphere(ctx) {
    const tod = getEffectiveTod();
    const weather = getEffectiveWeather();
    const season = getEffectiveSeason();
    const t = performance.now() * 0.001;

    // 1. TIME OF DAY LIGHTING & SKY GRADING OVER CITY DIORAMA
    ctx.save();
    if (tod === "day") {
      // Lift nocturnal shadows into crisp New York daylight
      ctx.globalCompositeOperation = "screen";
      const dayGrad = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
      dayGrad.addColorStop(0, "rgba(120, 180, 250, 0.30)");
      dayGrad.addColorStop(0.5, "rgba(255, 232, 185, 0.22)");
      dayGrad.addColorStop(1, "rgba(95, 155, 225, 0.24)");
      ctx.fillStyle = dayGrad;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);

      // Diagonal warm sunbeams streaming from top-left across rooftops & marina
      const beamGrad = ctx.createLinearGradient(0, 0, WORLD.width * 0.85, WORLD.height * 0.85);
      beamGrad.addColorStop(0, "rgba(255, 240, 190, 0.22)");
      beamGrad.addColorStop(0.6, "rgba(255, 210, 130, 0.08)");
      beamGrad.addColorStop(1, "rgba(255, 200, 110, 0)");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    } else if (tod === "dawn") {
      // Rose-gold & lavender NYC sunrise glow
      ctx.globalCompositeOperation = "screen";
      const dawnGrad = ctx.createLinearGradient(WORLD.width, 0, 0, WORLD.height);
      dawnGrad.addColorStop(0, "rgba(255, 135, 115, 0.28)");
      dawnGrad.addColorStop(0.45, "rgba(235, 150, 185, 0.18)");
      dawnGrad.addColorStop(1, "rgba(95, 110, 210, 0.14)");
      ctx.fillStyle = dawnGrad;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    } else if (tod === "sunset") {
      // Rich Golden-Hour Sunset (copper-orange & magenta dusk)
      ctx.globalCompositeOperation = "screen";
      const sunGrad = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
      sunGrad.addColorStop(0, "rgba(255, 94, 32, 0.28)");
      sunGrad.addColorStop(0.5, "rgba(245, 145, 55, 0.20)");
      sunGrad.addColorStop(1, "rgba(175, 48, 115, 0.18)");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
    ctx.restore();

    // 2. WINTER OR SNOW ACCUMULATION ON ROOFTOPS, CAR, AWNING, AND CURBS
    if (season === "winter" || weather === "snow") {
      ctx.save();
      // Frosty blue atmospheric rim
      ctx.fillStyle = "rgba(185, 225, 255, 0.07)";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);

      // Soft snowdrift patches on ledges, parked coupe roof, cafe awning, stoop stairs, and curbs
      const snowPatches = [
        { x: 0.625, y: 0.508, rx: 46, ry: 15, rot: -0.22 }, // Parked green coupe roof snow
        { x: 0.592, y: 0.526, rx: 28, ry: 10, rot: -0.25 }, // Green coupe hood snow
        { x: 0.448, y: 0.445, rx: 72, ry: 18, rot: 0.22 },  // Corner cafe awning snow
        { x: 0.778, y: 0.455, rx: 64, ry: 16, rot: 0.25 },  // Courtyard archway ledge snow
        { x: 0.415, y: 0.348, rx: 48, ry: 14, rot: -0.24 }, // Brownstone stoop steps snow
        { x: 0.215, y: 0.435, rx: 68, ry: 15, rot: -0.28 }, // Marina promenade snowbank
        { x: 0.525, y: 0.635, rx: 55, ry: 12, rot: 0.18 },  // Crosswalk curb snowbank
        { x: 0.854, y: 0.318, rx: 46, ry: 9, rot: 0.25 }    // Floor 5 balcony railing snow cap
      ];
      snowPatches.forEach((sp) => {
        const sx = sp.x * WORLD.width;
        const sy = sp.y * WORLD.height;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sp.rot);
        const sg = ctx.createRadialGradient(0, 0, 2, 0, 0, sp.rx);
        sg.addColorStop(0, "rgba(245, 250, 255, 0.72)");
        sg.addColorStop(0.6, "rgba(215, 235, 255, 0.42)");
        sg.addColorStop(1, "rgba(200, 225, 255, 0)");
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.ellipse(0, 0, sp.rx, sp.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    // 3. AUTUMN: SWIRLING GOLDEN & CRIMSON LEAVES ACROSS THE STREETS
    if (season === "autumn" && weather !== "snow") {
      ctx.save();
      const windBoost = weather === "storm" ? 2.4 : 1.0;
      autumnLeaves.forEach((lf) => {
        lf.wx += lf.vx * windBoost + Math.sin(t * 2.0 + lf.swayPhase) * 0.45;
        lf.wy += lf.vy * windBoost + Math.cos(t * 1.6 + lf.swayPhase) * 0.25;
        lf.rot += lf.rotSpeed * windBoost;
        if (lf.wx > WORLD.width + 20) lf.wx = -20;
        if (lf.wy > WORLD.height + 20) {
          lf.wy = -20;
          lf.wx = Math.random() * WORLD.width;
        }
        ctx.save();
        ctx.translate(lf.wx, lf.wy);
        ctx.rotate(lf.rot);
        ctx.fillStyle = lf.color;
        ctx.globalAlpha = 0.86;
        ctx.beginPath();
        ctx.ellipse(0, 0, lf.size, lf.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    // 4. SPRING: DRIFTING PINK & WHITE CHERRY BLOSSOM PETALS
    if (season === "spring" && weather !== "snow") {
      ctx.save();
      springPetals.forEach((pt) => {
        pt.wx += pt.vx + Math.sin(t * 1.8 + pt.swayPhase) * 0.55;
        pt.wy += pt.vy + Math.cos(t * 1.4 + pt.swayPhase) * 0.25;
        pt.rot += pt.rotSpeed;
        if (pt.wx > WORLD.width + 20) pt.wx = -20;
        if (pt.wy > WORLD.height + 20) {
          pt.wy = -20;
          pt.wx = Math.random() * WORLD.width;
        }
        ctx.save();
        ctx.translate(pt.wx, pt.wy);
        ctx.rotate(pt.rot);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = 0.84;
        ctx.beginPath();
        ctx.ellipse(0, 0, pt.size, pt.size * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    // 5. SUMMER: GLOWING GOLDEN-EMERALD FIREFLIES AT DUSK/NIGHT & HARBOR SUN SPARKLES BY DAY
    if (season === "summer") {
      ctx.save();
      summerFireflies.forEach((ff) => {
        ff.wx += ff.vx + Math.sin(t * 1.5 + ff.phase) * 0.3;
        ff.wy += ff.vy + Math.cos(t * 1.3 + ff.phase) * 0.3;
        const pulse = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.6 + ff.phase));
        const fg = ctx.createRadialGradient(ff.wx, ff.wy, 0.5, ff.wx, ff.wy, ff.size * 3.5);
        fg.addColorStop(0, `rgba(235, 255, 120, ${(0.88 * pulse).toFixed(3)})`);
        fg.addColorStop(1, "rgba(190, 242, 100, 0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(ff.wx, ff.wy, ff.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  // Screen-space weather rendering (Snowfall, Rain/Storm, Harbor Fog)
  function drawNycScreenWeather(ctx, vw, vh) {
    const weather = getEffectiveWeather();
    const season = getEffectiveSeason();
    const t = performance.now() * 0.001;

    // 1. VOLUMETRIC HARBOR FOG (when weather === "fog" or dawn mist)
    if (weather === "fog") {
      ctx.save();
      fogBanks.forEach((fb) => {
        fb.xRatio += fb.speed;
        if (fb.xRatio > 1.3) fb.xRatio = -0.4;
        if (fb.xRatio < -0.4) fb.xRatio = 1.3;
        const fx = fb.xRatio * vw;
        const fy = fb.yRatio * vh;
        const fw = fb.wRatio * vw;
        const fh = fb.hRatio * vh;
        const fg = ctx.createRadialGradient(fx, fy, fw * 0.1, fx, fy, fw * 0.65);
        fg.addColorStop(0, `rgba(210, 222, 238, ${fb.alpha.toFixed(3)})`);
        fg.addColorStop(1, "rgba(210, 222, 238, 0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.ellipse(fx, fy, fw * 0.65, fh * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 2. RAIN & THUNDERSTORM
    if (weather === "rain" || weather === "storm") {
      const isStorm = weather === "storm";
      ctx.save();
      ctx.strokeStyle = isStorm ? "rgba(210, 228, 255, 0.34)" : "rgba(195, 215, 255, 0.22)";
      ctx.lineWidth = isStorm ? 1.35 : 1.1;
      const windSlant = isStorm ? -5.8 : -3.5;
      const speedMult = isStorm ? 1.45 : 1.0;
      ctx.beginPath();
      rainDrops.forEach((d) => {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + windSlant, d.y + d.len * speedMult);
        d.x += windSlant * 0.65;
        d.y += d.speed * speedMult;
        if (d.y > vh) {
          d.y = -20;
          d.x = Math.random() * vw;
        }
        if (d.x < 0) d.x = vw;
      });
      ctx.stroke();
      ctx.restore();

      // Spawn occasional rain puddle splashes in world space
      if (Math.random() < (isStorm ? 0.45 : 0.2)) {
        spawnWorldRipple(
          (0.2 + Math.random() * 0.65) * WORLD.width,
          (0.35 + Math.random() * 0.45) * WORLD.height,
          "rgba(195, 220, 255, 0.32)",
          32
        );
      }

      // Distant NYC lightning flash during thunderstorm
      if (isStorm) {
        if (nycEnv.stormFlashAlpha <= 0.01 && Math.random() < 0.006) {
          nycEnv.stormFlashAlpha = 0.55;
        }
        if (nycEnv.stormFlashAlpha > 0.01) {
          ctx.save();
          ctx.fillStyle = `rgba(225, 238, 255, ${nycEnv.stormFlashAlpha.toFixed(3)})`;
          ctx.fillRect(0, 0, vw, vh);
          ctx.restore();
          nycEnv.stormFlashAlpha *= 0.86;
        }
      }
    }

    // 3. SNOWFALL (full snowfall when weather === "snow", or gentle flurries in winter)
    if (weather === "snow" || (season === "winter" && weather === "clear")) {
      const count = weather === "snow" ? snowFlakes.length : 45; // 190 full snow vs 45 light winter flurries
      ctx.save();
      for (let i = 0; i < count; i++) {
        const sf = snowFlakes[i];
        const sway = Math.sin(t * 2.2 + sf.phase) * sf.swayAmp;
        sf.x += sf.driftX + sway;
        sf.y += sf.speedY;
        if (sf.y > vh + 12) {
          sf.y = -12;
          sf.x = Math.random() * vw;
        }
        if (sf.x > vw + 12) sf.x = -12;
        if (sf.x < -12) sf.x = vw + 12;

        ctx.fillStyle = `rgba(248, 252, 255, ${sf.alpha})`;
        ctx.beginPath();
        ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2);
        ctx.fill();

        // Foreground crystalline snow glint
        if (sf.star) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${(sf.alpha * 0.7).toFixed(2)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(sf.x - sf.r * 1.7, sf.y);
          ctx.lineTo(sf.x + sf.r * 1.7, sf.y);
          ctx.moveTo(sf.x, sf.y - sf.r * 1.7);
          ctx.lineTo(sf.x, sf.y + sf.r * 1.7);
          ctx.stroke();
        }
      }

      // Subtle frosty screen-edge vignette during active snowfall
      if (weather === "snow") {
        const frostGrad = ctx.createRadialGradient(vw * 0.5, vh * 0.5, Math.min(vw, vh) * 0.38, vw * 0.5, vh * 0.5, Math.max(vw, vh) * 0.72);
        frostGrad.addColorStop(0, "rgba(220, 240, 255, 0)");
        frostGrad.addColorStop(1, "rgba(215, 238, 255, 0.14)");
        ctx.fillStyle = frostGrad;
        ctx.fillRect(0, 0, vw, vh);

        if (Math.random() < 0.14) {
          spawnWorldRipple(
            (0.22 + Math.random() * 0.62) * WORLD.width,
            (0.35 + Math.random() * 0.45) * WORLD.height,
            "rgba(235, 248, 255, 0.35)",
            24
          );
        }
      }
      ctx.restore();
    }
  }

  // ============================================================================
  // GINGER TABBY CAT RESIDENT — COLLISION-FREE ROUTE, GROOMING, NAPPING & DJ
  // ============================================================================
  const GINGER_CAT_ROUTE = [
    // 1. Inside ochre courtyard archway (Episode 2) -> out onto cobblestone sidewalk
    {
      x: 0.762,
      y: 0.542,
      pose: "look",
      pause: 110,
      bubble: "🐾 Courtyard Arch",
      statusEn: "Exploring the Ochre Courtyard Arch",
      statusUk: "Гуляє під аркою двору"
    },
    { x: 0.742, y: 0.582 },
    {
      x: 0.712,
      y: 0.595,
      pose: "lie",
      pause: 260,
      bubble: "PURR... 💤",
      statusEn: "💤 Curled up & lying down under the warm archway lantern",
      statusUk: "💤 Лежить калачиком і муркоче під ліхтарем арки"
    },
    // 2. Sidewalk strictly between the cafe window wall and the parked 90s green coupe
    {
      x: 0.682,
      y: 0.574,
      statusEn: "🐾 Strolling past the parked 90s green coupe",
      statusUk: "🐾 Неспішно йде по тротуару повз зелене купе"
    },
    { x: 0.648, y: 0.562 },
    { x: 0.592, y: 0.602 },
    { x: 0.548, y: 0.632 },
    { x: 0.498, y: 0.635 },
    // 3. Warm Corner Cafe entrance — sits down to groom & wash behind its ear!
    {
      x: 0.488,
      y: 0.598,
      pose: "groom",
      pause: 250,
      bubble: "🧼 *lick-lick* 🐾",
      statusEn: "🧼 Sitting & washing its face with a paw by the Corner Café",
      statusUk: "🧼 Сидить і вмивається лапкою біля дверей кафе"
    },
    { x: 0.465, y: 0.614 },
    { x: 0.448, y: 0.572 },
    {
      x: 0.445,
      y: 0.538,
      pose: "look",
      pause: 115,
      bubble: "MEOW ♪",
      statusEn: "Listening to jazz-brass outside the steamed café window",
      statusUk: "Слухає музику під теплим вікном кафе"
    },
    { x: 0.448, y: 0.572 },
    // 4. Across the center of the wet white zebra crosswalk (clear of lamppost!)
    {
      x: 0.455,
      y: 0.618,
      speedMult: 1.22,
      statusEn: "🐾 Trotting across the wet white zebra crosswalk",
      statusUk: "🐾 Переходить дорогу по пішохідній зебрі"
    },
    { x: 0.398, y: 0.648, speedMult: 1.22 },
    { x: 0.348, y: 0.678, speedMult: 1.22 },
    { x: 0.308, y: 0.696 },
    { x: 0.262, y: 0.668 },
    // 5. Marina Harbor Promenade — sits down to groom & sniff the ocean breeze!
    {
      x: 0.218,
      y: 0.612,
      pose: "groom",
      pause: 240,
      bubble: "🧼 Harbor grooming 🐟",
      statusEn: "🧼 Sitting & grooming on the Marina Promenade by the yachts",
      statusUk: "🧼 Сидить і чистить шерсть на набережній біля яхт"
    },
    {
      x: 0.235,
      y: 0.555,
      statusEn: "🐾 Walking along the Marina under the warm festoon bulbs",
      statusUk: "🐾 Прогулюється набережною під гірляндами"
    },
    { x: 0.275, y: 0.505 },
    { x: 0.325, y: 0.465 },
    { x: 0.365, y: 0.432 },
    { x: 0.395, y: 0.412 },
    // 6. Up the Brownstone Stoop Stairs (exact stone steps!) -> lies down on top landing!
    {
      x: 0.402,
      y: 0.358,
      speedMult: 0.88,
      statusEn: "🐾 Climbing up the Brownstone stoop stone stairs",
      statusUk: "🐾 Піднімається кам'яними сходами браунстоуну"
    },
    { x: 0.418, y: 0.332, speedMult: 0.88 },
    {
      x: 0.432,
      y: 0.308,
      pose: "lie",
      pause: 270,
      bubble: "💤 Cozy Stoop Nap",
      statusEn: "💤 Lying down on the top Brownstone stoop landing",
      statusUk: "💤 Лежить і відпочиває на верхній сходинці ганку"
    },
    // 7. Back down the stoop stairs & along the sidewalk to the cafe and archway
    { x: 0.418, y: 0.332, speedMult: 0.92 },
    { x: 0.402, y: 0.358, speedMult: 0.92 },
    { x: 0.395, y: 0.412 },
    { x: 0.365, y: 0.432 },
    {
      x: 0.412,
      y: 0.498,
      statusEn: "🐾 Strolling back down the street toward the café",
      statusUk: "🐾 Повертається вздовж вулиці до кафе"
    },
    { x: 0.448, y: 0.572 },
    { x: 0.465, y: 0.614 },
    { x: 0.498, y: 0.635 },
    { x: 0.548, y: 0.632 },
    {
      x: 0.592,
      y: 0.602,
      pose: "groom",
      pause: 210,
      bubble: "🧼 Purrrr... 🐾",
      statusEn: "🧼 Sitting & grooming its white paws on the sidewalk",
      statusUk: "🧼 Сидить і чистить білі лапки на тротуарі"
    },
    { x: 0.648, y: 0.562 },
    { x: 0.682, y: 0.574 },
    { x: 0.712, y: 0.595 },
    { x: 0.742, y: 0.582 }
  ];

  const gingerCat = {
    segIndex: 0,
    wx: GINGER_CAT_ROUTE[0].x * WORLD.width,
    wy: GINGER_CAT_ROUTE[0].y * WORLD.height,
    facing: -1, // -1 = left, +1 = right
    smoothFacing: -1,
    smoothSlope: 0,
    walkPhase: 0,
    pose: "walk", // "walk" | "groom" | "lie" | "look"
    pauseFrames: 0,
    bubbleText: "",
    bubbleTimer: 0,
    hopOffset: 0,
    hopVel: 0,
    stepCounter: 0,
    followCam: false,
    statusEn: "🐾 Strolling along the sidewalk...",
    statusUk: "🐾 Прогулюється тротуаром...",
    hearts: []
  };
  const catPawPrints = [];
  const catFishTreats = [];

  function playCatSound(mode = "meow") {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctxAudio = audioCtx || new AudioContextClass();
      if (ctxAudio.state === "suspended") ctxAudio.resume().catch(() => {});
      const now = ctxAudio.currentTime;

      if (mode === "purr") {
        const osc = ctxAudio.createOscillator();
        const gain = ctxAudio.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(28, now);
        osc.frequency.linearRampToValueAtTime(34, now + 0.35);
        osc.frequency.linearRampToValueAtTime(26, now + 0.7);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        osc.connect(gain);
        gain.connect(ctxAudio.destination);
        osc.start(now);
        osc.stop(now + 0.78);
      } else {
        const osc = ctxAudio.createOscillator();
        const gain = ctxAudio.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(890, now + 0.11);
        osc.frequency.exponentialRampToValueAtTime(610, now + 0.36);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(ctxAudio.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (_) {}
  }

  function syncCatResidentHud() {
    const bar = document.getElementById("cat-resident-bar");
    const hudBtn = document.getElementById("hud-cat-btn");
    const toyBtn = document.getElementById("toy-cat-btn");
    const subEl = document.getElementById("cat-bar-sub");
    const titleEl = document.getElementById("cat-bar-title");

    if (bar) bar.classList.toggle("is-open", gingerCat.followCam);
    if (hudBtn) hudBtn.classList.toggle("is-active", gingerCat.followCam);
    if (toyBtn) toyBtn.classList.toggle("is-active", gingerCat.followCam);

    if (titleEl) {
      titleEl.textContent =
        state.lang === "uk" ? "🐱 РУДИЙ КОТИК · ЖИТЕЛЬ МІСТА" : "🐱 GINGER CAT · STREET RESIDENT";
    }
    if (subEl) {
      subEl.textContent = state.lang === "uk" ? gingerCat.statusUk : gingerCat.statusEn;
    }

    const groomBtn = document.getElementById("cat-act-groom");
    const napBtn = document.getElementById("cat-act-nap");
    const walkBtn = document.getElementById("cat-act-walk");
    if (groomBtn) groomBtn.classList.toggle("is-active", gingerCat.pose === "groom" && gingerCat.pauseFrames > 0);
    if (napBtn) napBtn.classList.toggle("is-active", gingerCat.pose === "lie" && gingerCat.pauseFrames > 0);
    if (walkBtn) walkBtn.classList.toggle("is-active", gingerCat.pauseFrames <= 0 || gingerCat.pose === "walk");
  }

  function tossFishToCat() {
    playCatSound("meow");
    setTimeout(() => playCatSound("purr"), 180);
    const startX = gingerCat.wx + (gingerCat.smoothFacing >= 0 ? 75 : -75);
    const startY = gingerCat.wy - 65;
    catFishTreats.push({
      startX,
      startY,
      targetX: gingerCat.wx,
      targetY: gingerCat.wy - 6,
      progress: 0
    });
    for (let i = 0; i < 5; i++) {
      gingerCat.hearts.push({
        ox: (Math.random() - 0.5) * 26,
        oy: -18 - Math.random() * 10,
        vy: -0.6 - Math.random() * 0.5,
        alpha: 1,
        symbol: i % 2 === 0 ? "🧡" : "🐟"
      });
    }
  }

  function setCatPoseManual(pose) {
    if (pose === "walk") {
      gingerCat.pauseFrames = 0;
      gingerCat.pose = "walk";
      gingerCat.bubbleText = "🐾 ON PATROL!";
      gingerCat.bubbleTimer = 95;
      gingerCat.statusEn = "🐾 Strolling along the neighborhood sidewalk";
      gingerCat.statusUk = "🐾 Прогулюється тротуарами міста";
      playCatSound("meow");
    } else if (pose === "groom") {
      gingerCat.pose = "groom";
      gingerCat.pauseFrames = 380;
      gingerCat.bubbleText = "🧼 *lick-lick* 🐾";
      gingerCat.bubbleTimer = 180;
      gingerCat.statusEn = "🧼 Sitting & washing behind its ear with a white paw";
      gingerCat.statusUk = "🧼 Сидить і старанно вмивається білою лапкою";
      playCatSound("purr");
    } else if (pose === "lie") {
      gingerCat.pose = "lie";
      gingerCat.pauseFrames = 420;
      gingerCat.bubbleText = "PURR... 💤";
      gingerCat.bubbleTimer = 200;
      gingerCat.statusEn = "💤 Curled up on the warm stones & purring";
      gingerCat.statusUk = "💤 Лежить калачиком на теплому камінні й муркоче";
      playCatSound("purr");
    }
    syncCatResidentHud();
  }

  function triggerCatDjPick() {
    if (!TRACKS.length) return;
    // Pick a different track from current
    let pickIdx = Math.floor(Math.random() * TRACKS.length);
    if (pickIdx === state.currentTrackIndex) {
      pickIdx = (pickIdx + 1) % TRACKS.length;
    }
    const chosen = TRACKS[pickIdx];
    gingerCat.hopVel = -6.0;
    playCatSound("meow");
    gingerCat.bubbleText = `🎵 CAT DJ: #${chosen.num} ${chosen.title.split(" (")[0]}!`;
    gingerCat.bubbleTimer = 210;
    gingerCat.statusEn = `🎧 Cat DJ picked #${chosen.num} · ${chosen.title}!`;
    gingerCat.statusUk = `🎧 Котик-DJ обрав #${chosen.num} · ${chosen.title}!`;
    for (let i = 0; i < 6; i++) {
      gingerCat.hearts.push({
        ox: (Math.random() - 0.5) * 30,
        oy: -18 - Math.random() * 10,
        vy: -0.7 - Math.random() * 0.5,
        alpha: 1,
        symbol: i % 2 === 0 ? "🎵" : "🐾"
      });
    }
    selectTrack(pickIdx, true);
    // Keep camera on the cat if followCam is active
    if (gingerCat.followCam) {
      camera.targetX = gingerCat.wx;
      camera.targetY = gingerCat.wy - 20;
      camera.targetZoom = Math.max(camera.targetZoom, 1.55);
      clampCameraTargets();
    }
    syncCatResidentHud();
  }

  function toggleCatFollowCam(forceState) {
    gingerCat.followCam = typeof forceState === "boolean" ? forceState : !gingerCat.followCam;
    if (gingerCat.followCam) {
      camera.targetX = gingerCat.wx;
      camera.targetY = gingerCat.wy - 18;
      camera.targetZoom = Math.max(camera.targetZoom, 1.62);
      clampCameraTargets();
      // On mobile, collapse the stage drawer so the cat & map are in full view!
      if (window.innerWidth <= 860) {
        const drawer = document.getElementById("stage-drawer");
        if (drawer) drawer.classList.add("is-collapsed");
        syncMobileDrawerBtnLabel();
      }
      tossFishToCat();
    }
    syncCatResidentHud();
  }

  function triggerCatMeow() {
    gingerCat.hopVel = -5.8;
    if (!gingerCat.followCam) {
      gingerCat.followCam = true;
      camera.targetX = gingerCat.wx;
      camera.targetY = gingerCat.wy - 18;
      camera.targetZoom = Math.max(camera.targetZoom, 1.58);
      clampCameraTargets();
    }
    tossFishToCat();
    const phrases = [
      "MEOW! THANKS FOR THE FISH! 🐟",
      "PURRRR... PET ME AGAIN! 🧡",
      "TRY 'CAT DJ' FOR MY FAVORITE SONG! 🎵",
      "MEOW! I RUN THIS BLOCK! 🐾"
    ];
    gingerCat.bubbleText = phrases[Math.floor(Math.random() * phrases.length)];
    gingerCat.bubbleTimer = 165;
    spawnWorldRipple(gingerCat.wx, gingerCat.wy, "#FF8C24", 85);
    spawnWorldRipple(gingerCat.wx, gingerCat.wy, "#F4A23E", 50);
    syncCatResidentHud();
  }

  // ============================================================================
  // SOUND EFFECTS & WEB AUDIO ANALYZER
  // ============================================================================
  function playSfx(key, volume = 0.65) {
    const src = sfxFiles[key];
    if (!src) return;
    try {
      const s = new Audio(src);
      s.volume = volume;
      s.play().catch(() => {});
    } catch (_) {}
  }

  function ensureAudioContext() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      const source = audioCtx.createMediaElementSource(mainAudio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      freqData = new Uint8Array(analyser.frequencyBinCount);
    } catch (_) {}
  }

  function updateAudioTelemetry() {
    const activePlaying = state.isPlaying || (state.fsCinemaOpen && !fsCinemaVideo.paused);
    if (analyser && freqData && state.isPlaying) {
      analyser.getByteFrequencyData(freqData);
      let subSum = 0;
      for (let i = 1; i <= 5; i++) subSum += freqData[i];
      let brassSum = 0;
      for (let i = 8; i <= 26; i++) brassSum += freqData[i];
      let voxSum = 0;
      for (let i = 28; i <= 60; i++) voxSum += freqData[i];

      const newSub = Math.min(1, subSum / (5 * 235));
      if (newSub - audioEnergy.sub > 0.18 && newSub > 0.55) {
        const activeTrack = TRACKS[state.currentTrackIndex];
        if (activeTrack) {
          const cx = activeTrack.mapCoords ? activeTrack.mapCoords.x * WORLD.width : WORLD.width * 0.52;
          const cy = activeTrack.mapCoords ? activeTrack.mapCoords.y * WORLD.height : WORLD.height * 0.46;
          spawnWorldRipple(
            cx + (Math.random() - 0.5) * 140,
            cy + (Math.random() - 0.5) * 90,
            activeTrack.accentColor,
            115
          );
        }
      }
      audioEnergy.sub = newSub;
      audioEnergy.brass = Math.min(1, brassSum / (19 * 210));
      audioEnergy.vox = Math.min(1, voxSum / (33 * 195));
    } else if (activePlaying) {
      const t = performance.now() * 0.008;
      audioEnergy.sub = 0.45 + 0.35 * Math.abs(Math.sin(t * 1.9));
      audioEnergy.brass = 0.35 + 0.4 * Math.abs(Math.cos(t * 2.7));
      audioEnergy.vox = 0.3 + 0.45 * Math.abs(Math.sin(t * 3.4));
    } else {
      audioEnergy.sub = 0.1;
      audioEnergy.brass = 0.08;
      audioEnergy.vox = 0.06;
    }

    const subEl = document.getElementById("meter-sub");
    const brassEl = document.getElementById("meter-brass");
    const voxEl = document.getElementById("meter-vox");
    if (subEl) subEl.style.height = `${Math.round(12 + audioEnergy.sub * 88)}%`;
    if (brassEl) brassEl.style.height = `${Math.round(12 + audioEnergy.brass * 88)}%`;
    if (voxEl) voxEl.style.height = `${Math.round(12 + audioEnergy.vox * 88)}%`;
  }

  // ============================================================================
  // SPATIAL COORDINATE PROJECTION & CAMERA CONTROLS
  // ============================================================================
  function worldToScreen(wx, wy) {
    const vw = canvas.width;
    const vh = canvas.height;
    return {
      x: (wx - camera.x) * camera.zoom + vw * 0.5,
      y: (wy - camera.y) * camera.zoom + vh * 0.5
    };
  }

  function screenToWorld(sx, sy) {
    const vw = canvas.width;
    const vh = canvas.height;
    return {
      x: (sx - vw * 0.5) / camera.zoom + camera.x,
      y: (sy - vh * 0.5) / camera.zoom + camera.y
    };
  }

  function clampCameraTargets() {
    const minZoom = Math.max(window.innerWidth / WORLD.width, window.innerHeight / WORLD.height) * 0.92;
    const maxZoom = 2.35;
    camera.targetZoom = Math.max(minZoom, Math.min(maxZoom, camera.targetZoom));

    const padX = (window.innerWidth * 0.38) / camera.targetZoom;
    const padY = (window.innerHeight * 0.38) / camera.targetZoom;
    camera.targetX = Math.max(padX, Math.min(WORLD.width - padX, camera.targetX));
    camera.targetY = Math.max(padY, Math.min(WORLD.height - padY, camera.targetY));
  }

  function flyToStage(track, zoomOverride) {
    if (!track || !track.mapCoords) {
      resetCameraOverview();
      return;
    }
    const drawerOffsetWorld = window.innerWidth > 960 ? 155 / (zoomOverride || track.mapCoords.zoom || 1.45) : 0;
    camera.targetX = track.mapCoords.x * WORLD.width + drawerOffsetWorld;
    camera.targetY = track.mapCoords.y * WORLD.height;
    camera.targetZoom = zoomOverride || track.mapCoords.zoom || 1.45;
    clampCameraTargets();
  }

  function resetCameraOverview() {
    if (gingerCat && gingerCat.followCam) {
      gingerCat.followCam = false;
      syncCatResidentHud();
    }
    camera.targetX = WORLD.width * 0.54;
    camera.targetY = WORLD.height * 0.48;
    camera.targetZoom = Math.max(window.innerWidth / WORLD.width, window.innerHeight / WORLD.height) * 1.06;
    clampCameraTargets();
    playSfx("splash", 0.35);
  }

  function spawnWorldRipple(wx, wy, color = "#FF5A1F", maxR = 85) {
    ripples.push({ wx, wy, r: 4, maxR, alpha: 0.85, color });
    if (ripples.length > 40) ripples.shift();
  }

  // ============================================================================
  // BUILD DOM MARKERS, UNMAPPED VAULT, QUICK STRIP, REELS WALL, GALLERY & MATRIX
  // ============================================================================
  function syncMobileDrawerBtnLabel() {
    const drawer = document.getElementById("stage-drawer");
    const btnLabel = document.getElementById("i18n-mobile-clip-btn");
    const btn = document.getElementById("mobile-open-drawer-btn");
    if (!drawer || !btnLabel || !btn) return;
    const isCollapsed = drawer.classList.contains("is-collapsed");
    if (state.lang === "uk") {
      btnLabel.textContent = isCollapsed ? "Кліп і Текст" : "На Карту 🗺️";
    } else {
      btnLabel.textContent = isCollapsed ? "Clip & Lyrics" : "Show Map 🗺️";
    }
  }

  function buildMapMarkersAndQuickStrip() {
    markersLayer.innerHTML = "";
    markerDomNodes.length = 0;
    const quickStrip = document.getElementById("district-quick-strip");
    quickStrip.innerHTML = "";
    const unmappedList = document.getElementById("unmapped-vault-list");
    if (unmappedList) unmappedList.innerHTML = "";
    const allSongsSheet = document.getElementById("all-songs-sheet-list");
    if (allSongsSheet) allSongsSheet.innerHTML = "";

    TRACKS.forEach((track, idx) => {
      if (!track.unmapped && track.mapCoords) {
        const marker = document.createElement("div");
        marker.className = "stage-marker" + (idx === state.currentTrackIndex ? " is-active" : "");
        marker.style.setProperty("--marker-accent", track.accentColor || "#FF5A1F");
        marker.dataset.index = String(idx);

        const premiereHtml = track.isPremiere
          ? `<div class="marker-premiere-crown">${track.badge[state.lang]}</div>`
          : "";

        marker.innerHTML = `
          <div class="marker-radar-ring"></div>
          ${premiereHtml}
          <div class="marker-tooltip">
            <div class="marker-tooltip-quote">"${track.hookQuote}"</div>
            <div class="marker-tooltip-specs">${track.badge[state.lang]} · ${track.bpm} BPM</div>
          </div>
          <div class="marker-pill">
            <div class="marker-thumb-wrap">
              <img class="marker-thumb" src="${track.posterImage}" alt="${track.title}" />
              <span class="marker-num-badge">${track.num}</span>
            </div>
            <div class="marker-meta">
              <span class="marker-district">${track.districtName[state.lang]}</span>
              <span class="marker-title">${track.title}</span>
            </div>
            <div class="marker-eq" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
          </div>
        `;

        marker.addEventListener("click", (e) => {
          e.stopPropagation();
          selectTrack(idx, true);
          document.getElementById("stage-drawer").classList.remove("is-collapsed");
          syncMobileDrawerBtnLabel();
        });

        markersLayer.appendChild(marker);
        markerDomNodes.push({ el: marker, track, idx });
      } else if (track.unmapped && unmappedList) {
        const uCard = document.createElement("button");
        uCard.type = "button";
        uCard.className = "unmapped-song-card" + (idx === state.currentTrackIndex ? " is-active" : "");
        uCard.dataset.index = String(idx);
        const locLabel = state.lang === "uk" ? "📍 Локація: ??? · Кліп TBA" : "📍 Location: ??? · Clip TBA";
        uCard.innerHTML = `
          <div class="unmapped-song-left">
            <span class="unmapped-song-num">${track.num}</span>
            <div class="unmapped-song-meta">
              <div class="unmapped-song-title">${track.title}</div>
              <div class="unmapped-song-loc">${locLabel}</div>
            </div>
          </div>
          <div class="unmapped-song-right">
            <span>${track.duration}</span>
            <span>▶</span>
          </div>
        `;
        uCard.addEventListener("click", () => {
          selectTrack(idx, true);
          document.getElementById("stage-drawer").classList.remove("is-collapsed");
          syncMobileDrawerBtnLabel();
        });
        unmappedList.appendChild(uCard);
      }

      // Chronological Top Quick-Jumper Button (01 .. 08)
      const qBtn = document.createElement("button");
      qBtn.type = "button";
      qBtn.className =
        "quick-stage-btn" +
        (idx === state.currentTrackIndex ? " is-active" : "") +
        (track.unmapped ? " is-unmapped" : "");
      qBtn.dataset.index = String(idx);
      const prefix = track.unmapped ? `📡${track.num}` : track.num;
      qBtn.innerHTML = `<span>${prefix}</span><span class="quick-title">${track.title.split(" (")[0]}</span>`;
      qBtn.addEventListener("click", () => {
        const isMobile = window.innerWidth <= 860;
        const drawer = document.getElementById("stage-drawer");
        if (isMobile) {
          // On mobile: first tap plays the song & flies across the map; tapping active song again opens clip/lyrics sheet
          if (idx === state.currentTrackIndex && drawer.classList.contains("is-collapsed")) {
            drawer.classList.remove("is-collapsed");
          }
          selectTrack(idx, true);
          syncMobileDrawerBtnLabel();
        } else {
          selectTrack(idx, true);
          drawer.classList.remove("is-collapsed");
          syncMobileDrawerBtnLabel();
        }
      });
      quickStrip.appendChild(qBtn);

      // Populate All 8 Songs Sheet Row (#all-songs-sheet-list)
      if (allSongsSheet) {
        const row = document.createElement("div");
        row.className =
          "song-sheet-row" +
          (idx === state.currentTrackIndex ? " is-active" : "") +
          (track.unmapped ? " is-unmapped" : "");
        row.dataset.index = String(idx);
        const subText = track.unmapped
          ? state.lang === "uk"
            ? `Нова пісня · Локація: ??? · ${track.duration}`
            : `New Song · Location: ??? · ${track.duration}`
          : `${track.districtName[state.lang]} · ${track.duration}`;
        const clipLabel = track.unmapped
          ? state.lang === "uk"
            ? "🎤 Текст"
            : "🎤 Lyrics"
          : state.lang === "uk"
          ? "🎬 Кліп"
          : "🎬 Clip";

        row.innerHTML = `
          <div class="song-sheet-left">
            <img class="song-sheet-thumb" src="${track.posterImage || track.portraitImage}" alt="${track.title}" loading="lazy" />
            <div class="song-sheet-meta">
              <div class="song-sheet-title-line">
                <span class="song-sheet-num">${prefix}</span>
                <span class="song-sheet-title">${track.title}</span>
              </div>
              <div class="song-sheet-sub">${subText}</div>
            </div>
          </div>
          <div class="song-sheet-actions">
            <button class="song-sheet-btn primary" data-act="play" type="button">▶ Play</button>
            <button class="song-sheet-btn" data-act="clip" type="button">${clipLabel}</button>
          </div>
        `;

        row.addEventListener("click", (e) => {
          const actBtn = e.target.closest("[data-act]");
          const act = actBtn ? actBtn.dataset.act : "play";
          const modal = document.getElementById("mobile-playlist-modal");
          if (modal) modal.classList.remove("is-open");
          selectTrack(idx, true);
          const drawer = document.getElementById("stage-drawer");
          if (act === "clip") {
            drawer.classList.remove("is-collapsed");
            if (track.unmapped) {
              const lyricsTabBtn = document.getElementById("tab-btn-lyrics");
              if (lyricsTabBtn) lyricsTabBtn.click();
            } else {
              const videoTabBtn = document.getElementById("tab-btn-video");
              if (videoTabBtn) videoTabBtn.click();
            }
          } else if (window.innerWidth <= 860) {
            drawer.classList.add("is-collapsed");
          }
          syncMobileDrawerBtnLabel();
        });

        allSongsSheet.appendChild(row);
      }
    });
  }

  function buildInstagramReelsWall() {
    const grid = document.getElementById("reels-wall-grid");
    if (!grid) return;
    grid.innerHTML = "";

    REELS.forEach((reel) => {
      const card = document.createElement("div");
      card.className = "reel-card";
      card.innerHTML = `
        <img src="${reel.thumb}" alt="${reel.title}" loading="lazy" />
        <div class="reel-card-overlay">
          <div class="reel-card-top">
            <span class="reel-order-pill">#${reel.order}</span>
            <span class="reel-views-pill">${reel.views}</span>
          </div>
          <div class="reel-play-badge">▶</div>
          <div>
            <div class="reel-card-title">${reel.title}</div>
            <div class="reel-card-date">${reel.date}</div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        document.getElementById("reels-modal").classList.remove("is-open");
        selectTrack(reel.trackIndex, false);
        openFullscreenCinema(reel.videoSrc, `${reel.order} · ${reel.title}`);
      });

      grid.appendChild(card);
    });
  }

  function buildPhotoGallery(filter = "all") {
    state.galleryFilter = filter;
    state.filteredGallery = filter === "all" ? GALLERY.slice() : GALLERY.filter((item) => item.cat === filter);

    document.querySelectorAll("#gallery-filter-bar .hud-pill-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === filter);
    });

    const grid = document.getElementById("gallery-masonry-grid");
    if (!grid) return;
    grid.innerHTML = "";

    state.filteredGallery.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "gallery-photo-card";
      card.innerHTML = `
        <div class="gallery-photo-img">
          <img src="${item.src}" alt="${item.title}" loading="lazy" />
        </div>
        <div class="gallery-photo-meta">
          <div class="gallery-photo-sub">${item.sub}</div>
          <div class="gallery-photo-title">${item.title}</div>
        </div>
      `;
      card.addEventListener("click", () => {
        openPhotoLightbox(idx);
      });
      grid.appendChild(card);
    });
  }

  function openPhotoLightbox(idx) {
    if (!state.filteredGallery.length) return;
    if (idx < 0) idx = state.filteredGallery.length - 1;
    if (idx >= state.filteredGallery.length) idx = 0;
    state.lightboxIndex = idx;

    const item = state.filteredGallery[idx];
    document.getElementById("lightbox-sub").textContent = item.sub;
    document.getElementById("lightbox-title").textContent = item.title;
    document.getElementById("lightbox-img").src = item.src;
    document.getElementById("lightbox-counter").textContent = `${idx + 1} / ${state.filteredGallery.length}`;
    document.getElementById("photo-lightbox-modal").classList.add("is-open");
    playSfx("shutter", 0.35);
  }

  function buildDudaExpressionMatrix() {
    const grid = document.getElementById("duda-9-grid");
    if (!grid) return;
    grid.innerHTML = "";

    EXPRESSIONS.forEach((exp) => {
      const tile = document.createElement("div");
      tile.className = "expression-tile" + (exp.id === state.selectedExpressionId ? " is-selected" : "");
      tile.style.backgroundPosition = `${exp.col * 50}% ${exp.row * 50}%`;
      tile.innerHTML = `<div class="expression-tile-label">${exp.label[state.lang]}</div>`;

      tile.addEventListener("click", () => {
        state.selectedExpressionId = exp.id;
        document.querySelectorAll(".expression-tile").forEach((el, i) => {
          el.classList.toggle("is-selected", i === exp.id);
        });
        const quoteEl = document.getElementById("duda-quote-text");
        if (quoteEl) quoteEl.textContent = `"${exp.quote}"`;
        playSfx("shutter", 0.35);
      });

      grid.appendChild(tile);
    });
  }

  // ============================================================================
  // TRACK SELECTION, 9:16 REEL PLAYER & FULLSCREEN CINEMA THEATER
  // ============================================================================
  function selectTrack(index, autoPlay = false) {
    if (index < 0) index = TRACKS.length - 1;
    if (index >= TRACKS.length) index = 0;
    state.currentTrackIndex = index;
    state.activeClipVariantIndex = 0;
    state.activeLyricIndex = -1;
    state.lastFlashedLyricIndex = -1;

    const track = TRACKS[index];
    if (!track) return;

    flyToStage(track);
    if (track.mapCoords) {
      spawnWorldRipple(track.mapCoords.x * WORLD.width, track.mapCoords.y * WORLD.height, track.accentColor, 130);
    } else {
      spawnWorldRipple(WORLD.width * 0.52, WORLD.height * 0.46, track.accentColor || "#FF5A1F", 180);
    }

    markerDomNodes.forEach((m) => {
      m.el.classList.toggle("is-active", m.idx === index);
      m.el.classList.toggle("is-playing", m.idx === index && state.isPlaying);
    });
    document.querySelectorAll(".unmapped-song-card").forEach((card) => {
      card.classList.toggle("is-active", Number(card.dataset.index) === index);
    });
    document.querySelectorAll(".song-sheet-row").forEach((row) => {
      row.classList.toggle("is-active", Number(row.dataset.index) === index);
    });
    document.querySelectorAll(".quick-stage-btn").forEach((btn, i) => {
      const active = i === index;
      btn.classList.toggle("is-active", active);
      if (active && typeof btn.scrollIntoView === "function") {
        try {
          btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        } catch (_) {}
      }
    });

    // Update Stage Drawer Header
    document.getElementById("stage-badge-primary").textContent = track.badge[state.lang];
    document.getElementById("stage-badge-specs").textContent = `${track.bpm} BPM · ${track.key}`;
    document.getElementById("stage-district-label").textContent = track.districtName[state.lang];
    document.getElementById("stage-track-title").textContent = track.title;
    document.getElementById("stage-track-sub").textContent = track.subtitle[state.lang];
    document.getElementById("stage-backdrop-img").src = track.stageImage;
    document.getElementById("stage-portrait-img").src = track.posterImage || track.portraitImage;

    // Build Clip Variants Switcher inside Watch Clip Tab & Fullscreen Theater
    renderClipVariants(track);

    // Toggle between 9:16 Video Clip and Unmapped Audio Premiere Placeholder
    const placeholderEl = document.getElementById("unmapped-clip-placeholder");
    const unmappedBgArt = document.getElementById("unmapped-bg-art");
    const reelFsBtn = document.getElementById("reel-floating-fs-btn");
    const headerFsBtn = document.getElementById("header-fullscreen-btn");
    const cinemaFsBtn = document.getElementById("cinema-fullscreen-btn");

    if (track.unmapped || !track.videoSrc) {
      drawerReelVideo.pause();
      drawerReelVideo.style.display = "none";
      if (reelFsBtn) reelFsBtn.style.display = "none";
      if (headerFsBtn) headerFsBtn.style.display = "none";
      if (cinemaFsBtn) cinemaFsBtn.style.display = "none";
      if (placeholderEl) placeholderEl.style.display = "flex";
      if (unmappedBgArt) unmappedBgArt.src = track.posterImage || track.portraitImage;
    } else {
      drawerReelVideo.style.display = "block";
      if (reelFsBtn) reelFsBtn.style.display = "inline-flex";
      if (headerFsBtn) headerFsBtn.style.display = "inline-flex";
      if (cinemaFsBtn) cinemaFsBtn.style.display = "inline-flex";
      if (placeholderEl) placeholderEl.style.display = "none";

      const defaultClipSrc =
        track.clipVariants && track.clipVariants[0] ? track.clipVariants[0].src : track.videoSrc;
      if (drawerReelVideo.getAttribute("src") !== defaultClipSrc) {
        drawerReelVideo.src = defaultClipSrc;
        drawerReelVideo.poster = track.posterImage || track.portraitImage;
        drawerReelVideo.muted = true;
      }
    }

    // Populate Time-Synced Lyrics List
    renderLyricsList(track);

    // Update Bottom Sonic Dock
    document.getElementById("dock-art-img").src = track.posterImage || track.portraitImage;
    document.getElementById("dock-title").textContent = `${track.num} · ${track.title}`;
    document.getElementById("dock-subtitle").textContent = track.districtName[state.lang];
    document.getElementById("time-total").textContent = track.duration;
    document.getElementById("live-lyric-ticker").textContent = track.hookQuote;

    // Load Audio
    if (mainAudio.getAttribute("src") !== track.audioSrc) {
      mainAudio.src = track.audioSrc;
      mainAudio.currentTime = 0;
    }

    if (autoPlay) {
      playCurrentTrack();
    } else {
      updatePlayControlsUI();
    }
  }

  function renderClipVariants(track) {
    const bar1 = document.getElementById("clip-variants-bar");
    const bar2 = document.getElementById("fs-variants-bar");
    if (!bar1 || !bar2) return;
    bar1.innerHTML = "";
    bar2.innerHTML = "";

    const variants = track.clipVariants || [];
    const igTarget = track.igUrl || "https://www.instagram.com/bezizian/reels/";

    if (variants.length === 1) {
      // Single clip: clicking "Official Instagram Reel (9:16) ↗" opens the reel on Instagram!
      [bar1, bar2].forEach((bar) => {
        const link = document.createElement("a");
        link.href = igTarget;
        link.target = "_blank";
        link.rel = "noopener";
        link.className = "clip-variant-btn is-active";
        link.style.textDecoration = "none";
        link.textContent = `📸 ${variants[0].label[state.lang]} ↗`;
        bar.appendChild(link);
      });
      return;
    }

    variants.forEach((v, vIdx) => {
      [bar1, bar2].forEach((bar) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "clip-variant-btn" + (vIdx === state.activeClipVariantIndex ? " is-active" : "");
        btn.textContent = v.label[state.lang];
        btn.addEventListener("click", () => {
          state.activeClipVariantIndex = vIdx;
          renderClipVariants(track);
          drawerReelVideo.src = v.src;
          if (state.isPlaying) {
            drawerReelVideo.play().catch(() => {});
          }
          if (state.fsCinemaOpen) {
            fsCinemaVideo.src = v.src;
            fsCinemaVideo.muted = false;
            fsCinemaVideo.play().catch(() => {});
          }
        });
        bar.appendChild(btn);
      });
    });

    if (variants.length > 1) {
      [bar1, bar2].forEach((bar) => {
        const link = document.createElement("a");
        link.href = igTarget;
        link.target = "_blank";
        link.rel = "noopener";
        link.className = "clip-variant-btn";
        link.style.textDecoration = "none";
        link.textContent = "📸 Instagram ↗";
        bar.appendChild(link);
      });
    }
  }

  function openFullscreenCinema(customVideoSrc, customTitle) {
    const track = TRACKS[state.currentTrackIndex];
    if (!track) return;

    const variant =
      track.clipVariants && track.clipVariants[state.activeClipVariantIndex]
        ? track.clipVariants[state.activeClipVariantIndex]
        : null;
    const videoSrc = customVideoSrc || (variant ? variant.src : track.videoSrc);

    if (!videoSrc) {
      const lyricsTabBtn = document.getElementById("tab-btn-lyrics");
      if (lyricsTabBtn) lyricsTabBtn.click();
      return;
    }

    const curTime = mainAudio.currentTime || 0;
    pauseCurrentTrack();

    state.fsCinemaOpen = true;
    document.getElementById("fs-cinema-badge").textContent = `${track.badge[state.lang]} · ${track.bpm} BPM`;
    document.getElementById("fs-cinema-title").textContent = customTitle || `${track.num} · ${track.title}`;

    if (fsCinemaVideo.getAttribute("src") !== videoSrc) {
      fsCinemaVideo.src = videoSrc;
    }
    fsCinemaVideo.muted = false;
    fsCinemaVideo.volume = 1.0;
    if (!customVideoSrc && curTime > 0 && curTime < 85) {
      fsCinemaVideo.currentTime = curTime;
    } else {
      fsCinemaVideo.currentTime = 0;
    }

    fsCinemaModal.classList.add("is-open");
    fsCinemaVideo.play().catch(() => {});
  }

  function closeFullscreenCinema() {
    if (!state.fsCinemaOpen) return;
    const resumeTime = fsCinemaVideo.currentTime || 0;
    fsCinemaVideo.pause();
    state.fsCinemaOpen = false;
    fsCinemaModal.classList.remove("is-open");

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    if (resumeTime > 0 && isFinite(mainAudio.duration) && resumeTime < mainAudio.duration) {
      mainAudio.currentTime = resumeTime;
      drawerReelVideo.currentTime = resumeTime;
    }
  }

  function renderLyricsList(track) {
    const listEl = document.getElementById("lyrics-list");
    listEl.innerHTML = "";

    (track.lyrics || []).forEach((line, idx) => {
      const row = document.createElement("div");
      row.className = "lyric-line";
      row.dataset.index = String(idx);

      const flashBadge = line.flash ? ` <span title="Triggers PERFECT! Shutter Flash">📸</span>` : "";
      row.innerHTML = `
        <div class="lyric-line-head">
          <span class="lyric-singer-tag singer-${line.singer}">${line.name}${flashBadge}</span>
          <span class="lyric-timecode">${formatTime(line.t)}</span>
        </div>
        <div class="lyric-text">${line.text}</div>
      `;

      row.addEventListener("click", () => {
        ensureAudioContext();
        mainAudio.currentTime = line.t;
        if (isFinite(drawerReelVideo.duration) && drawerReelVideo.duration > 0) {
          drawerReelVideo.currentTime = line.t % drawerReelVideo.duration;
        }
        playCurrentTrack();
      });

      listEl.appendChild(row);
    });
  }

  function playCurrentTrack() {
    ensureAudioContext();
    mainAudio
      .play()
      .then(() => {
        state.isPlaying = true;
        drawerReelVideo.muted = true;
        if (isFinite(drawerReelVideo.duration) && drawerReelVideo.duration > 15) {
          drawerReelVideo.currentTime = mainAudio.currentTime % drawerReelVideo.duration;
        }
        drawerReelVideo.play().catch(() => {});
        updatePlayControlsUI();
      })
      .catch(() => {
        state.isPlaying = false;
        updatePlayControlsUI();
      });
  }

  function pauseCurrentTrack() {
    mainAudio.pause();
    drawerReelVideo.pause();
    state.isPlaying = false;
    updatePlayControlsUI();
  }

  function togglePlayPause() {
    if (state.fsCinemaOpen) {
      if (fsCinemaVideo.paused) fsCinemaVideo.play().catch(() => {});
      else fsCinemaVideo.pause();
      return;
    }
    if (state.isPlaying) {
      pauseCurrentTrack();
    } else {
      playCurrentTrack();
    }
  }

  function updatePlayControlsUI() {
    const btn = document.getElementById("play-pause-btn");
    const statusLabel = document.getElementById("dock-status-label");
    const dict = I18N[state.lang] || I18N.en;

    if (btn) btn.textContent = state.isPlaying ? "⏸" : "▶";
    if (statusLabel) {
      statusLabel.textContent = state.isPlaying ? dict.nowPlaying : dict.paused;
    }

    markerDomNodes.forEach((m) => {
      m.el.classList.toggle("is-playing", m.idx === state.currentTrackIndex && state.isPlaying);
    });
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // Audio timeupdate & lyric/video sync
  mainAudio.addEventListener("timeupdate", () => {
    const cur = mainAudio.currentTime || 0;
    const dur = mainAudio.duration || 1;
    const pct = Math.min(100, Math.max(0, (cur / dur) * 100));

    document.getElementById("timeline-fill").style.width = `${pct}%`;
    document.getElementById("time-current").textContent = formatTime(cur);
    if (isFinite(mainAudio.duration) && mainAudio.duration > 0) {
      document.getElementById("time-total").textContent = formatTime(mainAudio.duration);
    }

    // Keep drawer 9:16 video locked to audio clock (for full-length clips > 20s)
    if (state.isPlaying && isFinite(drawerReelVideo.duration) && drawerReelVideo.duration > 20) {
      const targetVTime = cur % drawerReelVideo.duration;
      if (Math.abs(drawerReelVideo.currentTime - targetVTime) > 0.38) {
        drawerReelVideo.currentTime = targetVTime;
      }
    }

    // Find active lyric line
    const track = TRACKS[state.currentTrackIndex];
    if (!track || !track.lyrics) return;

    let foundIdx = -1;
    for (let i = 0; i < track.lyrics.length; i++) {
      const l = track.lyrics[i];
      if (cur >= l.t && cur <= l.end) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx !== state.activeLyricIndex) {
      state.activeLyricIndex = foundIdx;
      const rows = document.querySelectorAll("#lyrics-list .lyric-line");
      rows.forEach((r, idx) => {
        const active = idx === foundIdx;
        r.classList.toggle("is-active", active);
        if (active && state.activeTab === "lyrics") {
          r.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });

      const activeLine = track.lyrics[foundIdx];
      updateSingerRadar(activeLine ? activeLine.singer : null, activeLine ? activeLine.name : "READY");

      if (activeLine) {
        document.getElementById("live-lyric-ticker").textContent = activeLine.text;
        if (activeLine.flash && state.lastFlashedLyricIndex !== foundIdx) {
          state.lastFlashedLyricIndex = foundIdx;
          triggerPerfectFlash();
        }
      }
    }
  });

  mainAudio.addEventListener("ended", () => {
    selectTrack(state.currentTrackIndex + 1, true);
  });

  function updateSingerRadar(singerCode, label) {
    const dudaChip = document.getElementById("chip-singer-duda");
    const milesChip = document.getElementById("chip-singer-miles");
    const gangChip = document.getElementById("chip-singer-gang");
    const indicator = document.getElementById("active-singer-indicator");

    if (indicator) indicator.textContent = label || "READY";

    dudaChip.classList.toggle("is-singing", singerCode === "DUDA" || singerCode === "BOTH" || singerCode === "GANG");
    milesChip.classList.toggle("is-singing", singerCode === "MILES" || singerCode === "BOTH" || singerCode === "GANG");
    gangChip.classList.toggle("is-singing", singerCode === "GANG" || singerCode === "BRASS");
  }

  // ============================================================================
  // BEZIZIAN STUDIO INTERACTIVE TOYS (BARK, PERFECT FLASH, PERMIT STAMP, RAIN)
  // ============================================================================
  function triggerSeaLionBark() {
    const keys = ["bark1", "bark2", "bark3"];
    const key = keys[state.barkCounter % keys.length];
    state.barkCounter++;
    playSfx(key, 0.8);

    const logo = document.getElementById("brand-logo-btn");
    logo.classList.add("is-blinking");
    setTimeout(() => logo.classList.remove("is-blinking"), 240);

    const track = TRACKS[state.currentTrackIndex];
    if (track) {
      const wx = track.mapCoords ? track.mapCoords.x * WORLD.width : WORLD.width * 0.52;
      const wy = track.mapCoords ? track.mapCoords.y * WORLD.height : WORLD.height * 0.46;
      spawnWorldRipple(wx, wy, "#F4A23E", 160);
      spawnWorldRipple(wx + 35, wy - 20, "#FF5A1F", 120);
    }
  }

  function triggerPerfectFlash() {
    playSfx("shutter", 0.72);
    const flashEl = document.getElementById("screen-flash-overlay");
    flashEl.classList.add("is-flashing");
    setTimeout(() => {
      flashEl.classList.remove("is-flashing");
    }, 90);

    const track = TRACKS[state.currentTrackIndex];
    const tray = document.getElementById("polaroid-tray");
    if (!tray || !track) return;

    tray.innerHTML = `
      <div class="polaroid-card" title="Click to dismiss snapshot">
        <div class="polaroid-img-wrap">
          <img src="${track.posterImage || track.portraitImage}" alt="${track.title}" />
          <span class="polaroid-perfect-stamp">PERFECT!</span>
        </div>
        <div class="polaroid-caption">
          <span>${track.num} · ${track.title.slice(0, 16)}</span>
          <span>${formatTime(mainAudio.currentTime)}</span>
        </div>
      </div>
    `;

    const card = tray.querySelector(".polaroid-card");
    if (card) {
      card.addEventListener("click", () => {
        tray.innerHTML = "";
      });
    }
  }

  function placePermitStamp(screenX, screenY) {
    playSfx("stamp", 0.65);
    const list = STAMP_TEXTS[state.lang] || STAMP_TEXTS.en;
    const text = list[state.stampCounter % list.length];
    state.stampCounter++;

    const el = document.createElement("div");
    el.className = "permit-stamp-mark";
    const rot = (Math.random() * 22 - 11).toFixed(1);
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    el.style.setProperty("--stamp-rot", `${rot}deg`);
    el.textContent = text;
    stampLayer.appendChild(el);

    const worldPt = screenToWorld(screenX, screenY);
    spawnWorldRipple(worldPt.x, worldPt.y, "#FF5A1F", 95);

    if (stampLayer.children.length > 8) {
      stampLayer.removeChild(stampLayer.firstChild);
    }
  }

  // ============================================================================
  // BILINGUAL LANGUAGE SWITCHER (EN / UK — ZERO RUSSIAN)
  // ============================================================================
  function setLanguage(lang) {
    if (lang !== "en" && lang !== "uk") return;
    state.lang = lang;
    document.documentElement.lang = lang;

    document.getElementById("lang-en-btn").classList.toggle("is-active", lang === "en");
    document.getElementById("lang-uk-btn").classList.toggle("is-active", lang === "uk");

    const dict = I18N[lang];
    document.getElementById("i18n-brand-sub").textContent = dict.brandSub;
    document.querySelectorAll(".i18n-nav-reels").forEach((el) => (el.textContent = dict.navReels));
    document.querySelectorAll(".i18n-nav-gallery").forEach((el) => (el.textContent = dict.navGallery));
    document.querySelectorAll(".i18n-nav-sting").forEach((el) => (el.textContent = dict.navSting));
    document.querySelectorAll(".i18n-watch-fullscreen").forEach((el) => (el.textContent = dict.watchFullscreen));
    document.getElementById("i18n-open-gallery-btn").textContent = dict.openGalleryBtn;
    document.getElementById("i18n-ambience-label").textContent = state.ambienceActive ? dict.soundOn : dict.soundOff;
    document.getElementById("i18n-hint-text").textContent = dict.hintMouse;

    const uDockTitle = document.getElementById("i18n-unmapped-dock-title");
    const uDockSub = document.getElementById("i18n-unmapped-dock-sub");
    const uCardStamp = document.getElementById("i18n-unmapped-card-stamp");
    const uCardTitle = document.getElementById("i18n-unmapped-card-title");
    const uCardDesc = document.getElementById("i18n-unmapped-card-desc");
    const uLyricsBtn = document.getElementById("i18n-unmapped-lyrics-btn");
    if (uDockTitle && dict.unmappedDockTitle) uDockTitle.textContent = dict.unmappedDockTitle;
    if (uDockSub && dict.unmappedDockSub) uDockSub.textContent = dict.unmappedDockSub;
    if (uCardStamp && dict.unmappedCardStamp) uCardStamp.textContent = dict.unmappedCardStamp;
    if (uCardTitle && dict.unmappedCardTitle) uCardTitle.textContent = dict.unmappedCardTitle;
    if (uCardDesc && dict.unmappedCardDesc) uCardDesc.textContent = dict.unmappedCardDesc;
    if (uLyricsBtn && dict.unmappedLyricsBtn) uLyricsBtn.textContent = dict.unmappedLyricsBtn;

    document.getElementById("i18n-toy-bark").textContent = dict.toyBark;
    document.getElementById("i18n-toy-flash").textContent = dict.toyFlash;
    document.getElementById("i18n-toy-stamp").textContent = dict.toyStamp;
    document.getElementById("i18n-toy-rain").textContent = dict.toyRain;
    document.getElementById("i18n-toy-reset").textContent = dict.toyResetView;

    document.getElementById("tab-btn-video").textContent = dict.modeVideo;
    document.getElementById("tab-btn-lyrics").textContent = dict.modeLyrics;

    document.getElementById("i18n-click-lyric-hint").textContent = dict.clickLyricHint;

    document.getElementById("i18n-meter-bass").textContent = dict.bassMeter;
    document.getElementById("i18n-meter-brass").textContent = dict.brassMeter;
    document.getElementById("i18n-meter-vox").textContent = dict.vocalMeter;

    syncNycEnvHud();
    syncCatResidentHud();
    buildMapMarkersAndQuickStrip();
    selectTrack(state.currentTrackIndex, state.isPlaying);
  }

  // ============================================================================
  // 60FPS SPATIAL CANVAS RENDER LOOP
  // ============================================================================
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    clampCameraTargets();
  }

  function renderOverworldLoop() {
    requestAnimationFrame(renderOverworldLoop);

    updateAudioTelemetry();

    if (!camera.isDragging) {
      camera.targetX += camera.vx;
      camera.targetY += camera.vy;
      camera.vx *= 0.88;
      camera.vy *= 0.88;
      clampCameraTargets();
    }
    camera.x += (camera.targetX - camera.x) * 0.11;
    camera.y += (camera.targetY - camera.y) * 0.11;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.11;

    const vw = canvas.width;
    const vh = canvas.height;
    ctx.clearRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(vw * 0.5, vh * 0.5);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    if (mapImageLoaded) {
      ctx.drawImage(mapImage, 0, 0, WORLD.width, WORLD.height);
    } else {
      ctx.fillStyle = "#10131C";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }

    // Live New York Time-of-Day Sky/Street Grading + Seasonal World Elements (Snowbanks, Autumn Leaves, Spring Petals, Fireflies)
    drawNycWorldAtmosphere(ctx);

    // Sonic Ley-Lines connecting mapped stages (01 -> 05)
    ctx.save();
    ctx.beginPath();
    let startedLine = false;
    TRACKS.forEach((t) => {
      if (t.unmapped || !t.mapCoords) return;
      const wx = t.mapCoords.x * WORLD.width;
      const wy = t.mapCoords.y * WORLD.height;
      if (!startedLine) {
        ctx.moveTo(wx, wy);
        startedLine = true;
      } else {
        ctx.lineTo(wx, wy);
      }
    });
    ctx.strokeStyle = "rgba(255, 90, 31, 0.28)";
    ctx.lineWidth = 2.2 / camera.zoom;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -(performance.now() * 0.03);
    ctx.stroke();
    ctx.restore();

    // Active Stage Spotlight Glow
    const activeTrack = TRACKS[state.currentTrackIndex];
    if (activeTrack && activeTrack.mapCoords) {
      const sx = activeTrack.mapCoords.x * WORLD.width;
      const sy = activeTrack.mapCoords.y * WORLD.height;
      const glowRadius = 190 + audioEnergy.sub * 140;
      const grad = ctx.createRadialGradient(sx, sy, 10, sx, sy, glowRadius);
      grad.addColorStop(0, "rgba(255, 90, 31, 0.36)");
      grad.addColorStop(0.5, "rgba(244, 162, 62, 0.15)");
      grad.addColorStop(1, "rgba(11, 11, 15, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Water Puddle Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 1.6 + audioEnergy.sub * 1.8;
      rp.alpha *= 0.965;
      if (rp.alpha < 0.03 || rp.r > rp.maxR) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(rp.wx, rp.wy, rp.r, rp.r * 0.58, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rp.color;
      ctx.globalAlpha = rp.alpha;
      ctx.lineWidth = 2 / camera.zoom;
      ctx.stroke();
      ctx.restore();
    }

    // Ginger Tabby Cat Patrol along Dmytro's route + Floor 5 Balcony Show
    updateAndDrawGingerCat(ctx);

    // Rising Golden & Hoop-Orange Sparks
    const sparkBoost = 1 + audioEnergy.brass * 2.4;
    sparks.forEach((sp) => {
      sp.wx += sp.vx * sparkBoost;
      sp.wy += sp.vy * sparkBoost;
      if (sp.wy < 0) {
        sp.wy = WORLD.height;
        sp.wx = Math.random() * WORLD.width;
      }
      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.fillStyle = sp.hue;
      ctx.beginPath();
      ctx.arc(sp.wx, sp.wy, sp.size * (0.8 + audioEnergy.sub * 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();

    // Screen-Space Live NYC Weather (Snowfall, Rain, Thunderstorm, Harbor Fog)
    drawNycScreenWeather(ctx, vw, vh);

    // Project HTML Stage Markers
    const beatScale = (1 + audioEnergy.sub * 0.42).toFixed(3);
    markerDomNodes.forEach((m) => {
      if (!m.track.mapCoords) return;
      const wx = m.track.mapCoords.x * WORLD.width;
      const wy = m.track.mapCoords.y * WORLD.height;
      const screen = worldToScreen(wx, wy);
      m.el.style.setProperty("--screen-x", `${screen.x.toFixed(1)}px`);
      m.el.style.setProperty("--screen-y", `${screen.y.toFixed(1)}px`);
      m.el.style.setProperty("--beat-scale", m.idx === state.currentTrackIndex ? beatScale : "1");
    });
  }

  function updateAndDrawGingerCat(ctx) {
    const nextIdx = (gingerCat.segIndex + 1) % GINGER_CAT_ROUTE.length;
    const targetPt = GINGER_CAT_ROUTE[nextIdx];
    const tx = targetPt.x * WORLD.width;
    const ty = targetPt.y * WORLD.height;
    const t = performance.now() * 0.001;

    // Hop physics when clicked or fed a fish
    if (gingerCat.hopOffset < 0 || gingerCat.hopVel !== 0) {
      gingerCat.hopOffset += gingerCat.hopVel;
      gingerCat.hopVel += 0.52;
      if (gingerCat.hopOffset >= 0) {
        gingerCat.hopOffset = 0;
        gingerCat.hopVel = 0;
      }
    }

    if (gingerCat.bubbleTimer > 0) {
      gingerCat.bubbleTimer--;
    }

    const isPaused = gingerCat.pauseFrames > 0;
    if (isPaused) {
      gingerCat.pauseFrames--;
      gingerCat.walkPhase *= 0.85;
      gingerCat.smoothSlope *= 0.88;
      if (gingerCat.pauseFrames === 0) {
        gingerCat.pose = "walk";
        syncCatResidentHud();
      }
    } else {
      gingerCat.pose = "walk";
      const dx = tx - gingerCat.wx;
      const dy = ty - gingerCat.wy;
      const dist = Math.hypot(dx, dy);

      // Realistic, unhurried feline walking speed (~0.62 px/frame, slowing down smoothly before sitting/lying stops)
      const mult = targetPt.speedMult || 1.0;
      const slowDown = targetPt.pause && dist < 24 ? Math.max(0.45, dist / 24) : 1.0;
      const speed = (0.62 + audioEnergy.sub * 0.22) * mult * slowDown;

      if (Math.abs(dx) > 0.15) {
        gingerCat.facing = dx >= 0 ? 1 : -1;
      }
      gingerCat.smoothFacing += (gingerCat.facing - gingerCat.smoothFacing) * 0.16;

      // Subtle body tilt along stairs & isometric slopes
      const rawSlope = Math.max(-0.38, Math.min(0.38, (dy / Math.max(1, Math.abs(dx))) * 0.45));
      gingerCat.smoothSlope += (rawSlope - gingerCat.smoothSlope) * 0.14;

      if (dist <= speed) {
        gingerCat.wx = tx;
        gingerCat.wy = ty;
        gingerCat.segIndex = nextIdx;
        if (targetPt.statusEn) gingerCat.statusEn = targetPt.statusEn;
        if (targetPt.statusUk) gingerCat.statusUk = targetPt.statusUk;

        if (targetPt.pause) {
          gingerCat.pauseFrames = targetPt.pause;
          gingerCat.pose = targetPt.pose || "look";
          if (targetPt.bubble && gingerCat.bubbleTimer <= 0) {
            gingerCat.bubbleText = targetPt.bubble;
            gingerCat.bubbleTimer = Math.min(180, targetPt.pause);
          }
        }
        syncCatResidentHud();
      } else {
        gingerCat.wx += (dx / dist) * speed;
        gingerCat.wy += (dy / dist) * speed;
        // Natural feline stride cadence matched to actual ground speed
        gingerCat.walkPhase += speed * 0.23;
        gingerCat.stepCounter++;

        // Leave subtle glowing pawprints along the wet stone sidewalk
        if (gingerCat.stepCounter % 18 === 0) {
          const side = (gingerCat.stepCounter % 36 === 0 ? 1 : -1) * 3.2;
          catPawPrints.push({
            wx: gingerCat.wx + (-dy / dist) * side,
            wy: gingerCat.wy + (dx / dist) * side,
            alpha: 0.65
          });
          if (catPawPrints.length > 26) catPawPrints.shift();
        }
        if (gingerCat.stepCounter % 55 === 0) {
          spawnWorldRipple(gingerCat.wx, gingerCat.wy + 4, "rgba(255, 145, 45, 0.35)", 22);
        }
      }
    }

    // Smoothly track the cat if Follow Cat Cam is active (and user isn't currently dragging)
    if (gingerCat.followCam && !camera.isDragging) {
      camera.targetX += (gingerCat.wx - camera.targetX) * 0.08;
      camera.targetY += (gingerCat.wy - 18 - camera.targetY) * 0.08;
      clampCameraTargets();
    }

    // 1. Draw glowing pawprints behind the ginger cat
    for (let i = catPawPrints.length - 1; i >= 0; i--) {
      const p = catPawPrints[i];
      p.alpha *= 0.993;
      if (p.alpha < 0.04) {
        catPawPrints.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.fillStyle = `rgba(255, 155, 55, ${p.alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.wx, p.wy, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw any flying fish treats tossed to the cat!
    for (let i = catFishTreats.length - 1; i >= 0; i--) {
      const ft = catFishTreats[i];
      ft.progress += 0.045;
      if (ft.progress >= 1) {
        catFishTreats.splice(i, 1);
        gingerCat.hopVel = -4.5;
        spawnWorldRipple(gingerCat.wx, gingerCat.wy, "#38BDF8", 45);
        continue;
      }
      const p = ft.progress;
      const fx = ft.startX + (gingerCat.wx - ft.startX) * p;
      const fy = ft.startY + (gingerCat.wy - 8 - ft.startY) * p - Math.sin(p * Math.PI) * 38;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(p * Math.PI * 2.5);
      ctx.fillStyle = "#7DD3FC";
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5.5, 0);
      ctx.lineTo(-9.5, -3.5);
      ctx.lineTo(-9.5, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 3. Draw the Ginger Tabby Cat at (gingerCat.wx, gingerCat.wy)
    ctx.save();
    ctx.translate(gingerCat.wx, gingerCat.wy + gingerCat.hopOffset);

    // Warm streetlamp aura under the cat
    const aura = ctx.createRadialGradient(0, 2, 2, 0, 2, 30);
    aura.addColorStop(0, gingerCat.followCam ? "rgba(255, 145, 40, 0.50)" : "rgba(255, 140, 36, 0.34)");
    aura.addColorStop(1, "rgba(255, 140, 36, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(0, 3, 28, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ground shadow
    ctx.fillStyle = "rgba(5, 6, 10, 0.70)";
    ctx.beginPath();
    ctx.ellipse(0, 5, gingerCat.pose === "lie" ? 15.5 : 13.5, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const flip = gingerCat.smoothFacing >= 0 ? 1 : -1;

    // Helper for pointed ears (outer ginger + inner pink)
    const drawEar = (ex, ey, tilt) => {
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(tilt);
      ctx.fillStyle = "#D96216";
      ctx.beginPath();
      ctx.moveTo(-2.8, 0);
      ctx.lineTo(0, -6.2);
      ctx.lineTo(2.8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#FDA4AF";
      ctx.beginPath();
      ctx.moveTo(-1.4, -0.4);
      ctx.lineTo(0, -4.4);
      ctx.lineTo(1.4, -0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    ctx.save();
    ctx.scale(flip, 1);

    if (gingerCat.pose === "lie" && isPaused) {
      // ======================================================================
      // POSE A: LYING DOWN CURLED / LOAFING ON THE WARM STONES ("кое где лежал")
      // ======================================================================
      const breath = 1 + Math.sin(t * 3.2) * 0.045;
      const tailTwitch = Math.sin(t * 2.4) * 2.8;

      // Curled striped tail resting along the cobblestones behind/around body
      ctx.strokeStyle = "#D96216";
      ctx.lineWidth = 4.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-11, -1);
      ctx.quadraticCurveTo(-19, -3 + tailTwitch * 0.4, -15, 3.5 + tailTwitch * 0.5);
      ctx.stroke();
      ctx.strokeStyle = "#FFEAD0";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-16.2, 1.8 + tailTwitch * 0.4);
      ctx.lineTo(-14.5, 3.8 + tailTwitch * 0.5);
      ctx.stroke();

      // Cozy low-slung curled ginger body (breathing gently)
      ctx.save();
      ctx.scale(1, breath);
      ctx.fillStyle = "#F27D24";
      ctx.beginPath();
      ctx.ellipse(-1.5, -3.2, 12.5, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cream belly edge
      ctx.fillStyle = "#FFEBD2";
      ctx.beginPath();
      ctx.ellipse(4.5, -1.2, 6.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark ginger tabby stripes on curled back
      ctx.strokeStyle = "#9E3B06";
      ctx.lineWidth = 1.8;
      [-6.5, -2.5, 1.5].forEach((sx) => {
        ctx.beginPath();
        ctx.moveTo(sx, -8.8);
        ctx.quadraticCurveTo(sx - 1, -5.2, sx + 0.5, -2.2);
        ctx.stroke();
      });
      ctx.restore();

      // Tucked white front paws in front of chest
      ctx.fillStyle = "#FFF4E4";
      ctx.beginPath();
      ctx.ellipse(9.2, 2.8, 3.2, 1.8, 0, 0, Math.PI * 2);
      ctx.ellipse(12.2, 3.2, 2.8, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Resting Ginger Head lowered onto front paws
      ctx.save();
      ctx.translate(9.8, -5.8 + Math.sin(t * 3.2) * 0.4);
      ctx.fillStyle = "#F5882E";
      ctx.beginPath();
      ctx.arc(0, 0, 6.6, 0, Math.PI * 2);
      ctx.fill();

      // White muzzle
      ctx.fillStyle = "#FFF4E4";
      ctx.beginPath();
      ctx.ellipse(2.4, 2.1, 3.6, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();

      drawEar(-2.5, -4.6, -0.22);
      drawEar(2.5, -4.6, 0.18);

      // Contented sleeping crescent eye
      ctx.strokeStyle = "#1E1B18";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(2.0, -0.2, 1.8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      // Pink nose & whiskers
      ctx.fillStyle = "#FB7185";
      ctx.beginPath();
      ctx.arc(5.0, 1.5, 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(4.0, 2.0);
      ctx.lineTo(8.8, 1.4);
      ctx.moveTo(4.0, 2.6);
      ctx.lineTo(8.5, 3.0);
      ctx.stroke();
      ctx.restore();
    } else if (gingerCat.pose === "groom" && isPaused) {
      // ======================================================================
      // POSE B: SITTING & GROOMING / WASHING WITH PAW ("сел чиститься")
      // ======================================================================
      const lickCycle = Math.sin(t * 7.2); // rhythmic paw-licking & ear-washing cycle
      const tailCurl = Math.sin(t * 3.0) * 2.5;

      // Tail curled neatly behind sitting haunches
      ctx.strokeStyle = "#D96216";
      ctx.lineWidth = 4.0;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-7, 2);
      ctx.quadraticCurveTo(-16, 0 + tailCurl * 0.4, -14, -9 + tailCurl * 0.6);
      ctx.stroke();
      ctx.strokeStyle = "#FFEAD0";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-14.5, -6.5 + tailCurl * 0.5);
      ctx.lineTo(-14, -9.5 + tailCurl * 0.6);
      ctx.stroke();

      // Sitting upright ginger torso (angled up)
      ctx.fillStyle = "#F27D24";
      ctx.beginPath();
      ctx.ellipse(-1.5, -5.5, 7.8, 10.2, 0.32, 0, Math.PI * 2);
      ctx.fill();

      // Fluffy cream chest patch
      ctx.fillStyle = "#FFEBD2";
      ctx.beginPath();
      ctx.ellipse(3.2, -7.2, 4.2, 6.2, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Dark ginger stripes on sitting back
      ctx.strokeStyle = "#9E3B06";
      ctx.lineWidth = 1.7;
      [-9, -5.5, -2].forEach((sy) => {
        ctx.beginPath();
        ctx.moveTo(-7.5, sy);
        ctx.quadraticCurveTo(-4, sy - 0.5, -1, sy + 1);
        ctx.stroke();
      });

      // Supporting front leg planted on the sidewalk
      ctx.strokeStyle = "#F27D24";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(2.5, -3.5);
      ctx.lineTo(3.8, 4.0);
      ctx.stroke();
      ctx.fillStyle = "#FFF4E4";
      ctx.beginPath();
      ctx.ellipse(4.4, 4.3, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ginger Head tilted slightly down/sideways into the grooming paw!
      ctx.save();
      ctx.translate(4.8, -15.2 + lickCycle * 0.9);
      ctx.rotate(0.12 + lickCycle * 0.08);

      ctx.fillStyle = "#F5882E";
      ctx.beginPath();
      ctx.arc(0, 0, 6.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFF4E4";
      ctx.beginPath();
      ctx.ellipse(2.5, 2.0, 3.6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      drawEar(-2.6, -4.6, -0.2);
      drawEar(2.4, -4.6, 0.22 + lickCycle * 0.08);

      // Happy closed eye while washing face
      ctx.strokeStyle = "#1E1B18";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0.5, -0.4);
      ctx.lineTo(4.0, -0.2);
      ctx.stroke();

      // Little pink tongue licking the raised white paw!
      if (lickCycle > -0.2) {
        ctx.fillStyle = "#FB7185";
        ctx.beginPath();
        ctx.ellipse(5.2, 2.8 - lickCycle * 0.8, 1.7, 1.1, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pink nose
      ctx.fillStyle = "#FB7185";
      ctx.beginPath();
      ctx.arc(5.2, 1.2, 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Raised Front Paw rubbing cheek & ear in a circle!
      const pawX = 8.8 + Math.cos(t * 7.2) * 1.4;
      const pawY = -12.2 + Math.sin(t * 7.2) * 2.2;
      ctx.strokeStyle = "#F27D24";
      ctx.lineWidth = 3.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(3.5, -7.5);
      ctx.quadraticCurveTo(8.5, -8.5, pawX, pawY);
      ctx.stroke();
      ctx.fillStyle = "#FFF4E4";
      ctx.beginPath();
      ctx.arc(pawX, pawY, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ======================================================================
      // POSE C: LIFELIKE 4-LEGGED FELINE WALK / TROT / LOOK
      // ======================================================================
      const wp = gingerCat.walkPhase;
      const bodyBob = isPaused ? Math.sin(t * 3.5) * 0.45 : Math.sin(wp * 2) * -1.1;
      ctx.translate(0, bodyBob);
      ctx.rotate(gingerCat.smoothSlope * flip);

      // 4-leg diagonal feline gait with true paw lift-off arc!
      const drawWalkLeg = (hipX, phaseOffset, legColor, isBack) => {
        const ph = wp + phaseOffset;
        const strideX = isPaused ? 0 : Math.sin(ph) * 4.4;
        const liftY = isPaused ? 0 : Math.max(0, -Math.cos(ph)) * 2.5;
        const kneeX = hipX + strideX * 0.35 + (isBack ? -1.2 : 1.0);
        const kneeY = -0.2 - liftY * 0.5;
        const footX = hipX + strideX;
        const footY = 4.1 - liftY;

        ctx.strokeStyle = legColor;
        ctx.lineWidth = 3.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(hipX, -3.5);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.stroke();

        // White sock paw
        ctx.fillStyle = "#FFF4E4";
        ctx.beginPath();
        ctx.ellipse(footX + 0.7, footY + 0.2, 2.2, 1.35, 0, 0, Math.PI * 2);
        ctx.fill();
      };

      // Far-side legs (drawn behind body: back-right & front-right)
      drawWalkLeg(-7.2, Math.PI, "#B84709", true);
      drawWalkLeg(5.8, 0, "#CC5612", false);

      // Sinuous S-curve striped ginger tail held high
      const tailSway = Math.sin(t * 4.2 + wp * 0.4) * 4.2;
      ctx.strokeStyle = "#D96216";
      ctx.lineWidth = 4.1;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-10.5, -6.5);
      ctx.bezierCurveTo(-17, -11, -18 + tailSway * 0.3, -18, -14 + tailSway * 0.5, -23.5);
      ctx.stroke();

      // Cream-white tail tip
      ctx.strokeStyle = "#FFEAD0";
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-15.2 + tailSway * 0.42, -20.2);
      ctx.lineTo(-14 + tailSway * 0.5, -23.5);
      ctx.stroke();

      // Supple Ginger Tabby Body
      ctx.fillStyle = "#F27D24";
      ctx.beginPath();
      ctx.ellipse(-1, -6.5, 11.8, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cream-white chest & belly fur
      ctx.fillStyle = "#FFEBD2";
      ctx.beginPath();
      ctx.ellipse(6.5, -5.2, 5.2, 4.4, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Dark ginger tabby stripes across the back
      ctx.strokeStyle = "#9E3B06";
      ctx.lineWidth = 1.8;
      [-6.2, -2.5, 1.2].forEach((sx) => {
        ctx.beginPath();
        ctx.moveTo(sx, -12.4);
        ctx.quadraticCurveTo(sx - 1, -8.5, sx + 0.5, -5.2);
        ctx.stroke();
      });

      // Near-side legs (drawn in front of body: back-left & front-left)
      drawWalkLeg(-5.5, 0, "#E06919", true);
      drawWalkLeg(7.2, Math.PI, "#F27D24", false);

      // Ginger Head (with subtle head bob)
      ctx.save();
      const headNod = isPaused ? Math.sin(t * 2.5) * 0.6 : Math.cos(wp) * 0.65;
      ctx.translate(10.6, -11.6 + headNod);

      ctx.fillStyle = "#F5882E";
      ctx.beginPath();
      ctx.arc(0, 0, 6.7, 0, Math.PI * 2);
      ctx.fill();

      // White muzzle cheeks
      ctx.fillStyle = "#FFF4E4";
      ctx.beginPath();
      ctx.ellipse(2.3, 2.3, 3.8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      drawEar(-2.7, -4.6, -0.18);
      drawEar(2.4, -4.6, 0.15);

      // Emerald-green eyes (blink occasionally)
      const isBlinking = Math.sin(t * 3.1) > 0.96;
      if (isBlinking) {
        ctx.strokeStyle = "#1E1B18";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(0, -0.2);
        ctx.lineTo(3.8, -0.2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#34D399";
        ctx.beginPath();
        ctx.arc(2.0, -0.2, 1.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#090A0F";
        ctx.beginPath();
        ctx.ellipse(2.3, -0.2, 0.65, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pink nose & white whiskers
      ctx.fillStyle = "#FB7185";
      ctx.beginPath();
      ctx.arc(5.2, 1.7, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(4.0, 2.3);
      ctx.lineTo(9.0, 1.3);
      ctx.moveTo(4.0, 3.0);
      ctx.lineTo(8.7, 3.3);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // undo flip

    // 4. Floating Hearts / Fish / Music Notes when petted or fed
    for (let i = gingerCat.hearts.length - 1; i >= 0; i--) {
      const h = gingerCat.hearts[i];
      h.oy += h.vy;
      h.alpha -= 0.016;
      if (h.alpha <= 0.02) {
        gingerCat.hearts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = h.alpha;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(h.symbol, h.ox, h.oy);
      ctx.restore();
    }

    // 5. Speech bubble when paused, grooming, napping, or clicked
    if (gingerCat.bubbleTimer > 0 && gingerCat.bubbleText) {
      ctx.save();
      ctx.font = "700 9.5px 'JetBrains Mono', monospace";
      const textW = ctx.measureText(gingerCat.bubbleText).width;
      const bw = textW + 14;
      const bh = 17;
      const bx = -bw * 0.5;
      const by = -38;
      ctx.fillStyle = "rgba(11, 11, 15, 0.92)";
      ctx.strokeStyle = "#FF8C24";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FFEAD0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(gingerCat.bubbleText, 0, by + bh * 0.5 + 0.5);
      ctx.restore();
    }

    ctx.restore();

    // Draw Interactive Balcony Show (Grandpa stretching / Sea Lion clapping / Both together)
    updateAndDrawBalconyShow(ctx);
  }

  // ============================================================================
  // FLOOR 5 BALCONY DOORS: GRANDPA STRETCHING, SEA LION, OR BOTH TOGETHER
  // ============================================================================
  const BALCONY_POS = {
    wx: 0.854 * WORLD.width,  // 2050
    wy: 0.312 * WORLD.height  // 449 (center of balcony doorway & railing)
  };

  const balconyShow = {
    phase: "opening", // "closed", "opening", "active", "closing"
    openProgress: 0.15, // 0 = closed shutters, 1 = wide open doors
    stepOutProgress: 0, // 0 = inside room, 1 = standing at railing
    mode: 2, // 0 = Grandpa stretching, 1 = Sea Lion clapping, 2 = Both together! (Start with Both so user sees right away, then cycle 0 -> 1 -> 2)
    timer: 0,
    activeDuration: 340, // ~5.6 seconds open
    closedDuration: 160, // ~2.6 seconds closed between appearances
    bubbleText: "👴🦭 GOOD EVENING!",
    sfxPlayedForCycle: false
  };

  function triggerBalconyShow(forceNextMode = true) {
    if (forceNextMode) {
      balconyShow.mode = (balconyShow.mode + 1) % 3;
    }
    balconyShow.phase = "opening";
    balconyShow.timer = 0;
    const labels = [
      "👴 AAAHH... STRETCH! 🥱",
      "🦭 ARF! ARF! 🐟",
      "👴🦭 FISH TIME ON FLOOR 5!"
    ];
    balconyShow.bubbleText = labels[balconyShow.mode];
    if (balconyShow.mode === 1 || balconyShow.mode === 2) {
      playSfx("bark1", 0.55);
    } else {
      playSfx("horn", 0.25);
    }
    spawnWorldRipple(BALCONY_POS.wx, BALCONY_POS.wy + 16, "#F4A23E", 95);
  }

  function updateAndDrawBalconyShow(ctx) {
    // Advance state machine
    if (balconyShow.phase === "closed") {
      balconyShow.openProgress = Math.max(0, balconyShow.openProgress - 0.04);
      balconyShow.stepOutProgress = 0;
      balconyShow.timer++;
      if (balconyShow.timer >= balconyShow.closedDuration) {
        balconyShow.mode = (balconyShow.mode + 1) % 3;
        const labels = [
          "👴 AAAHH... STRETCH! 🥱",
          "🦭 ARF! ARF! 🐟",
          "👴🦭 FLOOR 5 BALCONY CREW!"
        ];
        balconyShow.bubbleText = labels[balconyShow.mode];
        balconyShow.phase = "opening";
        balconyShow.timer = 0;
      }
    } else if (balconyShow.phase === "opening") {
      balconyShow.openProgress = Math.min(1, balconyShow.openProgress + 0.032);
      if (balconyShow.openProgress > 0.45) {
        balconyShow.stepOutProgress = Math.min(1, balconyShow.stepOutProgress + 0.04);
      }
      if (balconyShow.openProgress >= 1 && balconyShow.stepOutProgress >= 1) {
        balconyShow.phase = "active";
        balconyShow.timer = 0;
      }
    } else if (balconyShow.phase === "active") {
      balconyShow.timer++;
      if (balconyShow.timer === 30 && (balconyShow.mode === 1 || balconyShow.mode === 2)) {
        spawnWorldRipple(BALCONY_POS.wx, BALCONY_POS.wy + 18, "#FF5A1F", 70);
      }
      if (balconyShow.timer >= balconyShow.activeDuration) {
        balconyShow.phase = "closing";
        balconyShow.timer = 0;
      }
    } else if (balconyShow.phase === "closing") {
      balconyShow.stepOutProgress = Math.max(0, balconyShow.stepOutProgress - 0.045);
      if (balconyShow.stepOutProgress < 0.45) {
        balconyShow.openProgress = Math.max(0, balconyShow.openProgress - 0.035);
      }
      if (balconyShow.openProgress <= 0 && balconyShow.stepOutProgress <= 0) {
        balconyShow.phase = "closed";
        balconyShow.timer = 0;
      }
    }

    const openP = balconyShow.openProgress;
    const stepP = balconyShow.stepOutProgress;
    const t = performance.now() * 0.001;

    ctx.save();
    ctx.translate(BALCONY_POS.wx, BALCONY_POS.wy);

    // Isometric skew matching the building facade (slope dy/dx = +0.255)
    const slope = 0.255;
    const doorW = 68;
    const doorH = 98;
    const halfW = doorW * 0.5;

    // Helper to skew Y by X along the facade
    ctx.save();
    ctx.transform(1, slope, 0, 1, 0, 0);

    // 1. Warm Tungsten Apartment Interior (visible as doors open)
    if (openP > 0.01) {
      const roomGrad = ctx.createLinearGradient(0, -doorH * 0.72, 0, doorH * 0.28);
      roomGrad.addColorStop(0, `rgba(255, 195, 95, ${(0.92 * openP).toFixed(3)})`);
      roomGrad.addColorStop(0.55, `rgba(235, 125, 38, ${(0.88 * openP).toFixed(3)})`);
      roomGrad.addColorStop(1, `rgba(90, 38, 12, ${(0.92 * openP).toFixed(3)})`);
      ctx.fillStyle = roomGrad;
      ctx.beginPath();
      ctx.rect(-halfW, -doorH * 0.72, doorW, doorH);
      ctx.fill();

      // Warm light spilling out onto the balcony floor & night air
      const spillGrad = ctx.createRadialGradient(0, 6, 4, 0, 14, 72);
      spillGrad.addColorStop(0, `rgba(255, 175, 65, ${(0.46 * openP).toFixed(3)})`);
      spillGrad.addColorStop(1, "rgba(255, 140, 30, 0)");
      ctx.fillStyle = spillGrad;
      ctx.beginPath();
      ctx.arc(0, 10, 72, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Left & Right Turquoise Louvered Balcony Doors swinging outward
    const drawShutterDoor = (isLeft) => {
      const sign = isLeft ? -1 : 1;
      const hingeX = sign * halfW;
      // As openP goes 0 -> 1, the door swings outward: its horizontal width foreshortens and angles out
      const closedPanelW = halfW;
      const swingAngle = openP * 1.28; // up to ~73 degrees open
      const projX = -sign * Math.cos(swingAngle) * closedPanelW;
      const projY = Math.sin(swingAngle) * 14; // outward perspective drop

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(hingeX, -doorH * 0.72);
      ctx.lineTo(hingeX + projX, -doorH * 0.72 + projY);
      ctx.lineTo(hingeX + projX, doorH * 0.28 + projY);
      ctx.lineTo(hingeX, doorH * 0.28);
      ctx.closePath();

      ctx.fillStyle = openP > 0.2 ? "#1D7874" : "#155958";
      ctx.fill();
      ctx.strokeStyle = "#0B2E2E";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Louver slats on the turquoise shutter
      ctx.strokeStyle = "rgba(9, 36, 36, 0.75)";
      ctx.lineWidth = 1.1;
      for (let sy = -doorH * 0.62; sy < doorH * 0.22; sy += 7.5) {
        ctx.beginPath();
        ctx.moveTo(hingeX + projX * 0.12, sy + projY * 0.12);
        ctx.lineTo(hingeX + projX * 0.88, sy + projY * 0.88);
        ctx.stroke();
      }

      // Brass door handle
      ctx.fillStyle = "#F4A23E";
      ctx.beginPath();
      ctx.arc(hingeX + projX * 0.82, -doorH * 0.18 + projY * 0.82, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawShutterDoor(true);
    drawShutterDoor(false);
    ctx.restore(); // undo wall skew for character drawing so characters stand upright

    // 3. Draw Characters emerging onto the balcony (behind the railing!)
    if (stepP > 0.02) {
      ctx.save();
      // Clip below the balcony slab so characters emerge cleanly from the doorway
      const emergeY = (1 - stepP) * 14;
      const scale = 0.78 + stepP * 0.22;
      ctx.translate(0, emergeY);
      ctx.scale(scale, scale);

      const showGrandpa = balconyShow.mode === 0 || balconyShow.mode === 2;
      const showSeaLion = balconyShow.mode === 1 || balconyShow.mode === 2;

      // --- GRANDPA WALT (Stretching arms overhead & looking out) ---
      if (showGrandpa) {
        const gx = balconyShow.mode === 2 ? -15 : 0;
        const gy = -8;
        const stretchCycle = Math.sin(t * 2.8); // smooth stretching cycle (-1..+1)
        const bodyArch = Math.max(0, stretchCycle) * -2.5;

        ctx.save();
        ctx.translate(gx, gy + bodyArch);

        // Warm knitted cardigan / vest torso
        ctx.fillStyle = "#8C4A27";
        ctx.beginPath();
        ctx.roundRect(-10, -24, 20, 26, 6);
        ctx.fill();

        // Cream shirt collar & suspenders/buttons
        ctx.fillStyle = "#FFF3DF";
        ctx.beginPath();
        ctx.moveTo(-4, -24);
        ctx.lineTo(4, -24);
        ctx.lineTo(0, -15);
        ctx.closePath();
        ctx.fill();

        // Stretching Arms! (Raise high above head when stretchCycle > 0, relax down when < 0)
        const armLift = (stretchCycle + 1) * 0.5; // 0 = down, 1 = stretched high overhead!
        const drawGrandpaArm = (side) => {
          ctx.save();
          ctx.translate(side * 9.5, -20);
          const angle = side * (-0.35 - armLift * 2.15);
          ctx.rotate(angle);
          // Sleeve
          ctx.strokeStyle = "#A85C32";
          ctx.lineWidth = 4.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 14);
          ctx.stroke();
          // Hand
          ctx.fillStyle = "#F4C29F";
          ctx.beginPath();
          ctx.arc(0, 15.5, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };
        drawGrandpaArm(-1);
        drawGrandpaArm(1);

        // Grandpa's Head
        ctx.fillStyle = "#F4C29F";
        ctx.beginPath();
        ctx.arc(0, -32.5, 7.6, 0, Math.PI * 2);
        ctx.fill();

        // Fluffy silver-white side hair & balding crown
        ctx.fillStyle = "#E5E7EB";
        ctx.beginPath();
        ctx.arc(-6.8, -33.5, 3.2, 0, Math.PI * 2);
        ctx.arc(6.8, -33.5, 3.2, 0, Math.PI * 2);
        ctx.arc(0, -38.8, 4.5, Math.PI, 0);
        ctx.fill();

        // Round gold-rimmed glasses
        ctx.strokeStyle = "#F4A23E";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(-2.8, -33, 2.3, 0, Math.PI * 2);
        ctx.arc(2.8, -33, 2.3, 0, Math.PI * 2);
        ctx.stroke();

        // Eyes (squinting happily during big stretch)
        ctx.fillStyle = "#1F2937";
        ctx.beginPath();
        ctx.arc(-2.8, -33, 0.9, 0, Math.PI * 2);
        ctx.arc(2.8, -33, 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Iconic thick white walrus mustache!
        ctx.fillStyle = "#F3F4F6";
        ctx.beginPath();
        ctx.ellipse(-2.5, -28.8, 3.8, 1.8, -0.2, 0, Math.PI * 2);
        ctx.ellipse(2.5, -28.8, 3.8, 1.8, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // --- BELIEVER THE CALIFORNIA SEA LION (Clapping flippers & barking!) ---
      if (showSeaLion) {
        const sx = balconyShow.mode === 2 ? 15 : 0;
        const sy = -4;
        const clapCycle = Math.sin(t * 9.5); // fast enthusiastic flipper claps!
        const headBob = Math.abs(Math.sin(t * 4.8)) * -2.8;

        ctx.save();
        ctx.translate(sx, sy);

        // Sleek glossy dark-chestnut Sea Lion body & neck
        ctx.fillStyle = "#4A2C18";
        ctx.beginPath();
        ctx.ellipse(0, -14, 10.5, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lighter tan belly/chest patch
        ctx.fillStyle = "#7C4D2B";
        ctx.beginPath();
        ctx.ellipse(0, -12, 6.5, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Clapping Front Flippers!
        const clapSpread = 3.5 + (clapCycle + 1) * 4.5; // claps together in center!
        const drawFlipper = (side) => {
          ctx.save();
          ctx.translate(side * clapSpread, -14);
          ctx.rotate(side * (0.25 - clapCycle * 0.35));
          ctx.fillStyle = "#2E1A0C";
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.5, 8.5, side * -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };
        drawFlipper(-1);
        drawFlipper(1);

        // Clap spark lines when flippers meet
        if (clapCycle < -0.55) {
          ctx.strokeStyle = "#F4A23E";
          ctx.lineWidth = 1.4;
          [-5, 0, 5].forEach((dy) => {
            ctx.beginPath();
            ctx.moveTo(-9, -14 + dy);
            ctx.lineTo(-13, -14 + dy * 1.4);
            ctx.moveTo(9, -14 + dy);
            ctx.lineTo(13, -14 + dy * 1.4);
            ctx.stroke();
          });
        }

        // Sea Lion Head & Snout (tilted proudly up)
        ctx.save();
        ctx.translate(0, -29 + headBob);
        ctx.fillStyle = "#5A351D";
        ctx.beginPath();
        ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
        ctx.fill();

        // Tan muzzle snout
        ctx.fillStyle = "#9C6B43";
        ctx.beginPath();
        ctx.ellipse(0, 2.2, 4.8, 3.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shiny black nose
        ctx.fillStyle = "#0B0B0F";
        ctx.beginPath();
        ctx.ellipse(0, 0.6, 2.0, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Big expressive dark eyes with white catchlights
        ctx.fillStyle = "#0B0B0F";
        ctx.beginPath();
        ctx.arc(-3.2, -2.0, 1.6, 0, Math.PI * 2);
        ctx.arc(3.2, -2.0, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(-3.6, -2.4, 0.6, 0, Math.PI * 2);
        ctx.arc(2.8, -2.4, 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Whiskers
        ctx.strokeStyle = "rgba(255, 245, 230, 0.85)";
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(-3.5, 2.2);
        ctx.lineTo(-9.5, 1.2);
        ctx.moveTo(-3.5, 3.0);
        ctx.lineTo(-9.2, 3.5);
        ctx.moveTo(3.5, 2.2);
        ctx.lineTo(9.5, 1.2);
        ctx.moveTo(3.5, 3.0);
        ctx.lineTo(9.2, 3.5);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      }

      ctx.restore();
    }

    // 4. Foreground Wrought-Iron Balcony Railing & Terracotta Flower Box (drawn IN FRONT of characters' legs!)
    ctx.save();
    ctx.transform(1, slope, 0, 1, 0, 0);
    const railW = 92;
    const railHalf = railW * 0.5;
    const railTopY = -6;
    const railBotY = 26;

    // Dark wrought-iron vertical balusters
    ctx.strokeStyle = "#121116";
    ctx.lineWidth = 2.0;
    for (let rx = -railHalf; rx <= railHalf; rx += 6.5) {
      ctx.beginPath();
      ctx.moveTo(rx, railTopY);
      ctx.lineTo(rx, railBotY);
      ctx.stroke();
    }

    // Top & bottom iron rails with warm streetlamp rim highlight
    ctx.strokeStyle = "#19171E";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-railHalf - 2, railTopY);
    ctx.lineTo(railHalf + 2, railTopY);
    ctx.moveTo(-railHalf - 2, railBotY);
    ctx.lineTo(railHalf + 2, railBotY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 175, 75, 0.55)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-railHalf, railTopY - 1);
    ctx.lineTo(railHalf, railTopY - 1);
    ctx.stroke();

    // Terracotta Flower Box mounted on the railing center
    ctx.fillStyle = "#8C3B20";
    ctx.strokeStyle = "#4A1C0D";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-18, railTopY + 2, 36, 10, 3);
    ctx.fill();
    ctx.stroke();

    // Little warm flowers/foliage in the flower box (adapts to NYC season & snow!)
    const activeSeason = getEffectiveSeason();
    const activeWeather = getEffectiveWeather();
    if (activeSeason === "winter" || activeWeather === "snow") {
      // Fluffy white snow cap resting on the flower box and iron railing!
      ctx.fillStyle = "rgba(245, 250, 255, 0.92)";
      ctx.beginPath();
      ctx.roundRect(-19, railTopY - 0.5, 38, 4.5, 2.5);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-railHalf, railTopY - 2.2, railW, 2.2, 1.2);
      ctx.fill();
    } else {
      ctx.fillStyle = activeSeason === "autumn" ? "#9A3412" : "#2E6F40";
      [-12, -5, 2, 9, 14].forEach((fx) => {
        ctx.beginPath();
        ctx.arc(fx, railTopY + 1.5, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = activeSeason === "spring" ? "#F472B6" : activeSeason === "autumn" ? "#F59E0B" : "#FF7A2F";
      [-9, 0, 10].forEach((fx) => {
        ctx.beginPath();
        ctx.arc(fx, railTopY + 1.0, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();

    // 5. Floating Caption Pill above the Balcony while doors are open
    if (stepP > 0.65 && balconyShow.bubbleText) {
      ctx.save();
      ctx.font = "700 9.5px 'JetBrains Mono', monospace";
      const tw = ctx.measureText(balconyShow.bubbleText).width;
      const bw = tw + 14;
      const bh = 17;
      const bx = -bw * 0.5;
      const by = -68;
      ctx.fillStyle = "rgba(11, 11, 15, 0.90)";
      ctx.strokeStyle = "#F4A23E";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FFF3DF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(balconyShow.bubbleText, 0, by + bh * 0.5 + 0.5);
      ctx.restore();
    }

    ctx.restore();
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================
  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);

    // Map Pan & Drag
    viewportEl.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".stage-marker")) return;
      camera.isDragging = true;
      camera.pointerMoved = false;
      camera.dragStartX = e.clientX;
      camera.dragStartY = e.clientY;
      camera.vx = 0;
      camera.vy = 0;
      viewportEl.classList.add("is-dragging");
    });

    window.addEventListener("pointermove", (e) => {
      const worldPt = screenToWorld(e.clientX, e.clientY);
      if (Math.random() < 0.22) {
        spawnWorldRipple(worldPt.x, worldPt.y, "rgba(242, 242, 240, 0.35)", 48);
      }

      if (!camera.isDragging) return;
      const dx = e.clientX - camera.dragStartX;
      const dy = e.clientY - camera.dragStartY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) camera.pointerMoved = true;
      camera.dragStartX = e.clientX;
      camera.dragStartY = e.clientY;

      const worldDx = dx / camera.zoom;
      const worldDy = dy / camera.zoom;
      camera.targetX -= worldDx;
      camera.targetY -= worldDy;
      camera.x -= worldDx * 0.85;
      camera.y -= worldDy * 0.85;
      camera.vx = -worldDx * 0.35;
      camera.vy = -worldDy * 0.35;
      clampCameraTargets();
    });

    window.addEventListener("pointerup", (e) => {
      if (camera.isDragging && !camera.pointerMoved) {
        const catScreen = worldToScreen(gingerCat.wx, gingerCat.wy - 8);
        const balconyScreen = worldToScreen(BALCONY_POS.wx, BALCONY_POS.wy - 15);
        if (Math.hypot(e.clientX - catScreen.x, e.clientY - catScreen.y) < 42) {
          triggerCatMeow();
        } else if (Math.hypot(e.clientX - balconyScreen.x, e.clientY - balconyScreen.y) < 58) {
          triggerBalconyShow(true);
        } else if (state.stampMode) {
          placePermitStamp(e.clientX, e.clientY);
        }
      }
      camera.isDragging = false;
      viewportEl.classList.remove("is-dragging");
    });

    viewportEl.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
        camera.targetZoom *= zoomFactor;
        clampCameraTargets();
      },
      { passive: false }
    );

    // Brand Logo Click
    document.getElementById("brand-logo-btn").addEventListener("click", () => {
      triggerSeaLionBark();
      resetCameraOverview();
    });

    setInterval(() => {
      const logo = document.getElementById("brand-logo-btn");
      if (!logo) return;
      logo.classList.add("is-blinking");
      setTimeout(() => logo.classList.remove("is-blinking"), 160);
    }, 3800);

    // Transport Controls
    document.getElementById("play-pause-btn").addEventListener("click", togglePlayPause);
    document.getElementById("prev-track-btn").addEventListener("click", () => {
      selectTrack(state.currentTrackIndex - 1, true);
    });
    document.getElementById("next-track-btn").addEventListener("click", () => {
      selectTrack(state.currentTrackIndex + 1, true);
    });

    // Clicking on the 9:16 vertical reel video toggles play/pause
    drawerReelVideo.addEventListener("click", () => {
      togglePlayPause();
    });

    // All Fullscreen Clip Triggers
    document.getElementById("header-fullscreen-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openFullscreenCinema();
    });
    document.getElementById("stage-header-box").addEventListener("click", (e) => {
      if (e.target.closest("#drawer-collapse-btn")) return;
      openFullscreenCinema();
    });
    document.getElementById("reel-floating-fs-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openFullscreenCinema();
    });
    document.getElementById("cinema-fullscreen-btn").addEventListener("click", () => {
      openFullscreenCinema();
    });
    document.getElementById("dock-fullscreen-btn").addEventListener("click", () => {
      openFullscreenCinema();
    });
    document.getElementById("dock-art-btn").addEventListener("click", () => {
      openFullscreenCinema();
    });

    // Fullscreen Cinema Modal Controls
    document.getElementById("close-fs-cinema-btn").addEventListener("click", closeFullscreenCinema);
    document.getElementById("fs-native-fullscreen-btn").addEventListener("click", () => {
      const shell = document.getElementById("cinema-theater-shell");
      if (!document.fullscreenElement && shell.requestFullscreen) {
        shell.requestFullscreen().catch(() => {});
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    });
    document.getElementById("fs-prev-clip-btn").addEventListener("click", () => {
      selectTrack(state.currentTrackIndex - 1, false);
      openFullscreenCinema();
    });
    document.getElementById("fs-next-clip-btn").addEventListener("click", () => {
      selectTrack(state.currentTrackIndex + 1, false);
      openFullscreenCinema();
    });

    // Timeline Scrubber
    const timelineTrack = document.getElementById("timeline-track");
    timelineTrack.addEventListener("click", (e) => {
      const rect = timelineTrack.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (isFinite(mainAudio.duration) && mainAudio.duration > 0) {
        mainAudio.currentTime = ratio * mainAudio.duration;
        playCurrentTrack();
      }
    });

    // Drawer Tabs (Watch Clip / Duet Lyrics / Duda Canon)
    document.querySelectorAll(".drawer-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        state.activeTab = tab;
        document.querySelectorAll(".drawer-tab-btn").forEach((b) => {
          b.classList.toggle("is-active", b.dataset.tab === tab);
        });
        document.getElementById("pane-video").classList.toggle("is-active", tab === "video");
        document.getElementById("pane-lyrics").classList.toggle("is-active", tab === "lyrics");
      });
    });

    const unmappedLyricsBtn = document.getElementById("unmapped-open-lyrics-btn");
    if (unmappedLyricsBtn) {
      unmappedLyricsBtn.addEventListener("click", () => {
        const lyricsTabBtn = document.getElementById("tab-btn-lyrics");
        if (lyricsTabBtn) lyricsTabBtn.click();
      });
    }

    // Drawer Collapse / Reopen + Mobile Clip & Lyrics Toggle
    const drawer = document.getElementById("stage-drawer");
    document.getElementById("drawer-collapse-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      drawer.classList.add("is-collapsed");
      syncMobileDrawerBtnLabel();
    });
    document.getElementById("drawer-reopen-btn").addEventListener("click", () => {
      drawer.classList.remove("is-collapsed");
      syncMobileDrawerBtnLabel();
    });
    const mobileDrawerBtn = document.getElementById("mobile-open-drawer-btn");
    if (mobileDrawerBtn) {
      mobileDrawerBtn.addEventListener("click", () => {
        drawer.classList.toggle("is-collapsed");
        syncMobileDrawerBtnLabel();
      });
    }

    // All 8 Songs Instant Playlist Modal (#mobile-playlist-modal)
    const mobilePlaylistModal = document.getElementById("mobile-playlist-modal");
    const openPlaylistFn = () => {
      if (mobilePlaylistModal) mobilePlaylistModal.classList.add("is-open");
    };
    const closePlaylistBtn = document.getElementById("close-mobile-playlist-btn");
    if (closePlaylistBtn && mobilePlaylistModal) {
      closePlaylistBtn.addEventListener("click", () => {
        mobilePlaylistModal.classList.remove("is-open");
      });
      mobilePlaylistModal.addEventListener("click", (e) => {
        if (e.target === mobilePlaylistModal) {
          mobilePlaylistModal.classList.remove("is-open");
        }
      });
    }
    ["mobile-open-playlist-btn", "dock-playlist-btn", "dock-meta-btn"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", openPlaylistFn);
    });

    // PERFECT! Snapshot & Gallery buttons in Watch Clip tab
    document.getElementById("cinema-snap-btn").addEventListener("click", triggerPerfectFlash);
    document.getElementById("cinema-gallery-btn").addEventListener("click", () => {
      document.getElementById("gallery-modal").classList.add("is-open");
    });

    // Left Toybox Buttons
    document.getElementById("toy-bark-btn").addEventListener("click", triggerSeaLionBark);
    document.getElementById("toy-flash-btn").addEventListener("click", triggerPerfectFlash);
    document.getElementById("toy-stamp-btn").addEventListener("click", (e) => {
      state.stampMode = !state.stampMode;
      e.currentTarget.classList.toggle("is-active", state.stampMode);
      viewportEl.classList.toggle("stamp-mode-active", state.stampMode);
      placePermitStamp(
        window.innerWidth * 0.42 + (Math.random() - 0.5) * 140,
        window.innerHeight * 0.48 + (Math.random() - 0.5) * 120
      );
    });
    document.getElementById("toy-rain-btn").addEventListener("click", () => {
      const cur = getEffectiveWeather();
      nycEnv.weatherOverride = cur === "rain" ? "clear" : "rain";
      syncNycEnvHud();
      playSfx("splash", 0.4);
    });
    const toySnowBtn = document.getElementById("toy-snow-btn");
    if (toySnowBtn) {
      toySnowBtn.addEventListener("click", () => {
        const cur = getEffectiveWeather();
        if (cur === "snow") {
          nycEnv.weatherOverride = "auto";
          nycEnv.seasonOverride = "auto";
        } else {
          nycEnv.weatherOverride = "snow";
          nycEnv.seasonOverride = "winter";
        }
        syncNycEnvHud();
        playSfx("splash", 0.32);
      });
    }
    document.getElementById("toy-reset-btn").addEventListener("click", resetCameraOverview);

    // Ginger Cat Resident Controls (HUD Button, Toybox Button & Floating Action Bar)
    const hudCatBtn = document.getElementById("hud-cat-btn");
    const toyCatBtn = document.getElementById("toy-cat-btn");
    const catActFeed = document.getElementById("cat-act-feed");
    const catActGroom = document.getElementById("cat-act-groom");
    const catActNap = document.getElementById("cat-act-nap");
    const catActWalk = document.getElementById("cat-act-walk");
    const catActDj = document.getElementById("cat-act-dj");
    const catBarClose = document.getElementById("cat-bar-close");

    if (hudCatBtn) {
      hudCatBtn.addEventListener("click", () => toggleCatFollowCam());
    }
    if (toyCatBtn) {
      toyCatBtn.addEventListener("click", () => toggleCatFollowCam());
    }
    if (catActFeed) {
      catActFeed.addEventListener("click", () => tossFishToCat());
    }
    if (catActGroom) {
      catActGroom.addEventListener("click", () => setCatPoseManual("groom"));
    }
    if (catActNap) {
      catActNap.addEventListener("click", () => setCatPoseManual("lie"));
    }
    if (catActWalk) {
      catActWalk.addEventListener("click", () => setCatPoseManual("walk"));
    }
    if (catActDj) {
      catActDj.addEventListener("click", () => triggerCatDjPick());
    }
    if (catBarClose) {
      catBarClose.addEventListener("click", () => toggleCatFollowCam(false));
    }

    // New York City Live Atmosphere HUD Button & Popover Controls
    const nycEnvBtn = document.getElementById("nyc-env-btn");
    const nycPopover = document.getElementById("nyc-env-popover");
    const nycSyncAutoBtn = document.getElementById("nyc-sync-auto-btn");

    if (nycEnvBtn && nycPopover) {
      nycEnvBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        nycEnv.popoverOpen = !nycEnv.popoverOpen;
        nycPopover.classList.toggle("is-open", nycEnv.popoverOpen);
      });
      nycPopover.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      window.addEventListener("click", () => {
        if (nycEnv.popoverOpen) {
          nycEnv.popoverOpen = false;
          nycPopover.classList.remove("is-open");
        }
      });
    }

    if (nycSyncAutoBtn) {
      nycSyncAutoBtn.addEventListener("click", () => {
        nycEnv.todOverride = "auto";
        nycEnv.weatherOverride = "auto";
        nycEnv.seasonOverride = "auto";
        updateNycClockAndSeason();
        fetchLiveNycWeather();
      });
    }

    document.querySelectorAll("#nyc-tod-pills .nyc-opt-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        nycEnv.todOverride = btn.dataset.tod;
        syncNycEnvHud();
      });
    });
    document.querySelectorAll("#nyc-weather-pills .nyc-opt-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        nycEnv.weatherOverride = btn.dataset.weather;
        syncNycEnvHud();
      });
    });
    document.querySelectorAll("#nyc-season-pills .nyc-opt-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        nycEnv.seasonOverride = btn.dataset.season;
        syncNycEnvHud();
      });
    });

    // Ambience Toggle
    const ambBtn = document.getElementById("ambience-toggle-btn");
    ambBtn.addEventListener("click", () => {
      state.ambienceActive = !state.ambienceActive;
      ambBtn.classList.toggle("is-active", state.ambienceActive);
      const dict = I18N[state.lang] || I18N.en;
      document.getElementById("i18n-ambience-label").textContent = state.ambienceActive ? dict.soundOn : dict.soundOff;
      if (state.ambienceActive) {
        ambAudio.play().catch(() => {});
        playSfx("horn", 0.3);
      } else {
        ambAudio.pause();
      }
    });

    // Language Switcher
    document.getElementById("lang-en-btn").addEventListener("click", () => setLanguage("en"));
    document.getElementById("lang-uk-btn").addEventListener("click", () => setLanguage("uk"));

    // Modals: Instagram Reels Wall, Photo Gallery, Lightbox, Brand Sting v7
    const reelsModal = document.getElementById("reels-modal");
    const galleryModal = document.getElementById("gallery-modal");
    const lightboxModal = document.getElementById("photo-lightbox-modal");
    const stingModal = document.getElementById("sting-modal");
    const stingVideo = document.getElementById("sting-video-player");

    document.getElementById("open-reels-btn").addEventListener("click", () => {
      reelsModal.classList.add("is-open");
    });
    document.getElementById("close-reels-btn").addEventListener("click", () => {
      reelsModal.classList.remove("is-open");
    });

    document.getElementById("open-gallery-btn").addEventListener("click", () => {
      galleryModal.classList.add("is-open");
    });
    document.getElementById("close-gallery-btn").addEventListener("click", () => {
      galleryModal.classList.remove("is-open");
    });

    document.querySelectorAll("#gallery-filter-bar .hud-pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        buildPhotoGallery(btn.dataset.filter);
      });
    });

    document.getElementById("close-lightbox-btn").addEventListener("click", () => {
      lightboxModal.classList.remove("is-open");
    });
    document.getElementById("lightbox-prev-btn").addEventListener("click", () => {
      openPhotoLightbox(state.lightboxIndex - 1);
    });
    document.getElementById("lightbox-next-btn").addEventListener("click", () => {
      openPhotoLightbox(state.lightboxIndex + 1);
    });

    document.getElementById("open-sting-btn").addEventListener("click", () => {
      pauseCurrentTrack();
      stingModal.classList.add("is-open");
      stingVideo.currentTime = 0;
      stingVideo.play().catch(() => {});
    });
    document.getElementById("close-sting-btn").addEventListener("click", () => {
      stingVideo.pause();
      stingModal.classList.remove("is-open");
    });
    document.getElementById("replay-sting-btn").addEventListener("click", () => {
      stingVideo.currentTime = 0;
      stingVideo.play().catch(() => {});
    });

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowRight" && lightboxModal.classList.contains("is-open")) {
        openPhotoLightbox(state.lightboxIndex + 1);
      } else if (e.key === "ArrowLeft" && lightboxModal.classList.contains("is-open")) {
        openPhotoLightbox(state.lightboxIndex - 1);
      } else if (k === "b") {
        triggerSeaLionBark();
      } else if (k === "f") {
        triggerPerfectFlash();
      } else if (k === "p") {
        document.getElementById("toy-stamp-btn").click();
      } else if (k === "r") {
        document.getElementById("toy-rain-btn").click();
      } else if (k === "w") {
        const snowBtn = document.getElementById("toy-snow-btn");
        if (snowBtn) snowBtn.click();
      } else if (k === "k") {
        toggleCatFollowCam();
      } else if (k === "c") {
        resetCameraOverview();
      } else if (e.key === "Escape") {
        if (nycEnv.popoverOpen && nycPopover) {
          nycEnv.popoverOpen = false;
          nycPopover.classList.remove("is-open");
        } else if (mobilePlaylistModal && mobilePlaylistModal.classList.contains("is-open")) {
          mobilePlaylistModal.classList.remove("is-open");
        } else if (lightboxModal.classList.contains("is-open")) {
          lightboxModal.classList.remove("is-open");
        } else if (state.fsCinemaOpen) {
          closeFullscreenCinema();
        } else {
          reelsModal.classList.remove("is-open");
          galleryModal.classList.remove("is-open");
          stingModal.classList.remove("is-open");
          stingVideo.pause();
        }
      }
    });
  }

  // ============================================================================
  // BOOTSTRAP
  // ============================================================================
  function init() {
    resizeCanvas();
    updateNycClockAndSeason();
    fetchLiveNycWeather();
    setInterval(updateNycClockAndSeason, 15000);
    setInterval(fetchLiveNycWeather, 600000); // Refresh live NYC weather every 10 minutes
    buildMapMarkersAndQuickStrip();
    buildInstagramReelsWall();
    buildPhotoGallery("all");
    bindEvents();
    syncCatResidentHud();
    // On mobile screens, start with the drawer minimized so the All-8-Songs top bar & interactive map are 100% open
    if (window.innerWidth <= 860) {
      const drawer = document.getElementById("stage-drawer");
      if (drawer) drawer.classList.add("is-collapsed");
    }
    syncMobileDrawerBtnLabel();
    // Start on 01 · Loud Enough so chronological order 01 -> 06 is immediately clear
    selectTrack(0, false);
    requestAnimationFrame(renderOverworldLoop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

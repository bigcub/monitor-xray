"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

type SizeKey = "24" | "27" | "32" | "34uw";
type PanelKey = "IPS" | "VA" | "OLED";
type ResolutionKey = "1080p" | "1440p" | "4K";
type RefreshKey = 60 | 144 | 240;
type LayerId = "glass" | "pixels" | "diffuser" | "backlight" | "electronics" | "housing";
type RenderKey = "scene" | "pixels" | "motion" | "specs";

const sizes: Record<SizeKey, { label: string; inches: number; ratio: [number, number] }> = {
  "24": { label: "24\"", inches: 24, ratio: [16, 9] },
  "27": { label: "27\"", inches: 27, ratio: [16, 9] },
  "32": { label: "32\"", inches: 32, ratio: [16, 9] },
  "34uw": { label: "34\" UW", inches: 34, ratio: [21, 9] },
};

const resolutionSets: Record<"wide" | "ultrawide", Record<ResolutionKey, { label: string; width: number; height: number }>> = {
  wide: {
    "1080p": { label: "FHD", width: 1920, height: 1080 },
    "1440p": { label: "QHD", width: 2560, height: 1440 },
    "4K": { label: "4K", width: 3840, height: 2160 },
  },
  ultrawide: {
    "1080p": { label: "UW-FHD", width: 2560, height: 1080 },
    "1440p": { label: "UW-QHD", width: 3440, height: 1440 },
    "4K": { label: "5K2K", width: 5120, height: 2160 },
  },
};

const panelFacts: Record<PanelKey, { summary: string; contrast: string; response: string; light: string }> = {
  IPS: {
    summary: "In-plane crystals hold colour and brightness across wide viewing angles.",
    contrast: "~1,000:1",
    response: "1–5 ms",
    light: "LED backlight → liquid-crystal shutters",
  },
  VA: {
    summary: "Vertically aligned crystals block more light for deeper LCD blacks.",
    contrast: "~3,000:1",
    response: "3–8 ms",
    light: "LED backlight → liquid-crystal shutters",
  },
  OLED: {
    summary: "Every subpixel emits its own light and can switch completely off.",
    contrast: "Pixel black",
    response: "~0.1 ms",
    light: "Self-emissive pixels — no backlight",
  },
};

const layerCopy: Record<LayerId, { name: string; short: string; lcd: string; oled?: string }> = {
  glass: {
    name: "Front glass + polarizer",
    short: "Directs light and protects the panel",
    lcd: "The anti-glare surface cuts reflections. A polarizing film gives the liquid crystals a light direction they can control.",
    oled: "Anti-glare glass and encapsulation protect the oxygen-sensitive emitters beneath.",
  },
  pixels: {
    name: "Pixel matrix",
    short: "Millions of controlled RGB subpixels",
    lcd: "Thin-film transistors set each liquid crystal. RGB filters turn the shared white light into the colours you see.",
    oled: "Organic red, green and blue emitters glow directly. Each subpixel is a microscopic lamp.",
  },
  diffuser: {
    name: "Optical films",
    short: "Makes a point light look perfectly even",
    lcd: "Diffuser and prism sheets mix the LED points into one even field, then aim more of that light toward your eyes.",
    oled: "OLED does not need optical mixing films because light originates at every pixel.",
  },
  backlight: {
    name: "LED backlight",
    short: "The hidden light source in every LCD",
    lcd: "Edge-lit or full-array LEDs create the white light. Local dimming adds zones, but one zone still illuminates many pixels.",
    oled: "This entire layer disappears. OLED pixels produce their own light, enabling true black and a thinner panel.",
  },
  electronics: {
    name: "Timing + driver boards",
    short: "Maps each frame onto the pixel grid",
    lcd: "The timing controller decodes the incoming frame. Row and column drivers charge every subpixel transistor.",
    oled: "The timing controller maps each frame while the backplane meters current to every emissive subpixel.",
  },
  housing: {
    name: "Rear chassis",
    short: "Structure, cooling, ports and power",
    lcd: "The shell holds the power supply, inputs, controller and heat-spreading metal chassis.",
    oled: "A thin metal backplate spreads heat from the pixels and carries the electronics, ports and stand mount.",
  },
};

const layerFacts: Record<LayerId, { builtFrom: string; inspect: string }> = {
  glass: { builtFrom: "Coated glass, polarizer, adhesive films", inspect: "Glare control, clarity and viewing angle" },
  pixels: { builtFrom: "TFT backplane, liquid crystal or OLED emitters", inspect: "Subpixel layout, response and pixel defects" },
  diffuser: { builtFrom: "Reflector, diffuser and prism sheets", inspect: "Uniformity, hotspots and brightness loss" },
  backlight: { builtFrom: "Edge LEDs, full-array LEDs or mini-LED zones", inspect: "Blooming, zone count and peak brightness" },
  electronics: { builtFrom: "Scaler, T-CON and row/column drivers", inspect: "Signal timing, processing lag and inputs" },
  housing: { builtFrom: "Metal chassis, power supply and rear shell", inspect: "Cooling, rigidity, ports and serviceability" },
};

const layers: Array<{ id: LayerId; label: string; plane: number }> = [
  { id: "housing", label: "Rear shell", plane: -2.5 },
  { id: "electronics", label: "Drivers", plane: -1.5 },
  { id: "backlight", label: "Backlight", plane: -0.5 },
  { id: "diffuser", label: "Optics", plane: 0.5 },
  { id: "pixels", label: "Pixels", plane: 1.5 },
  { id: "glass", label: "Glass", plane: 2.5 },
];

const format = (value: number) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);

export default function Home() {
  const [sizeKey, setSizeKey] = useState<SizeKey>("27");
  const [panel, setPanel] = useState<PanelKey>("IPS");
  const [resolutionKey, setResolutionKey] = useState<ResolutionKey>("1440p");
  const [refresh, setRefresh] = useState<RefreshKey>(144);
  const [exploded, setExploded] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<LayerId>("backlight");
  const [rotation, setRotation] = useState({ x: -7, y: -32 });
  const [separation, setSeparation] = useState(85);
  const [powered, setPowered] = useState(true);
  const [renderMode, setRenderMode] = useState<RenderKey>("scene");
  const [focusMode, setFocusMode] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("monitor-xray-theme");
    const nextTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("monitor-xray-theme", nextTheme);
  };

  const size = sizes[sizeKey];
  const resolution = resolutionSets[sizeKey === "34uw" ? "ultrawide" : "wide"][resolutionKey];
  const calculations = useMemo(() => {
    const [rw, rh] = size.ratio;
    const root = Math.sqrt(rw * rw + rh * rh);
    const widthIn = (size.inches * rw) / root;
    const heightIn = (size.inches * rh) / root;
    return {
      widthCm: widthIn * 2.54,
      heightCm: heightIn * 2.54,
      ppi: Math.sqrt(resolution.width ** 2 + resolution.height ** 2) / size.inches,
      megapixels: (resolution.width * resolution.height) / 1_000_000,
      frameTime: 1000 / refresh,
    };
  }, [refresh, resolution.height, resolution.width, size.inches, size.ratio]);

  const chosenLayer = layerCopy[selectedLayer];
  const panelDescription = panel === "OLED" && chosenLayer.oled ? chosenLayer.oled : chosenLayer.lcd;
  const sampleCount = refresh === 60 ? 5 : refresh === 144 ? 9 : 13;

  const chooseLayer = (id: LayerId) => {
    setSelectedLayer(id);
    setExploded(true);
    setSeparation((current) => Math.max(current, 95));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, rx: rotation.x, ry: rotation.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setRotation({
      x: Math.max(-26, Math.min(20, drag.current.rx - (event.clientY - drag.current.y) * 0.12)),
      y: drag.current.ry + (event.clientX - drag.current.x) * 0.18,
    });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.shiftKey ? 12 : 5;
    if (event.key === "ArrowLeft") setRotation((current) => ({ ...current, y: current.y - delta }));
    else if (event.key === "ArrowRight") setRotation((current) => ({ ...current, y: current.y + delta }));
    else if (event.key === "ArrowUp") setRotation((current) => ({ ...current, x: Math.max(-26, current.x - delta) }));
    else if (event.key === "ArrowDown") setRotation((current) => ({ ...current, x: Math.min(20, current.x + delta) }));
    else return;
    event.preventDefault();
  };

  const rootStyle = {
    "--screen-ratio": `${size.ratio[0]} / ${size.ratio[1]}`,
    "--screen-scale": sizeKey === "24" ? 0.84 : sizeKey === "27" ? 0.91 : sizeKey === "32" ? 0.98 : 1,
    "--pixel-step": resolutionKey === "1080p" ? "15px" : resolutionKey === "1440p" ? "10px" : "6px",
    "--rot-x": `${rotation.x}deg`,
    "--rot-y": `${rotation.y}deg`,
  } as CSSProperties;

  const options = <T extends string | number>(items: readonly T[], value: T, setter: (value: T) => void, labels?: (item: T) => string) => (
    <div className={`option-grid count-${items.length}`} role="group">
      {items.map((item) => (
        <button type="button" key={item} className={value === item ? "active" : ""} onClick={() => setter(item)} aria-pressed={value === item}>
          {labels ? labels(item) : String(item)}
        </button>
      ))}
    </div>
  );

  return (
    <main className={`lab-app panel-${panel.toLowerCase()} render-${renderMode}${exploded ? " is-exploded" : ""}${powered ? "" : " power-off"}${focusMode ? " focus-mode" : ""}`} style={rootStyle}>
      <header className="app-bar">
        <div className="identity">
          <span className="identity-mark" aria-hidden="true"><i /><i /><i /></span>
          <div><strong>Monitor X-Ray</strong><small>Interactive display anatomy</small></div>
        </div>
        <button type="button" className="theme-control" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
          <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>{theme === "light" ? "Dark" : "Light"}
        </button>
      </header>

      <aside className="spec-dock dock" aria-label="Configure the monitor">
        <div className="dock-title"><strong>Build a monitor</strong><small>Every choice updates the model</small></div>

        <div className="control-group">
          <div className="control-label"><span>Size</span><b>{size.label} diagonal</b></div>
          {options(Object.keys(sizes) as SizeKey[], sizeKey, setSizeKey, (key) => sizes[key].label)}
        </div>
        <div className="control-group">
          <div className="control-label"><span>Panel type</span><b>{panel}</b></div>
          {options(["IPS", "VA", "OLED"] as const, panel, setPanel)}
        </div>
        <div className="control-group">
          <div className="control-label"><span>Resolution</span><b>{resolution.width.toLocaleString()} × {resolution.height.toLocaleString()}</b></div>
          {options(["1080p", "1440p", "4K"] as const, resolutionKey, setResolutionKey, (key) => resolutionSets[sizeKey === "34uw" ? "ultrawide" : "wide"][key].label)}
        </div>
        <div className="control-group">
          <div className="control-label"><span>Refresh rate</span><b>{refresh} frames / sec</b></div>
          {options([60, 144, 240] as const, refresh, setRefresh, (key) => `${key} Hz`)}
        </div>
        <div className="control-group">
          <div className="control-label"><span>On screen</span><b>{powered ? ({ scene: "Scene", pixels: "Test pattern", motion: "Motion", specs: "Specs" })[renderMode] : "Display off"}</b></div>
          {options(["scene", "pixels", "motion", "specs"] as const, renderMode, setRenderMode, (key) => ({ scene: "Scene", pixels: "Test", motion: "Motion", specs: "Specs" })[key])}
        </div>

        <section className="spec-sheet" aria-label="Resulting specification">
          <h3>What you get</h3>
          <dl>
            <div><dt>Screen area</dt><dd>{format(calculations.widthCm)} × {format(calculations.heightCm)} cm</dd></div>
            <div><dt>Pixel density</dt><dd>{Math.round(calculations.ppi)} PPI · {calculations.megapixels.toFixed(1)} MP</dd></div>
            <div><dt>Light source</dt><dd>{panel === "OLED" ? "Self-emissive RGB" : "White LED + LCD"}</dd></div>
            <div><dt>Frame time</dt><dd>{calculations.frameTime.toFixed(2)} ms</dd></div>
          </dl>
          <p><b>{panel}</b> {panelFacts[panel].summary}</p>
        </section>
      </aside>

      <section className="stage" aria-label="Interactive 3D monitor model">
        <div className="stage-toolbar">
          <div className="segmented" role="group" aria-label="Assembly">
            <button type="button" className={exploded ? "" : "active"} onClick={() => setExploded(false)} aria-pressed={!exploded}>Assembled</button>
            <button type="button" className={exploded ? "active" : ""} onClick={() => setExploded(true)} aria-pressed={exploded}>Exploded</button>
          </div>
          <label className="spread-control">
            <span>Layer gap</span>
            <input type="range" min="30" max="140" step="5" value={separation} onChange={(event) => { setSeparation(Number(event.target.value)); setExploded(true); }} aria-label="Layer depth separation along the Z axis" />
          </label>
          <div className="toolbar-actions">
            <button type="button" className={`tool-button power-control${powered ? " on" : ""}`} onClick={() => setPowered((value) => !value)} aria-pressed={powered} aria-label={`Turn monitor ${powered ? "off" : "on"}`}>
              <span className="power-icon" aria-hidden="true"><i /></span>{powered ? "On" : "Off"}
            </button>
            <button type="button" className="tool-button" onClick={() => setRotation({ x: -7, y: -32 })}>Reset view</button>
            <button type="button" className={`tool-button focus-control${focusMode ? " active" : ""}`} onClick={() => setFocusMode((value) => !value)} aria-pressed={focusMode}>
              {focusMode ? "Show panels" : "Expand"}
            </button>
          </div>
        </div>

        <div
          className="scene"
          role="application"
          aria-label={`Rotatable exploded ${panel} monitor. Drag or use arrow keys to rotate.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { drag.current = null; }}
          onKeyDown={onKeyDown}
          tabIndex={0}
        >
          <div className="assembly">
            <div className="stand" aria-hidden="true"><span /><i /></div>
            {layers.map((layer) => {
              const absent = panel === "OLED" && (layer.id === "backlight" || layer.id === "diffuser");
              const layerStyle = {
                "--layer-z": `${layer.plane * 7}px`,
                "--layer-z-deep": `calc(var(--assembly-w) * ${((layer.plane * separation) / 600).toFixed(4)})`,
              } as CSSProperties;
              return (
                <button
                  type="button"
                  key={layer.id}
                  style={layerStyle}
                  className={`monitor-layer layer-${layer.id}${selectedLayer === layer.id ? " selected" : ""}${absent ? " absent" : ""}`}
                  onClick={(event) => { event.stopPropagation(); chooseLayer(layer.id); }}
                  aria-label={`${layerCopy[layer.id].name}${absent ? ", removed in OLED" : ""}`}
                >
                  {layer.id === "pixels" && (
                    <span className={`screen-image screen-${renderMode}`} aria-hidden="true">
                      <span className="screen-off-state"><i /> DISPLAY OFF</span>
                      {renderMode === "scene" && <><span className="screen-orb" /><span className="screen-land" /></>}
                      {renderMode === "pixels" && <span className="test-pattern"><i /><i /><i /><i /><i /><i /><b /><b /></span>}
                      {renderMode === "motion" && <span className="motion-demo"><span>{Array.from({ length: sampleCount }, (_, index) => <i key={index} style={{ left: `${(index / (sampleCount - 1)) * 100}%` }} />)}</span><b /></span>}
                      {renderMode === "specs" && <span className="screen-specs"><small>LIVE SIGNAL</small><b>{resolution.label}</b><strong>{refresh} HZ</strong><i>{panel} · {size.label}</i></span>}
                      <span className="screen-grid" />
                    </span>
                  )}
                  {layer.id === "electronics" && <span className="circuit-board" aria-hidden="true"><i /><i /><i /><b /><b /><b /></span>}
                  {layer.id === "backlight" && <span className="led-field" aria-hidden="true">{Array.from({ length: 60 }, (_, index) => <i key={index} />)}</span>}
                  {layer.id === "diffuser" && <span className="diffuser-lines" aria-hidden="true" />}
                  {layer.id === "housing" && <span className="port-bank" aria-hidden="true"><i /><i /><i /><i /></span>}
                  <span className="layer-tag"><b>{absent ? "REMOVED" : layer.label}</b></span>
                </button>
              );
            })}
          </div>

          <div className="orbit-cue" aria-hidden="true">Drag to orbit · click a layer to inspect</div>
        </div>
      </section>

      <aside className="layer-dock dock" aria-label="Monitor layer inspector">
        <div className="dock-title"><strong>Inside the panel</strong><small>Front to back · select a layer</small></div>
        <div className="layer-list" role="list">
          {layers.slice().reverse().map((layer, index) => {
            const absent = panel === "OLED" && (layer.id === "backlight" || layer.id === "diffuser");
            return (
              <button type="button" role="listitem" key={layer.id} className={`${selectedLayer === layer.id ? "active" : ""}${absent ? " absent" : ""}`} onClick={() => chooseLayer(layer.id)}>
                <span className={`layer-swatch swatch-${layer.id}`} />
                <span><b>{String(index + 1).padStart(2, "0")}</b>{layerCopy[layer.id].name}<small>{absent ? "Not present in OLED" : layerCopy[layer.id].short}</small></span>
              </button>
            );
          })}
        </div>

        <article className="layer-detail" aria-live="polite">
          <span>Selected · {panel}</span>
          <h2>{chosenLayer.name}</h2>
          <p>{panelDescription}</p>
          <div className="detail-facts">
            <div><small>Built from</small><b>{layerFacts[selectedLayer].builtFrom}</b></div>
            <div><small>Inspect for</small><b>{layerFacts[selectedLayer].inspect}</b></div>
            <div><small>Light path</small><b>{panelFacts[panel].light}</b></div>
          </div>
        </article>
      </aside>

      <footer className="signal-rail" aria-label="How one frame reaches the display">
        <strong className="rail-title">One frame, end to end</strong>
        <ol>
          <li><span className="step-icon cable">DP</span><div><b>Signal in</b><small>GPU sends colour + brightness</small></div></li>
          <li><span className="step-icon chip">T</span><div><b>Timing control</b><small>Frame maps to every subpixel</small></div></li>
          <li><span className="step-icon light"><i /><i /><i /></span><div><b>{panel === "OLED" ? "Pixels emit" : "Light is shaped"}</b><small>{panel === "OLED" ? "RGB subpixels make light" : `${panel} gates the backlight`}</small></div></li>
          <li><span className="step-icon cadence">{Array.from({ length: sampleCount }, (_, index) => <i key={index} />)}</span><div><b>{refresh} Hz refresh</b><small>New frame every {calculations.frameTime.toFixed(2)} ms</small></div></li>
        </ol>
      </footer>
    </main>
  );
}

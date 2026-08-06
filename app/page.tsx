"use client";

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

type SizeKey = "24" | "27" | "32" | "34uw";
type PanelKey = "IPS" | "VA" | "OLED";
type ResolutionKey = "1080p" | "1440p" | "4K";
type RefreshKey = 60 | 144 | 240;
type LayerId = "glass" | "pixels" | "diffuser" | "backlight" | "electronics" | "housing";

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
    "4K": { label: "4K UHD", width: 3840, height: 2160 },
  },
  ultrawide: {
    "1080p": { label: "UW-FHD", width: 2560, height: 1080 },
    "1440p": { label: "UW-QHD", width: 3440, height: 1440 },
    "4K": { label: "5K2K", width: 5120, height: 2160 },
  },
};

const panelFacts: Record<PanelKey, { summary: string; contrast: string; response: string; light: string }> = {
  IPS: {
    summary: "Liquid crystals rotate in-plane, preserving colour and brightness from wide angles.",
    contrast: "~1,000:1",
    response: "1–5 ms",
    light: "LED backlight + liquid-crystal shutters",
  },
  VA: {
    summary: "Crystals stand more vertically when closed, blocking more light for deeper blacks.",
    contrast: "~3,000:1",
    response: "3–8 ms",
    light: "LED backlight + liquid-crystal shutters",
  },
  OLED: {
    summary: "Every subpixel makes its own light, so black pixels can switch completely off.",
    contrast: "Pixel-level black",
    response: "~0.1 ms",
    light: "Self-emissive pixels — no backlight",
  },
};

const layerCopy: Record<LayerId, { name: string; kicker: string; lcd: string; oled?: string }> = {
  glass: {
    name: "Front glass + polarizer",
    kicker: "Controls glare and light direction",
    lcd: "A protective anti-glare surface sits over a polarizing film. The polarizer makes the liquid-crystal layer useful by admitting light in one orientation.",
    oled: "A protective anti-glare surface, polarizer and encapsulation layer shield the oxygen-sensitive OLED materials beneath.",
  },
  pixels: {
    name: "Pixel layer",
    kicker: "Turns a signal into red, green and blue",
    lcd: "Millions of transistors set the angle of liquid crystals. RGB colour filters turn the modulated white light into coloured subpixels.",
    oled: "Organic red, green and blue emitters glow directly when current passes through them. Each pixel is its own tiny lamp.",
  },
  diffuser: {
    name: "Optical films",
    kicker: "Spreads light evenly across the panel",
    lcd: "Diffuser and prism sheets mix thousands of bright LED points into one even field, then aim more of that light toward your eyes.",
    oled: "OLED needs no diffuser stack: every pixel already emits light at the exact point where the image is formed.",
  },
  backlight: {
    name: "Backlight",
    kicker: "The hidden light source in LCD monitors",
    lcd: "LEDs sit at the edges or directly behind the panel. Local-dimming models divide them into zones, but one zone still illuminates many pixels.",
    oled: "There is no backlight. Removing it makes OLED panels thinner and gives every pixel independent brightness control.",
  },
  electronics: {
    name: "Timing + driver boards",
    kicker: "Conducts the pixel orchestra",
    lcd: "The timing controller decodes each frame, then row and column drivers charge every subpixel transistor to the requested level.",
    oled: "The timing controller still maps every frame, while the driver backplane precisely meters current to each emissive subpixel.",
  },
  housing: {
    name: "Rear housing + thermal path",
    kicker: "Structure, cooling and ports",
    lcd: "The rear shell holds the power supply, DisplayPort or HDMI inputs, controller and heat-spreading metal chassis.",
    oled: "A thin metal backplate spreads heat from the pixels and electronics while the housing supports ports, power and the stand.",
  },
};

const layerOrder: Array<{ id: LayerId; short: string; depth: number; shift: number }> = [
  { id: "housing", short: "Rear shell", depth: -72, shift: -150 },
  { id: "electronics", short: "Drivers", depth: -58, shift: -102 },
  { id: "backlight", short: "Backlight", depth: -42, shift: -52 },
  { id: "diffuser", short: "Optical films", depth: -27, shift: -6 },
  { id: "pixels", short: "Pixel matrix", depth: -10, shift: 46 },
  { id: "glass", short: "Front glass", depth: 8, shift: 104 },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);
}

export default function Home() {
  const [sizeKey, setSizeKey] = useState<SizeKey>("27");
  const [panel, setPanel] = useState<PanelKey>("IPS");
  const [resolutionKey, setResolutionKey] = useState<ResolutionKey>("1440p");
  const [refresh, setRefresh] = useState<RefreshKey>(144);
  const [exploded, setExploded] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<LayerId>("backlight");
  const [rotation, setRotation] = useState({ x: -5, y: -16 });
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

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
  const ratio = `${size.ratio[0]} / ${size.ratio[1]}`;
  const sampleCount = refresh === 60 ? 5 : refresh === 144 ? 9 : 13;

  const selectLayer = (id: LayerId) => {
    setSelectedLayer(id);
    setExploded(true);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, rx: rotation.x, ry: rotation.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setRotation({
      x: Math.max(-24, Math.min(18, drag.current.rx - (event.clientY - drag.current.y) * 0.12)),
      y: drag.current.ry + (event.clientX - drag.current.x) * 0.18,
    });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onSceneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.shiftKey ? 12 : 5;
    if (event.key === "ArrowLeft") setRotation((current) => ({ ...current, y: current.y - delta }));
    else if (event.key === "ArrowRight") setRotation((current) => ({ ...current, y: current.y + delta }));
    else if (event.key === "ArrowUp") setRotation((current) => ({ ...current, x: Math.max(-24, current.x - delta) }));
    else if (event.key === "ArrowDown") setRotation((current) => ({ ...current, x: Math.min(18, current.x + delta) }));
    else return;
    event.preventDefault();
  };

  const rootStyle = {
    "--screen-ratio": ratio,
    "--screen-scale": sizeKey === "24" ? 0.86 : sizeKey === "27" ? 0.91 : sizeKey === "32" ? 0.97 : 1,
    "--pixel-step": resolutionKey === "1080p" ? "15px" : resolutionKey === "1440p" ? "10px" : "6px",
    "--rot-x": `${rotation.x}deg`,
    "--rot-y": `${rotation.y}deg`,
  } as CSSProperties;

  return (
    <main className={`site panel-${panel.toLowerCase()}${exploded ? " is-exploded" : ""}`} style={rootStyle}>
      <nav className="topbar" aria-label="Page sections">
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label="Monitor X-Ray home">
            <span className="brand-mark" aria-hidden="true">MX</span>
            <span>Monitor X-Ray</span>
          </a>
          <div className="nav-links">
            <a href="#lab">The lab</a>
            <a href="#anatomy">Layers</a>
            <a href="#signal">Signal flow</a>
          </div>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow"><span className="live-dot" /> Interactive hardware explainer</div>
        <h1>See what a monitor<br />is made of.</h1>
        <p className="hero-copy">
          Rotate it. Pull it apart. Change the specs. Then watch size, panel technology,
          resolution and refresh rate become parts of one coherent machine.
        </p>
        <a className="hero-cta" href="#lab">Open the monitor <span aria-hidden="true">↓</span></a>
      </section>

      <section className="lab-section" id="lab" aria-labelledby="lab-title">
        <div className="section-heading">
          <div>
            <span className="section-number">01</span>
            <h2 id="lab-title">The monitor lab</h2>
          </div>
          <p>Everything below updates as one system.</p>
        </div>

        <div className="lab-grid">
          <div className="stage-shell">
            <div className="stage-toolbar">
              <span className="drag-hint"><span className="crosshair" aria-hidden="true">✣</span> Drag to rotate</span>
              <div className="stage-actions">
                <button type="button" className={exploded ? "tool-button active" : "tool-button"} onClick={() => setExploded((value) => !value)} aria-pressed={exploded}>
                  {exploded ? "Assemble" : "Explode"}
                </button>
                <button type="button" className="tool-button" onClick={() => setRotation({ x: -5, y: -16 })}>Reset view</button>
              </div>
            </div>

            <div
              className="scene"
              role="application"
              aria-label={`Rotatable exploded ${panel} monitor. Use pointer drag or arrow keys to rotate.`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => { drag.current = null; }}
              onKeyDown={onSceneKeyDown}
              tabIndex={0}
            >
              <div className="assembly">
                <div className="stand" aria-hidden="true"><span /><i /></div>
                {layerOrder.map((layer) => {
                  const absent = panel === "OLED" && (layer.id === "backlight" || layer.id === "diffuser");
                  const style = {
                    "--layer-z": `${layer.depth}px`,
                    "--layer-z-deep": `${layer.depth * 1.8}px`,
                    "--layer-shift": `${layer.shift}px`,
                    "--layer-mobile-shift": `${layer.shift * 0.52}px`,
                  } as CSSProperties;
                  return (
                    <button
                      type="button"
                      key={layer.id}
                      className={`monitor-layer layer-${layer.id}${selectedLayer === layer.id ? " selected" : ""}${absent ? " absent" : ""}`}
                      style={style}
                      onClick={(event) => { event.stopPropagation(); selectLayer(layer.id); }}
                      aria-label={`${layerCopy[layer.id].name}${absent ? ", not present in OLED" : ""}`}
                    >
                      {layer.id === "pixels" && (
                        <span className="screen-image" aria-hidden="true">
                          <span className="screen-sun" />
                          <span className="screen-horizon" />
                          <span className="screen-grid" />
                        </span>
                      )}
                      {layer.id === "electronics" && <span className="circuit-board" aria-hidden="true"><i /><i /><i /><b /><b /></span>}
                      {layer.id === "backlight" && <span className="led-field" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} />)}</span>}
                      {layer.id === "diffuser" && <span className="diffuser-lines" aria-hidden="true" />}
                      {layer.id === "housing" && <span className="port-bank" aria-hidden="true"><i /><i /><i /></span>}
                      <span className="layer-tag">{absent ? "No " : ""}{layer.short}</span>
                    </button>
                  );
                })}
              </div>
              <div className="scale-readout" aria-hidden="true">
                <span>{formatNumber(calculations.widthCm)} cm wide</span>
                <i />
              </div>
            </div>

            <div className="stage-caption">
              <span>{size.label} · {size.ratio[0]}:{size.ratio[1]}</span>
              <span>{resolution.width.toLocaleString()} × {resolution.height.toLocaleString()} · {refresh} Hz</span>
            </div>
          </div>

          <aside className="control-panel" aria-label="Monitor specification controls">
            <div className="control-block">
              <div className="control-title"><span>Size</span><strong>{size.label} diagonal</strong></div>
              <div className="segmented four" role="group" aria-label="Screen size">
                {(Object.keys(sizes) as SizeKey[]).map((key) => (
                  <button type="button" key={key} className={sizeKey === key ? "selected" : ""} onClick={() => setSizeKey(key)} aria-pressed={sizeKey === key}>{sizes[key].label}</button>
                ))}
              </div>
              <p className="control-note">Diagonal size changes the physical canvas, not the number of pixels.</p>
            </div>

            <div className="control-block">
              <div className="control-title"><span>Panel</span><strong>{panel}</strong></div>
              <div className="segmented" role="group" aria-label="Panel type">
                {(["IPS", "VA", "OLED"] as PanelKey[]).map((key) => (
                  <button type="button" key={key} className={panel === key ? "selected" : ""} onClick={() => setPanel(key)} aria-pressed={panel === key}>{key}</button>
                ))}
              </div>
              <p className="control-note">{panelFacts[panel].summary}</p>
            </div>

            <div className="control-block">
              <div className="control-title"><span>Resolution</span><strong>{resolution.width.toLocaleString()} × {resolution.height.toLocaleString()}</strong></div>
              <div className="segmented" role="group" aria-label="Resolution">
                {(["1080p", "1440p", "4K"] as ResolutionKey[]).map((key) => {
                  const item = resolutionSets[sizeKey === "34uw" ? "ultrawide" : "wide"][key];
                  return <button type="button" key={key} className={resolutionKey === key ? "selected" : ""} onClick={() => setResolutionKey(key)} aria-pressed={resolutionKey === key}>{item.label}</button>;
                })}
              </div>
              <p className="control-note">More pixels at the same size means finer detail and smaller individual pixels.</p>
            </div>

            <div className="control-block last">
              <div className="control-title"><span>Refresh rate</span><strong>{refresh} times / second</strong></div>
              <div className="segmented" role="group" aria-label="Refresh rate">
                {([60, 144, 240] as RefreshKey[]).map((key) => (
                  <button type="button" key={key} className={refresh === key ? "selected" : ""} onClick={() => setRefresh(key)} aria-pressed={refresh === key}>{key} Hz</button>
                ))}
              </div>
              <div className="refresh-demo" aria-label={`${refresh} hertz motion sampling demonstration`}>
                <div className="sample-track">
                  {Array.from({ length: sampleCount }, (_, index) => <i key={index} style={{ left: `${(index / (sampleCount - 1)) * 100}%`, opacity: 0.18 + (index / sampleCount) * 0.78 }} />)}
                </div>
                <div className="frame-time"><span>Each frame gets</span><strong>{calculations.frameTime.toFixed(2)} ms</strong></div>
              </div>
            </div>
          </aside>
        </div>

        <div className="metric-strip" aria-label="Calculated monitor specifications">
          <div><span>Pixel density</span><strong>{Math.round(calculations.ppi)} PPI</strong><small>sharpness at this size</small></div>
          <div><span>Total pixels</span><strong>{calculations.megapixels.toFixed(1)}M</strong><small>updated every frame</small></div>
          <div><span>Active area</span><strong>{formatNumber(calculations.widthCm)} × {formatNumber(calculations.heightCm)} cm</strong><small>physical picture size</small></div>
          <div><span>Panel contrast</span><strong>{panelFacts[panel].contrast}</strong><small>{panelFacts[panel].response} pixel response</small></div>
        </div>
      </section>

      <section className="anatomy-section" id="anatomy" aria-labelledby="anatomy-title">
        <div className="section-heading">
          <div>
            <span className="section-number">02</span>
            <h2 id="anatomy-title">Hidden in plain sight</h2>
          </div>
          <p>Select a layer to understand its job.</p>
        </div>

        <div className="anatomy-grid">
          <div className="layer-list" role="list" aria-label="Monitor layers">
            {layerOrder.slice().reverse().map((layer, index) => {
              const absent = panel === "OLED" && (layer.id === "backlight" || layer.id === "diffuser");
              return (
                <button type="button" role="listitem" key={layer.id} className={selectedLayer === layer.id ? "layer-row active" : "layer-row"} onClick={() => selectLayer(layer.id)}>
                  <span className="layer-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className={`layer-swatch swatch-${layer.id}`} />
                  <span className="layer-row-copy"><strong>{layerCopy[layer.id].name}</strong><small>{absent ? "Removed in OLED" : layerCopy[layer.id].kicker}</small></span>
                  <span className="layer-arrow" aria-hidden="true">↗</span>
                </button>
              );
            })}
          </div>

          <article className="layer-detail" aria-live="polite">
            <span className="detail-kicker">Selected layer · {panel}</span>
            <h3>{chosenLayer.name}</h3>
            <p>{panelDescription}</p>
            <div className="detail-rule" />
            <dl>
              <div><dt>Light system</dt><dd>{panelFacts[panel].light}</dd></div>
              <div><dt>What changes</dt><dd>{panel === "OLED" ? "Brightness is controlled pixel by pixel." : `${panel} crystals regulate a shared white light source.`}</dd></div>
            </dl>
          </article>
        </div>

        <div className="truth-note">
          <span className="truth-icon" aria-hidden="true">i</span>
          <p><strong>One important distinction:</strong> IPS and VA describe how an LCD controls a backlight. OLED is a different light engine entirely — its pixels emit their own light.</p>
        </div>
      </section>

      <section className="signal-section" id="signal" aria-labelledby="signal-title">
        <div className="section-heading">
          <div>
            <span className="section-number">03</span>
            <h2 id="signal-title">From GPU to your eyes</h2>
          </div>
          <p>The whole machine, in one frame.</p>
        </div>

        <ol className="signal-flow">
          <li>
            <div className="flow-number">1</div>
            <div className="flow-visual connector"><span className="port-shape">DP</span><i /><span className="packet">0101</span></div>
            <h3>Signal arrives</h3>
            <p>DisplayPort or HDMI carries a complete frame from the GPU: the colour and brightness requested for every pixel.</p>
          </li>
          <li>
            <div className="flow-number">2</div>
            <div className="flow-visual chip"><span>T-CON</span><i /><i /><i /><i /></div>
            <h3>Pixels are addressed</h3>
            <p>The timing controller synchronises the frame and the driver circuits charge millions of subpixels, row by row.</p>
          </li>
          <li>
            <div className="flow-number">3</div>
            <div className={`flow-visual light-engine ${panel === "OLED" ? "emissive" : "transmissive"}`}><i /><i /><i /><i /><i /></div>
            <h3>Light becomes image</h3>
            <p>{panel === "OLED" ? "OLED subpixels emit the requested red, green and blue light directly." : `${panel} crystals meter white backlight through red, green and blue filters.`}</p>
          </li>
          <li>
            <div className="flow-number">4</div>
            <div className="flow-visual cadence">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}<span>{refresh} Hz</span></div>
            <h3>The frame refreshes</h3>
            <p>At {refresh} Hz, a new opportunity to show a frame arrives every {calculations.frameTime.toFixed(2)} milliseconds.</p>
          </li>
        </ol>
      </section>

      <footer>
        <div className="footer-mark">MX</div>
        <p>A monitor is not four independent specs. It is a physical size, a light engine, a pixel grid and a clock — working together.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}

"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  clampTransform,
  countryPaths,
  focusTransform,
  graticulePath,
  MAP_HEIGHT,
  MAP_WIDTH,
  nationLabels,
  project,
  spherePath,
  unproject,
  zoomAt,
  type MapTransform,
} from "@/lib/geography";
import { displayName, homeCount, type Pin } from "@/lib/pins";

type DraftPoint = { lat: number; lng: number };

type WorldMapProps = {
  pins: Pin[];
  selectedId: string | null;
  draft: DraftPoint | null;
  focusToken: number;
  focusPoint: DraftPoint | null;
  onPick: (point: DraftPoint) => void;
  onSelect: (id: string) => void;
};

type FittedView = {
  left: number;
  top: number;
  scale: number;
};

function fittedView(rect: DOMRect): FittedView {
  const scale = Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT);
  const width = MAP_WIDTH * scale;
  const height = MAP_HEIGHT * scale;
  return {
    scale,
    left: rect.left + (rect.width - width) / 2,
    top: rect.top + (rect.height - height) / 2,
  };
}

export function WorldMap({
  pins,
  selectedId,
  draft,
  focusToken,
  focusPoint,
  onPick,
  onSelect,
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const transformRef = useRef<MapTransform>({ x: 0, y: 0, k: 1 });
  const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, k: 1 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  function commit(next: MapTransform) {
    const clamped = clampTransform(next);
    transformRef.current = clamped;
    setTransform(clamped);
  }

  useEffect(() => {
    if (!focusPoint || focusToken === 0) return;
    const next = focusTransform(
      focusPoint.lat,
      focusPoint.lng,
      transformRef.current,
    );
    transformRef.current = next;
    setTransform(next);
  }, [focusPoint, focusToken]);

  function viewPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const fitted = fittedView(svg.getBoundingClientRect());
    if (fitted.scale === 0) return null;
    return {
      px: (clientX - fitted.left) / fitted.scale,
      py: (clientY - fitted.top) / fitted.scale,
      scale: fitted.scale,
    };
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const target = event.target as Element | null;
    if (target?.closest("[data-pin]")) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transformRef.current.x,
      originY: transformRef.current.y,
      moved: false,
    };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const threshold = event.pointerType === "touch" ? 10 : 4;
    if (transformRef.current.k > 1 && Math.hypot(dx, dy) > threshold) {
      drag.moved = true;
    }
    if (transformRef.current.k <= 1) return;
    const point = viewPoint(event.clientX, event.clientY);
    const origin = viewPoint(drag.startX, drag.startY);
    if (!point || !origin) return;
    commit({
      k: transformRef.current.k,
      x: drag.originX + (point.px - origin.px),
      y: drag.originY + (point.py - origin.py),
    });
  }

  function finishPointer(event: PointerEvent<SVGSVGElement>, place: boolean) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (!place || drag.moved) return;

    const point = viewPoint(event.clientX, event.clientY);
    if (!point) return;
    const current = transformRef.current;
    const worldX = (point.px - current.x) / current.k;
    const worldY = (point.py - current.y) / current.k;
    const location = unproject(worldX, worldY);
    if (location) onPick(location);
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = svg?.getBoundingClientRect();
      if (!rect || !svg) return;
      const fitted = fittedView(rect);
      if (fitted.scale === 0) return;
      const px = (event.clientX - fitted.left) / fitted.scale;
      const py = (event.clientY - fitted.top) / fitted.scale;
      const factor = event.deltaY < 0 ? 1.16 : 1 / 1.16;
      const next = zoomAt(transformRef.current, px, py, factor);
      transformRef.current = next;
      setTransform(next);
    }

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  function zoomBy(factor: number) {
    const next = zoomAt(transformRef.current, MAP_WIDTH / 2, MAP_HEIGHT / 2, factor);
    transformRef.current = next;
    setTransform(next);
  }

  const draftPoint = draft ? project(draft.lng, draft.lat) : null;

  return (
    <div className="relative h-full min-h-[240px] bg-[#141a17]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className={`atlas-svg ${dragging ? "is-dragging" : ""}`}
        role="application"
        aria-label={`World map with ${homeCount(pins.length).toLowerCase()}. Click to mark where you live. Drag to move the map.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finishPointer(event, true)}
        onPointerCancel={(event) => finishPointer(event, false)}
      >
        <defs>
          <radialGradient id="ocean-fill" cx="50%" cy="46%" r="62%">
            <stop offset="0%" stopColor="#355864" />
            <stop offset="58%" stopColor="#243b44" />
            <stop offset="100%" stopColor="#17262c" />
          </radialGradient>
        </defs>
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <path d={spherePath} fill="url(#ocean-fill)" />
          <path d={graticulePath} className="graticule" />
          {countryPaths.map((country) => (
            <path key={country.id} d={country.d} className="land" />
          ))}
          <path d={spherePath} className="sphere-edge" />
          <g className="nation-labels" aria-hidden="true">
            {nationLabels.map((label) => {
              if (transform.k < label.minZoom) return null;
              const firstOffset = label.lines.length === 1 ? "0" : "-0.55em";
              return (
                <g
                  key={label.id}
                  transform={`translate(${label.x} ${label.y}) scale(${1 / transform.k})`}
                >
                  <text
                    className="nation-label"
                    fontSize={label.size}
                    textAnchor="middle"
                    dominantBaseline={label.rotate ? "central" : undefined}
                    transform={label.rotate ? `rotate(${label.rotate})` : undefined}
                  >
                    {label.lines.map((line, index) => (
                      <tspan
                        key={line}
                        x="0"
                        dy={index === 0 ? firstOffset : "1.15em"}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
          {pins.map((pin) => {
            const point = project(pin.lng, pin.lat);
            if (!point) return null;
            const selected = pin.id === selectedId;
            return (
              <g
                key={pin.id}
                data-pin=""
                className="pin"
                role="button"
                tabIndex={0}
                aria-label={`${displayName(pin)} in ${pin.place}`}
                aria-pressed={selected}
                transform={`translate(${point[0]} ${point[1]}) scale(${1 / transform.k})`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(pin.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onSelect(pin.id);
                }}
              >
                <circle r={16} fill="transparent" />
                {selected ? (
                  <circle r={12} fill="none" stroke="#f3eee6" strokeWidth={1.2} />
                ) : null}
                <circle
                  className="pin-core"
                  r={6.5}
                  fill={selected ? "#f6d7a8" : "#e39a4d"}
                  stroke="#1a120c"
                  strokeWidth={1.4}
                />
              </g>
            );
          })}
          {draft && draftPoint ? (
            <g
              transform={`translate(${draftPoint[0]} ${draftPoint[1]}) scale(${1 / transform.k})`}
              pointerEvents="none"
            >
              <circle className="draft-pulse" r={16} fill="#f3eee6" />
              <circle r={7} fill="none" stroke="#f3eee6" strokeWidth={1.6} />
              <circle r={2.5} fill="#f3eee6" />
            </g>
          ) : null}
        </g>
      </svg>

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Zoom in"
          onClick={() => zoomBy(1.35)}
        >
          <Plus />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Zoom out"
          onClick={() => zoomBy(1 / 1.35)}
        >
          <Minus />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Show the whole world"
          onClick={() => commit({ x: 0, y: 0, k: 1 })}
        >
          <RotateCcw />
        </Button>
      </div>

      {!draft ? (
        <p className="pointer-events-none absolute inset-x-3 bottom-3 text-center">
          <span className="inline-block rounded-full border border-border bg-[#101412]/80 px-3 py-1 text-xs text-foreground/90 backdrop-blur-sm">
            Click the map to mark where you live. Drag to move it.
          </span>
        </p>
      ) : null}
    </div>
  );
}

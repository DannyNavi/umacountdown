import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";

import { nationSpecs } from "@/lib/nations";

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 520;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

type WorldAtlas = Topology<{
  countries: GeometryCollection;
}>;

export type MapTransform = {
  x: number;
  y: number;
  k: number;
};

const projection = geoNaturalEarth1().fitExtent(
  [
    [16, 16],
    [MAP_WIDTH - 16, MAP_HEIGHT - 16],
  ],
  { type: "Sphere" },
);

const path = geoPath(projection);
const topology = world as unknown as WorldAtlas;
const countries = feature(topology, topology.objects.countries);

export const countryPaths = countries.features.flatMap((shape, index) => {
  const d = path(shape);
  if (!d) return [];
  return [{ id: String(shape.id ?? index), d }];
});

export const spherePath = path({ type: "Sphere" }) ?? "";
export const graticulePath = path(geoGraticule10()) ?? "";

export type NationLabel = {
  id: string;
  lines: string[];
  minZoom: number;
  size: number;
  rotate: number;
  x: number;
  y: number;
};

const countryById = new Map(
  countries.features.map((shape) => [String(shape.id).padStart(3, "0"), shape]),
);

export const nationLabels: NationLabel[] = nationSpecs.flatMap((spec) => {
  if (!countryById.has(spec.id)) return [];
  const point = project(spec.anchor[0], spec.anchor[1]);
  if (!point) return [];
  return [
    {
      id: spec.id,
      lines: spec.lines,
      minZoom: spec.minZoom,
      size: spec.size,
      rotate: spec.rotate,
      x: point[0],
      y: point[1],
    },
  ];
});

export function project(lng: number, lat: number): [number, number] | null {
  const point = projection([lng, lat]);
  if (!point) return null;
  const [x, y] = point;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

export function unproject(
  x: number,
  y: number,
): { lat: number; lng: number } | null {
  const value = projection.invert?.([x, y]);
  if (!value) return null;
  const [lng, lat] = value;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const back = projection([lng, lat]);
  if (!back) return null;
  const dx = back[0] - x;
  const dy = back[1] - y;
  if (dx * dx + dy * dy > 36) return null;
  return { lat, lng };
}

export function clampTransform(transform: MapTransform): MapTransform {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.k));
  if (k <= 1) return { x: 0, y: 0, k: 1 };

  const minX = MAP_WIDTH * 0.22 - k * MAP_WIDTH;
  const maxX = MAP_WIDTH * 0.78;
  const minY = MAP_HEIGHT * 0.22 - k * MAP_HEIGHT;
  const maxY = MAP_HEIGHT * 0.78;

  return {
    k,
    x: Math.min(maxX, Math.max(minX, transform.x)),
    y: Math.min(maxY, Math.max(minY, transform.y)),
  };
}

export function zoomAt(
  current: MapTransform,
  px: number,
  py: number,
  factor: number,
): MapTransform {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor));
  const worldX = (px - current.x) / current.k;
  const worldY = (py - current.y) / current.k;
  return clampTransform({
    k,
    x: px - k * worldX,
    y: py - k * worldY,
  });
}

export function focusTransform(lat: number, lng: number, current: MapTransform): MapTransform {
  const point = project(lng, lat);
  if (!point) return current;
  const k = Math.max(current.k, 4.2);
  return clampTransform({
    k,
    x: MAP_WIDTH / 2 - k * point[0],
    y: MAP_HEIGHT / 2 - k * point[1],
  });
}

"use client";

import { useEffect, useRef, useState } from "react";
import type * as MapLibre from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre v6 fetches its tile-decode worker relative to its own chunk URL, which
// bundlers do not emit. `?url` ships the file through the bundler so the URL is
// version-locked to the installed maplibre-gl.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

export type GeoMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
  color?: string;
  onClick?: () => void;
};
export type GeoCircle = {
  id: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  color?: string;
};
export type GeoPoint = { latitude: number; longitude: number };

type Props = {
  markers?: GeoMarker[];
  circles?: GeoCircle[];
  /** Draggable pin; click on map / drag emits coordinates through onPinChange. */
  pin?: GeoPoint | null;
  onPinChange?: (point: GeoPoint) => void;
  className?: string;
};

const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
const PMTILES_URL = process.env.NEXT_PUBLIC_MAP_PMTILES_URL;
const ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors (ODbL)</a> · <a href="https://protomaps.com" target="_blank" rel="noreferrer">Protomaps</a>';
const INDONESIA: [number, number] = [113, -2];
let protocolReady = false;

// Flat-earth ring: accurate enough for radii of a few km.
const ring = ({ longitude, latitude, radiusM }: GeoCircle) => {
  const dLat = radiusM / 111_320;
  const dLon = dLat / Math.cos((latitude * Math.PI) / 180);
  const points = Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * 2 * Math.PI;
    return [longitude + dLon * Math.cos(angle), latitude + dLat * Math.sin(angle)];
  });
  return [points];
};

export default function GeoMap({ markers = [], circles = [], pin = null, onPinChange, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<typeof MapLibre | null>(null);
  const pinMarker = useRef<Marker | null>(null);
  const pinChange = useRef(onPinChange);
  const [ready, setReady] = useState(false);
  const configured = Boolean(STYLE_URL && PMTILES_URL);

  useEffect(() => {
    pinChange.current = onPinChange;
  }, [onPinChange]);

  useEffect(() => {
    if (!configured || !box.current) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    (async () => {
      const [lib, { Protocol }, style] = await Promise.all([
        import("maplibre-gl"),
        import("pmtiles"),
        fetch(STYLE_URL!).then((response) => response.json()),
      ]);
      if (cancelled || !box.current) return;
      if (!protocolReady) {
        lib.setWorkerUrl(maplibreWorkerUrl);
        lib.addProtocol("pmtiles", new Protocol().tile);
        protocolReady = true;
      }
      // The PMTiles archive comes from env only; style.json supplies layers, glyphs and sprites.
      for (const source of Object.values<{ type: string; url?: string; tiles?: string[] }>(style.sources)) {
        if (source.type !== "vector") continue;
        source.url = `pmtiles://${PMTILES_URL}`;
        delete source.tiles;
      }
      libRef.current = lib;
      map = new lib.Map({
        container: box.current,
        style,
        center: INDONESIA,
        zoom: 3.5,
        attributionControl: { compact: false, customAttribution: ATTRIBUTION },
      });
      map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      map.on("click", (event) => pinChange.current?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }));
      map.on("load", () => {
        map!.addSource("geo-circles", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map!.addLayer({ id: "geo-circles-fill", type: "fill", source: "geo-circles", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.15 } });
        map!.addLayer({ id: "geo-circles-line", type: "line", source: "geo-circles", paint: { "line-color": ["get", "color"], "line-width": 2 } });
        mapRef.current = map;
        setReady(true);
      });
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      pinMarker.current = null;
      setReady(false);
    };
  }, [configured]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    const added = markers.map((item) => {
      const marker = new lib.Marker({ color: item.color ?? "#159de8" }).setLngLat([item.longitude, item.latitude]);
      if (item.label) marker.setPopup(new lib.Popup({ offset: 24 }).setText(item.label));
      if (item.onClick) marker.getElement().addEventListener("click", item.onClick);
      return marker.addTo(map);
    });
    return () => added.forEach((marker) => marker.remove());
  }, [ready, markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("geo-circles") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: circles.map((item) => ({
        type: "Feature",
        properties: { color: item.color ?? "#e8504a" },
        geometry: { type: "Polygon", coordinates: ring(item) },
      })),
    });
  }, [ready, circles]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    if (!pin) {
      pinMarker.current?.remove();
      pinMarker.current = null;
      return;
    }
    if (!pinMarker.current) {
      const marker = new lib.Marker({ color: "#21aa90", draggable: Boolean(pinChange.current) });
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        pinChange.current?.({ latitude: lat, longitude: lng });
      });
      pinMarker.current = marker.setLngLat([pin.longitude, pin.latitude]).addTo(map);
    } else {
      pinMarker.current.setLngLat([pin.longitude, pin.latitude]);
    }
    if (!map.getBounds().contains([pin.longitude, pin.latitude]) || map.getZoom() < 10) {
      map.easeTo({ center: [pin.longitude, pin.latitude], zoom: Math.max(map.getZoom(), 15) });
    }
  }, [ready, pin]);

  // Frame the overlays whenever their set changes.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib || pin) return;
    const points = [...markers, ...circles];
    if (!points.length) return;
    const bounds = new lib.LngLatBounds();
    points.forEach((item) => bounds.extend([item.longitude, item.latitude]));
    map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, markers, circles]);

  if (!configured) return <div className={`geo-map geo-map-off ${className ?? ""}`}>Peta belum dikonfigurasi.</div>;
  return <div ref={box} className={`geo-map ${className ?? ""}`} />;
}

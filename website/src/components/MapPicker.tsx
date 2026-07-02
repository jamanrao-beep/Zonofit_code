"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

function LocationMarker({ lat, lng, onChange }: MapPickerProps) {
  const [position, setPosition] = useState({ lat, lng });

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return position.lat !== 0 ? (
    <Marker position={position}></Marker>
  ) : null;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  // Center on Mumbai by default
  const defaultCenter = { lat: 19.0760, lng: 72.8777 };
  const centerLat = lat || defaultCenter.lat;
  const centerLng = lng || defaultCenter.lng;

  return (
    <div style={{ height: "300px", width: "100%", borderRadius: "12px", overflow: "hidden", zIndex: 10 }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker lat={lat} lng={lng} onChange={onChange} />
      </MapContainer>
    </div>
  );
}

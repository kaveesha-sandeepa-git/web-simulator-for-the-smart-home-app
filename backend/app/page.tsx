"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { useRouter } from "next/navigation";
import { getFirebaseApp } from "./firebase";

type DeviceStatus = "ON" | "OFF" | "ERROR" | "DISCONNECTED";
type DeviceKind = "Outlet" | "Multi-switch" | "Lighting" | "Safety" | "Camera";

type Device = {
  id: string;
  name: string;
  kind: DeviceKind;
  room: string;
  floor: number;
  status: DeviceStatus;
  active: boolean;
  value: string;
  powerWatts: number;
  maxOnMinutes?: number;
  remainingMinutes?: number;
  cameraSnapshot?: string;
  cameraStream?: string;
  switches?: { id: string; label: string; active: boolean }[];
};

type FloorPlan = {
  id: string;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  accent: string;
  imageUrl?: string;
  devices: Device[];
};

type RealtimeDevice = Partial<Device> & {
  deviceName?: string;
  device_name?: string;
  type?: string;
  deviceType?: string;
  device_type?: string;
  title?: string;
  label?: string;
  roomName?: string;
  room_name?: string;
  location?: string;
  floorId?: string | number;
  floor_id?: string | number;
  floorName?: string;
  floor_name?: string;
  floorLevel?: number;
  floorIndex?: number;
  isOn?: boolean | string | number;
  is_on?: boolean | string | number;
  on?: boolean | string | number;
  state?: boolean | string | number;
  deviceState?: boolean | string | number;
  device_state?: boolean | string | number;
  powerState?: boolean | string | number;
  power?: number;
  wattage?: number;
  currentPower?: number;
  snapshot?: string;
  streamUrl?: string;
  feedUrl?: string;
  switchStates?: Record<string, boolean>;
  switches?: Array<{ id?: string; label?: string; active?: boolean }>;
};

type RealtimeFloor = Partial<FloorPlan> & {
  title?: string;
  floorName?: string;
  roomCount?: number;
  image?: string;
  imageURL?: string;
  floorImage?: string;
  floorImageUrl?: string;
  floor_image?: string;
  floor_image_url?: string;
  mapImage?: string;
  mapUrl?: string;
  planUrl?: string;
  devices?: Record<string, RealtimeDevice> | RealtimeDevice[];
};

type RealtimeHouseState = {
  floors?: RealtimeFloor[] | Record<string, RealtimeFloor>;
  devices?: Record<string, RealtimeDevice>;
  groundFloor?: RealtimeFloor;
  upperFloor?: RealtimeFloor;
  firstFloor?: RealtimeFloor;
  secondFloor?: RealtimeFloor;
  alert?: string;
  status?: string;
  updatedAt?: string;
};

type FirebaseRecord = Record<string, unknown>;

const fallbackFloors: FloorPlan[] = [
  {
    id: "ground-floor",
    name: "Ground Floor",
    subtitle: "Living room, kitchen, front entrance",
    width: 14,
    height: 9,
    accent: "#ffb703",
    devices: [
      {
        id: "living-light",
        name: "Living Room Light",
        kind: "Lighting",
        room: "Living Room",
        floor: 0,
        status: "OFF",
        active: false,
        value: "Waiting for Android sync",
        powerWatts: 24,
      },
      {
        id: "living-outlet",
        name: "TV Outlet",
        kind: "Outlet",
        room: "Living Room",
        floor: 0,
        status: "ON",
        active: true,
        value: "Standby load 68W",
        powerWatts: 68,
      },
      { id: "living-lamp-plug", name: "Floor Lamp Plug", kind: "Outlet", room: "Living Room", floor: 0, status: "OFF", active: false, value: "West wall outlet", powerWatts: 0 },
      { id: "living-wall-light", name: "Living Wall Light", kind: "Lighting", room: "Living Room", floor: 0, status: "ON", active: true, value: "Warm wall light", powerWatts: 12 },
      { id: "kitchen-light", name: "Kitchen Main Light", kind: "Lighting", room: "Kitchen", floor: 0, status: "ON", active: true, value: "Ceiling light", powerWatts: 28 },
      { id: "fridge-outlet", name: "Refrigerator Plug", kind: "Outlet", room: "Kitchen", floor: 0, status: "ON", active: true, value: "Dedicated refrigerator circuit", powerWatts: 140 },
      { id: "microwave-outlet", name: "Microwave Plug", kind: "Outlet", room: "Kitchen", floor: 0, status: "OFF", active: false, value: "Counter appliance outlet", powerWatts: 0 },
      { id: "kettle-outlet", name: "Kettle Plug", kind: "Outlet", room: "Kitchen", floor: 0, status: "ON", active: true, value: "Counter outlet", powerWatts: 1200 },
      {
        id: "iron-station",
        name: "Iron Station",
        kind: "Safety",
        room: "Kitchen",
        floor: 0,
        status: "OFF",
        active: false,
        value: "Max 15 min safety slot",
        powerWatts: 900,
        maxOnMinutes: 15,
        remainingMinutes: 11,
      },
      {
        id: "entrance-camera",
        name: "Entrance Camera",
        kind: "Camera",
        room: "Front Door",
        floor: 0,
        status: "ON",
        active: true,
        value: "Mock live snapshot",
        powerWatts: 6,
        cameraSnapshot:
          "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
        cameraStream: "Mock RTSP://ground/entrance",
      },
      { id: "porch-wall-left", name: "Left Porch Light", kind: "Lighting", room: "Front Door", floor: 0, status: "ON", active: true, value: "Exterior wall light", powerWatts: 10 },
      { id: "porch-wall-right", name: "Right Porch Light", kind: "Lighting", room: "Front Door", floor: 0, status: "OFF", active: false, value: "Exterior wall light", powerWatts: 0 },
    ],
  },
  {
    id: "upper-floor",
    name: "Upper Floor",
    subtitle: "Bedrooms, study, corridor",
    width: 14,
    height: 9,
    accent: "#00d4ff",
    devices: [
      {
        id: "bedroom-outlet",
        name: "Bedroom Outlet",
        kind: "Outlet",
        room: "Master Bedroom",
        floor: 1,
        status: "OFF",
        active: false,
        value: "Idle power cut",
        powerWatts: 0,
      },
      { id: "bedroom-light", name: "Bedroom Main Light", kind: "Lighting", room: "Master Bedroom", floor: 1, status: "ON", active: true, value: "Ceiling light", powerWatts: 24 },
      { id: "bedside-left-outlet", name: "Left Bedside Plug", kind: "Outlet", room: "Master Bedroom", floor: 1, status: "ON", active: true, value: "Phone charger", powerWatts: 18 },
      { id: "bedside-right-outlet", name: "Right Bedside Plug", kind: "Outlet", room: "Master Bedroom", floor: 1, status: "OFF", active: false, value: "Bedside outlet", powerWatts: 0 },
      {
        id: "study-gang",
        name: "Study Gang Box",
        kind: "Multi-switch",
        room: "Study",
        floor: 1,
        status: "ON",
        active: true,
        value: "3/5 switches active",
        powerWatts: 42,
        switches: [
          { id: "study-fan", label: "Fan", active: true },
          { id: "study-light", label: "Desk Light", active: true },
          { id: "study-plug", label: "Spare Socket", active: false },
          { id: "study-led", label: "Accent LED", active: true },
          { id: "study-printer", label: "Printer", active: false },
        ],
      },
      { id: "study-main-light", name: "Study Main Light", kind: "Lighting", room: "Study", floor: 1, status: "OFF", active: false, value: "Ceiling light", powerWatts: 0 },
      { id: "study-computer-outlet", name: "Computer Plug", kind: "Outlet", room: "Study", floor: 1, status: "ON", active: true, value: "Desktop workstation", powerWatts: 220 },
      { id: "study-printer-outlet", name: "Printer Plug", kind: "Outlet", room: "Study", floor: 1, status: "OFF", active: false, value: "Printer wall outlet", powerWatts: 0 },
      { id: "hall-light-west", name: "Hall Light West", kind: "Lighting", room: "Hallway", floor: 1, status: "ON", active: true, value: "West corridor light", powerWatts: 9 },
      { id: "hall-light-center", name: "Hall Light Center", kind: "Lighting", room: "Hallway", floor: 1, status: "OFF", active: false, value: "Center corridor light", powerWatts: 0 },
      { id: "hall-light-east", name: "Hall Light East", kind: "Lighting", room: "Hallway", floor: 1, status: "ON", active: true, value: "East corridor light", powerWatts: 9 },
      {
        id: "hall-camera",
        name: "Corridor Camera",
        kind: "Camera",
        room: "Hallway",
        floor: 1,
        status: "ON",
        active: true,
        value: "Night vision standby",
        powerWatts: 7,
        cameraSnapshot:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
        cameraStream: "Mock RTSP://upper/hallway",
      },
    ],
  },
];

const emptyFallbackFloors: FloorPlan[] = fallbackFloors.map((floor) => ({
  ...floor,
  devices: [],
}));

function toneForStatus(status: DeviceStatus) {
  switch (status) {
    case "ON":
      return "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-400/30";
    case "OFF":
      return "bg-zinc-500/15 text-zinc-100 ring-1 ring-zinc-400/20";
    case "ERROR":
      return "bg-rose-400/15 text-rose-100 ring-1 ring-rose-400/30";
    default:
      return "bg-amber-400/15 text-amber-100 ring-1 ring-amber-400/30";
  }
}

function toneForKind(kind: DeviceKind) {
  switch (kind) {
    case "Camera":
      return "border-cyan-300/40 bg-cyan-300/10 text-cyan-100";
    case "Safety":
      return "border-orange-300/40 bg-orange-300/10 text-orange-100";
    case "Multi-switch":
      return "border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-100";
    case "Lighting":
      return "border-yellow-300/40 bg-yellow-300/10 text-yellow-100";
    default:
      return "border-white/15 bg-white/6 text-white/80";
  }
}

function statusFromValue(value: unknown): DeviceStatus {
  if (value === "ON" || value === "OFF" || value === "ERROR" || value === "DISCONNECTED") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "ON" : "OFF";
  }

  if (typeof value === "number") {
    return value > 0 ? "ON" : "OFF";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "1" || normalized === "true" || normalized === "on" || normalized === "active") {
      return "ON";
    }

    if (normalized === "0" || normalized === "false" || normalized === "off" || normalized === "inactive") {
      return "OFF";
    }
  }

  return "DISCONNECTED";
}

function deviceKindFromValue(value: unknown): DeviceKind {
  if (typeof value !== "string") {
    return "Outlet";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.includes("camera")) {
    return "Camera";
  }

  if (normalized.includes("light") || normalized.includes("lamp")) {
    return "Lighting";
  }

  if (normalized.includes("multi") || normalized.includes("gang") || normalized.includes("switch")) {
    return "Multi-switch";
  }

  if (normalized.includes("safety") || normalized.includes("alarm") || normalized.includes("smoke") || normalized.includes("sensor")) {
    return "Safety";
  }

  return "Outlet";
}

function switchIsActive(value: unknown) {
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return statusFromValue(item.active ?? item.status ?? item.state ?? item.isOn ?? item.on) === "ON";
  }

  return statusFromValue(value) === "ON";
}

function normalizeSwitches(deviceId: string, rawDevice: RealtimeDevice): Device["switches"] {
  if (Array.isArray(rawDevice.switches) && rawDevice.switches.length > 0) {
    return rawDevice.switches
      .filter(Boolean)
      .map((item, index) => ({
        id: item.id ?? `${deviceId}-switch-${index}`,
        label: item.label ?? `Switch ${index + 1}`,
        active: switchIsActive(item.active ?? (item as { state?: unknown }).state),
      }));
  }

  if (rawDevice.switchStates && typeof rawDevice.switchStates === "object") {
    return Object.entries(rawDevice.switchStates).map(([id, active]) => ({
      id,
      label: id.replace(/[-_]/g, " "),
      active: switchIsActive(active),
    }));
  }

  if (rawDevice.switches && typeof rawDevice.switches === "object") {
    return Object.entries(rawDevice.switches).map(([id, value]) => {
      const item = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
      return {
        id: String(item?.id ?? id),
        label: String(item?.label ?? item?.name ?? id.replace(/[-_]/g, " ")),
        active: switchIsActive(value),
      };
    });
  }

  return undefined;
}

function normalizeDevice(floorIndex: number, deviceId: string, rawDevice: RealtimeDevice): Device {
  const kind = rawDevice.kind ?? deviceKindFromValue(rawDevice.type ?? rawDevice.deviceType ?? rawDevice.device_type ?? rawDevice.name ?? rawDevice.deviceName ?? rawDevice.label);
  const status = statusFromValue(rawDevice.status ?? rawDevice.state ?? rawDevice.deviceState ?? rawDevice.device_state ?? rawDevice.powerState ?? rawDevice.isOn ?? rawDevice.is_on ?? rawDevice.on ?? rawDevice.active);
  const active = typeof rawDevice.active === "boolean" ? rawDevice.active : status === "ON";
  const room = rawDevice.room ?? rawDevice.roomName ?? rawDevice.room_name ?? rawDevice.location ?? "Unassigned";
  const floor =
    typeof rawDevice.floor === "number"
      ? rawDevice.floor
      : typeof rawDevice.floorLevel === "number"
        ? rawDevice.floorLevel
        : typeof rawDevice.floorIndex === "number"
          ? rawDevice.floorIndex
          : floorIndex;
  const powerWatts =
    typeof rawDevice.powerWatts === "number"
      ? rawDevice.powerWatts
      : typeof rawDevice.power === "number"
        ? rawDevice.power
        : typeof rawDevice.wattage === "number"
          ? rawDevice.wattage
          : typeof rawDevice.currentPower === "number"
            ? rawDevice.currentPower
          : active
            ? 1
            : 0;

  return {
    id: rawDevice.id ?? deviceId,
    name: rawDevice.name ?? rawDevice.deviceName ?? rawDevice.device_name ?? rawDevice.title ?? rawDevice.label ?? deviceId.replace(/[-_]/g, " "),
    kind,
    room,
    floor,
    status,
    active,
    value: rawDevice.value ?? (active ? "Active" : "Inactive"),
    powerWatts,
    maxOnMinutes: rawDevice.maxOnMinutes,
    remainingMinutes: rawDevice.remainingMinutes,
    cameraSnapshot: rawDevice.cameraSnapshot ?? rawDevice.snapshot,
    cameraStream: rawDevice.cameraStream ?? rawDevice.streamUrl ?? rawDevice.feedUrl,
    switches: normalizeSwitches(deviceId, rawDevice),
  };
}

function normalizeFloor(rawFloor: RealtimeFloor | null, index: number): FloorPlan | null {
  if (!rawFloor || typeof rawFloor !== "object") {
    return null;
  }

  const rawDevices = Array.isArray(rawFloor.devices)
    ? rawFloor.devices
    : rawFloor.devices && typeof rawFloor.devices === "object"
      ? Object.entries(rawFloor.devices).map(([deviceId, value]) => ({
          ...(value as RealtimeDevice),
          id: (value as RealtimeDevice).id ?? deviceId,
        }))
      : [];

  return {
    id: rawFloor.id ?? `floor-${index}`,
    name: rawFloor.name ?? rawFloor.title ?? rawFloor.floorName ?? `Floor ${index + 1}`,
    subtitle: rawFloor.subtitle ?? "Live synced floor view",
    width: typeof rawFloor.width === "number" ? rawFloor.width : 14,
    height: typeof rawFloor.height === "number" ? rawFloor.height : 9,
    accent: rawFloor.accent ?? (index % 2 === 0 ? "#ffb703" : "#00d4ff"),
    imageUrl:
      rawFloor.imageUrl ?? rawFloor.imageURL ?? rawFloor.floorImageUrl ?? rawFloor.floor_image_url ??
      rawFloor.floorImage ?? rawFloor.floor_image ?? rawFloor.mapImage ?? rawFloor.mapUrl ?? rawFloor.planUrl ?? rawFloor.image,
    devices: rawDevices.map((deviceValue, deviceIndex) =>
      normalizeDevice(index, deviceValue.id ?? `device-${index}-${deviceIndex}`, deviceValue),
    ),
  };
}

function normalizedFloorReference(rawDevice: RealtimeDevice) {
  const reference =
    rawDevice.floorId ??
    rawDevice.floor_id ??
    rawDevice.floorName ??
    rawDevice.floor_name ??
    rawDevice.floorLevel ??
    rawDevice.floorIndex ??
    rawDevice.floor;

  return reference === undefined || reference === null ? "" : String(reference).trim().toLowerCase();
}

function floorMatchesReference(floor: FloorPlan, index: number, reference: string) {
  if (!reference) return index === 0;

  const normalizedId = floor.id.trim().toLowerCase();
  const normalizedName = floor.name.trim().toLowerCase();
  const aliases = new Set([
    normalizedId,
    normalizedName,
    normalizedId.replace(/[\s_-]/g, ""),
    normalizedName.replace(/[\s_-]/g, ""),
    String(index),
  ]);

  if (index === 0) {
    aliases.add("ground");
    aliases.add("groundfloor");
  }
  if (index === 1) {
    aliases.add("upper");
    aliases.add("upperfloor");
    aliases.add("first");
    aliases.add("firstfloor");
  }

  return aliases.has(reference) || aliases.has(reference.replace(/[\s_-]/g, ""));
}

function mergeDevicesIntoFloors(floors: FloorPlan[], devices: Record<string, RealtimeDevice>) {
  const mergedFloors = floors.map((floor) => ({ ...floor, devices: [...floor.devices] }));

  Object.entries(devices).forEach(([deviceId, rawDevice]) => {
    const reference = normalizedFloorReference(rawDevice);
    const floorIndex = Math.max(0, mergedFloors.findIndex((floor, index) => floorMatchesReference(floor, index, reference)));
    const device = normalizeDevice(floorIndex, deviceId, rawDevice);
    const existingIndex = mergedFloors[floorIndex].devices.findIndex((item) => item.id === device.id);

    if (existingIndex >= 0) {
      mergedFloors[floorIndex].devices[existingIndex] = device;
    } else {
      mergedFloors[floorIndex].devices.push(device);
    }
  });

  return mergedFloors;
}

function floorsFromDevices(devices: Record<string, RealtimeDevice>) {
  const groups = new Map<string, Array<[string, RealtimeDevice]>>();

  Object.entries(devices).forEach((entry) => {
    const reference = normalizedFloorReference(entry[1]) || "ground-floor";
    const group = groups.get(reference) ?? [];
    group.push(entry);
    groups.set(reference, group);
  });

  return Array.from(groups.entries()).map(([reference, entries], index) => {
    const compactReference = reference.replace(/[\s_-]/g, "");
    const name =
      compactReference === "0" || compactReference === "ground" || compactReference === "groundfloor"
        ? "Ground Floor"
        : compactReference === "1" || compactReference === "first" || compactReference === "firstfloor" || compactReference === "upper" || compactReference === "upperfloor"
          ? "Upper Floor"
          : reference.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

    return {
      id: reference.replace(/\s+/g, "-") || `floor-${index}`,
      name,
      subtitle: "Live devices from Firebase",
      width: 14,
      height: 9,
      accent: index % 2 === 0 ? "#ffb703" : "#00d4ff",
      devices: entries.map(([deviceId, rawDevice]) => normalizeDevice(index, deviceId, rawDevice)),
    };
  });
}

function floorsFromState(state: RealtimeHouseState): FloorPlan[] {
  if (Array.isArray(state.floors)) {
    const parsed = state.floors.map((floorItem, index) => normalizeFloor(floorItem, index)).filter(Boolean) as FloorPlan[];
    if (parsed.length > 0) {
      return state.devices ? mergeDevicesIntoFloors(parsed, state.devices) : parsed;
    }
  }

  if (state.floors && !Array.isArray(state.floors)) {
    const parsed = Object.entries(state.floors)
      .map(([key, floorItem], index) => normalizeFloor({ id: key, ...floorItem }, index))
      .filter(Boolean) as FloorPlan[];
    if (parsed.length > 0) {
      return state.devices ? mergeDevicesIntoFloors(parsed, state.devices) : parsed;
    }
  }

  const namedFloors = [state.groundFloor, state.upperFloor, state.firstFloor, state.secondFloor]
    .map((floorItem, index) => normalizeFloor(floorItem ? { ...floorItem, id: floorItem.id ?? `floor-${index}` } : null, index))
    .filter(Boolean) as FloorPlan[];

  if (namedFloors.length > 0) {
    return state.devices ? mergeDevicesIntoFloors(namedFloors, state.devices) : namedFloors;
  }

  if (state.devices && typeof state.devices === "object") {
    return floorsFromDevices(state.devices);
  }

  return emptyFallbackFloors;
}

function isRecord(value: unknown): value is FirebaseRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeDevice(value: unknown) {
  if (!isRecord(value)) return false;
  return ["status", "state", "deviceState", "device_state", "powerState", "active", "isOn", "is_on", "on", "name", "deviceName", "device_name", "type", "deviceType", "device_type", "powerWatts"].some(
    (key) => key in value,
  );
}

function findDeviceCollection(value: unknown, path = "", depth = 0): { devices: Record<string, RealtimeDevice>; path: string } | null {
  if (!isRecord(value) || depth > 6) return null;

  const entries = Object.entries(value);
  const deviceEntries = entries.filter(([, child]) => looksLikeDevice(child));
  if (deviceEntries.length > 0) {
    return {
      devices: Object.fromEntries(deviceEntries) as Record<string, RealtimeDevice>,
      path: path || "/",
    };
  }

  const prioritizedEntries = [...entries].sort(([left], [right]) => {
    const preferred = /^(devices?|appliances?|switches?|lights?)$/i;
    return Number(preferred.test(right)) - Number(preferred.test(left));
  });

  for (const [key, child] of prioritizedEntries) {
    const result = findDeviceCollection(child, `${path}/${key}`, depth + 1);
    if (result) return result;
  }

  return null;
}

function stateFromFirebaseRoot(rootValue: unknown, userId: string): { state: RealtimeHouseState; path: string } | null {
  if (!isRecord(rootValue)) return null;

  const userNode = isRecord(rootValue.users) && isRecord(rootValue.users[userId]) ? rootValue.users[userId] : undefined;
  const candidates: Array<{ value: unknown; path: string }> = [
    { value: rootValue.houseState, path: "/houseState" },
    { value: isRecord(userNode) ? userNode.houseState : undefined, path: `/users/${userId}/houseState` },
    { value: userNode, path: `/users/${userId}` },
    { value: rootValue.smartHome, path: "/smartHome" },
    { value: rootValue.home, path: "/home" },
    { value: rootValue.data, path: "/data" },
    { value: rootValue, path: "/" },
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate.value)) continue;
    const candidateDevices = candidate.value.devices;
    const hasDirectDevices =
      isRecord(candidateDevices) && Object.values(candidateDevices).some((device) => looksLikeDevice(device));
    if (
      "floors" in candidate.value ||
      hasDirectDevices ||
      "groundFloor" in candidate.value ||
      "upperFloor" in candidate.value ||
      "firstFloor" in candidate.value ||
      "secondFloor" in candidate.value
    ) {
      return { state: candidate.value as RealtimeHouseState, path: candidate.path };
    }

    const entries = Object.entries(candidate.value);
    if (entries.length > 0 && entries.some(([, value]) => looksLikeDevice(value))) {
      return {
        state: { devices: candidate.value as Record<string, RealtimeDevice> },
        path: candidate.path,
      };
    }
  }

  const discoveredDevices = findDeviceCollection(rootValue);
  if (discoveredDevices) {
    return {
      state: { devices: discoveredDevices.devices },
      path: discoveredDevices.path,
    };
  }

  return null;
}

function floorLightingState(floor: FloorPlan) {
  const activeLights = floor.devices.filter((device) => device.kind === "Lighting" && device.active);
  const cameraDevices = floor.devices.filter((device) => device.kind === "Camera");
  const safetyDevices = floor.devices.filter((device) => device.kind === "Safety" && device.active);

  return {
    activeLights,
    cameraDevices,
    safetyDevices,
    hasGlow: activeLights.length > 0,
  };
}

function roomGlow(floor: FloorPlan, roomName: string) {
  return floor.devices.some(
    (device) => device.room === roomName && ((device.kind === "Lighting" && device.active) || device.kind === "Camera"),
  );
}

function roomStatusText(floor: FloorPlan, roomName: string) {
  const roomDevices = floor.devices.filter((device) => device.room === roomName);
  const activeLights = roomDevices.filter((device) => device.kind === "Lighting" && device.active).length;
  const cameras = roomDevices.filter((device) => device.kind === "Camera").length;

  if (activeLights > 0) {
    return `${activeLights} light${activeLights > 1 ? "s" : ""} on`;
  }

  if (cameras > 0) {
    return `${cameras} camera${cameras > 1 ? "s" : ""} online`;
  }

  return roomDevices.length > 0 ? "Ready" : "Empty";
}

export default function Home() {
  const router = useRouter();
  const [floors, setFloors] = useState<FloorPlan[]>(emptyFallbackFloors);
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "live" | "fallback" | "error">(
    "connecting",
  );
  const [lastUpdated, setLastUpdated] = useState("Waiting for Firebase state");
  const [alert, setAlert] = useState("No live alert yet");

  useEffect(() => {
    let unsubscribeDatabase: (() => void) | undefined;
    let cancelled = false;

    const app = getFirebaseApp();
    const unsubscribeAuth = onAuthStateChanged(getAuth(app), (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const houseRef = ref(getDatabase(app));
        unsubscribeDatabase = onValue(
          houseRef,
          (snapshot) => {
            const result = stateFromFirebaseRoot(snapshot.val(), user.uid);

            if (result) {
              setFloors(floorsFromState(result.state));
              setConnectionStatus("live");
              setLastUpdated(result.state.updatedAt ?? new Date().toLocaleString());
              setAlert(result.state.alert ?? result.state.status ?? `Live data loaded from ${result.path}`);
              return;
            }

            setFloors(emptyFallbackFloors);
            setConnectionStatus("fallback");
            setLastUpdated("Firebase connected, but no supported device data was found");
            setAlert("Expected floors/devices data at the root, houseState, home, smartHome, data, or the signed-in user node");
          },
          (error) => {
            setFloors(emptyFallbackFloors);
            setConnectionStatus("error");
            setLastUpdated("Firebase listener error");
            setAlert(error.message);
          },
        );
      } catch (error) {
        if (cancelled) return;

        const firebaseError = error as { code?: string; message?: string };
        setFloors(emptyFallbackFloors);
        setConnectionStatus("error");
        setLastUpdated(`Firebase connection failed${firebaseError.code ? `: ${firebaseError.code}` : ""}`);
        setAlert(firebaseError.message ?? "Verify Firebase Authentication and Realtime Database rules");
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
      unsubscribeDatabase?.();
    };
  }, [router]);

  const metrics = useMemo(() => {
    const allDevices = floors.flatMap((floor) => floor.devices);
    const activeDevices = allDevices.filter((device) => device.active && device.status === "ON").length;
    const cameraCount = allDevices.filter((device) => device.kind === "Camera").length;
    const safetyCount = allDevices.filter((device) => device.kind === "Safety").length;
    const totalPower = allDevices.reduce((sum, device) => sum + device.powerWatts, 0);

    return { allDevices, activeDevices, cameraCount, safetyCount, totalPower };
  }, [floors]);

  const currentFloor = floors[selectedFloor] ?? floors[0];
  const lighting = floorLightingState(currentFloor);
  const litRoomCount = new Set(lighting.activeLights.map((device) => device.room)).size;
  const sceneMood = lighting.hasGlow ? (lighting.cameraDevices.length > 0 ? "Active" : "Bright") : "Calm";
  const floorActiveRatio = currentFloor.devices.length > 0 ? currentFloor.devices.filter((device) => device.active).length / currentFloor.devices.length : 0;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.18),_transparent_40%),radial-gradient(circle_at_80%_10%,_rgba(255,183,3,0.16),_transparent_30%),linear-gradient(180deg,#07111f_0%,#09131f_45%,#05070d_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 xl:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100">
                Smart Home Hardware Simulator
              </div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
                Realtime house view for the Android app and Firebase.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                This is a read-only visual simulator. When the Android app updates Firebase, this house view changes
                automatically so you can monitor lights, outlets, cameras, and safety devices.
              </p>
            </div>

            <div className="grid min-w-[280px] gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-3">
                <span>Connection</span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-200">
                  {connectionStatus === "live"
                    ? "Firebase live"
                    : connectionStatus === "fallback"
                      ? "Firebase fallback"
                      : connectionStatus === "error"
                        ? "Firebase error"
                        : "Connecting"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Last update</span>
                <span className="text-slate-400">{lastUpdated}</span>
              </div>
              {/* Hero status is intentionally hidden.
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <span className="text-amber-200">{alert}</span>
              </div>
              */}
              <button
                type="button"
                onClick={() => void signOut(getAuth(getFirebaseApp()))}
                className="mt-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </section>

        <section className="order-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Visible devices", value: metrics.allDevices.length, hint: "Synced from Firebase" },
            { label: "Lights active", value: metrics.activeDevices, hint: "Live ON state" },
            { label: "Cameras", value: metrics.cameraCount, hint: "Mock live snapshots" },
            { label: "Safety slots", value: metrics.safetyCount, hint: "Fire-risk devices" },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-[1.5rem] border border-white/10 bg-white/7 p-5 shadow-[0_12px_50px_rgba(0,0,0,0.2)] backdrop-blur-md"
            >
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
              <div className="mt-4 text-3xl font-semibold text-white">{card.value}</div>
              <p className="mt-2 text-sm text-slate-400">{card.hint}</p>
            </article>
          ))}
        </section>

        <section className="order-2 rounded-[2rem] border border-white/10 bg-white/6 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Connected hardware</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Live devices</h2>
              <p className="mt-2 text-sm text-slate-400">
                {litRoomCount} lit room{litRoomCount === 1 ? "" : "s"} · {lighting.cameraDevices.length} camera
                {lighting.cameraDevices.length === 1 ? "" : "s"} · {lighting.safetyDevices.length} safety device
                {lighting.safetyDevices.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-300 backdrop-blur">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentFloor.accent }} />
                Active floor: {currentFloor.name}
              </span>
            </div>

            <div className="flex rounded-full border border-white/10 bg-slate-950/60 p-1">
              {floors.map((floor, index) => (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => setSelectedFloor(index)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    selectedFloor === index ? "bg-white text-slate-950 shadow-lg" : "text-slate-300 hover:bg-white/8"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: floor.accent }} />
                    {floor.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,15,25,0.96))] p-4">
              <div className="relative rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_68%)] p-4">
                <div>
                  <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Devices</p>
                      <h3 className="mt-1 text-xl font-semibold text-white">{currentFloor.name} devices</h3>
                    </div>
                    <span className="text-sm text-slate-400">{currentFloor.devices.length} connected</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {currentFloor.devices.map((device) => {
                      const isLight = device.kind === "Lighting" && device.active;
                      const roomGlowActive = roomGlow(currentFloor, device.room);
                      const markerColor = deviceColors[device.kind];
                      const isOn = device.active && device.status === "ON";
                      const wallMounted = device.kind === "Outlet" || device.kind === "Camera";
                      return (
                        <div
                          key={device.id}
                          className={`rounded-[1.25rem] border p-4 shadow-[0_12px_30px_rgba(0,0,0,0.3)] ${
                            isLight
                              ? "border-amber-200/40 bg-amber-200/12"
                              : roomGlowActive
                                ? "border-cyan-200/30 bg-cyan-200/8"
                                : "border-white/10 bg-slate-950/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center border-2 transition-all ${
                                  wallMounted ? "rounded-md" : "rounded-full"
                                }`}
                                style={{
                                  color: isOn ? "#07111f" : markerColor,
                                  borderColor: markerColor,
                                  backgroundColor: isOn ? markerColor : "transparent",
                                  boxShadow: isOn ? `0 0 18px ${markerColor}70` : "none",
                                }}
                              >
                                <DeviceIcon kind={device.kind} />
                              </div>
                              <div>
                              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{device.room}</p>
                              <h3 className="mt-1 text-lg font-semibold text-white">{device.name}</h3>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-500">{device.kind}</p>
                              </div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs ${toneForStatus(device.status)}`}>
                              {device.status}
                            </span>
                          </div>

                          <p className="mt-3 text-sm text-slate-400">{device.value}</p>

                          <div className="mt-3 flex items-center justify-between">
                            <span className={`rounded-full border px-3 py-1 text-xs ${toneForKind(device.kind)}`}>
                              {device.kind}
                            </span>
                            <span className="text-sm text-slate-300">{device.powerWatts}W</span>
                          </div>

                          {isLight ? (
                            <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-transparent shadow-[0_0_20px_rgba(255,214,102,0.9)]" />
                          ) : null}

                          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {roomStatusText(currentFloor, device.room)}
                          </div>

                          {device.kind === "Multi-switch" && device.switches?.length ? (
                            <div className="mt-4 grid gap-2" aria-label={`${device.name} switches`}>
                              {device.switches.map((item) => (
                                <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-3 py-2">
                                  <span className="text-sm capitalize text-slate-300">{item.label}</span>
                                  <span className={`relative h-6 w-11 rounded-full ${item.active ? "bg-fuchsia-400" : "bg-slate-700"}`}>
                                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${item.active ? "left-6" : "left-1"}`} />
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                <h3 className="text-lg font-semibold text-white">Connection</h3>
                <div className="mt-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          connectionStatus === "live"
                            ? "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]"
                            : connectionStatus === "fallback"
                              ? "bg-amber-300 shadow-[0_0_12px_rgba(253,224,71,0.75)]"
                              : connectionStatus === "error"
                                ? "bg-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.75)]"
                                : "bg-slate-400"
                        }`}
                      />
                      Sync pulse
                    </span>
                    <span className="text-white">
                      {connectionStatus === "live"
                        ? "Streaming"
                        : connectionStatus === "fallback"
                          ? "Waiting"
                          : connectionStatus === "error"
                            ? "Offline"
                            : "Starting"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <span>State</span>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-200">
                      {connectionStatus === "live"
                        ? "Firebase live"
                        : connectionStatus === "fallback"
                          ? "Firebase fallback"
                          : connectionStatus === "error"
                            ? "Firebase error"
                            : "Connecting"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-slate-400">
                    <span>Last update</span>
                    <span>{lastUpdated}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-slate-400">
                    <span>Alert</span>
                    <span>{alert}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                <h3 className="text-lg font-semibold text-white">Scene readout</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <p className="text-slate-400">Glow rooms</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {currentFloor.devices.filter((device) => device.kind === "Lighting" && device.active).length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <p className="text-slate-400">Camera cards</p>
                    <p className="mt-2 text-xl font-semibold text-white">{lighting.cameraDevices.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <p className="text-slate-400">Total wattage</p>
                    <p className="mt-2 text-xl font-semibold text-white">{metrics.totalPower}W</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <p className="text-slate-400">Floor theme</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {currentFloor.id === "ground-floor" ? "Warm" : "Cool"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-white/8 bg-white/4 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-slate-400">Floor profile</p>
                      <p className="mt-2 text-sm font-medium text-white">{currentFloor.name}</p>
                    </div>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: currentFloor.accent }} />
                  </div>
                  <div className="mt-3 grid gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    <div className="flex items-center justify-between gap-3">
                      <span>Rooms lit</span>
                      <span>{litRoomCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Device count</span>
                      <span>{currentFloor.devices.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Glow state</span>
                      <span>{lighting.hasGlow ? "Active" : "Idle"}</span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/8 bg-slate-950/50 px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                    Scene mood: <span className="text-white">{sceneMood}</span>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-slate-400">
                      <span>Activity</span>
                      <span>{Math.round(floorActiveRatio * 100)}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/8">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-300 via-amber-200 to-yellow-100 shadow-[0_0_20px_rgba(103,232,249,0.3)]"
                        style={{ width: `${Math.max(8, Math.round(floorActiveRatio * 100))}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/8 bg-gradient-to-r from-slate-950/60 via-white/5 to-slate-950/60 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                    {lighting.hasGlow
                      ? `${litRoomCount} lit room${litRoomCount === 1 ? "" : "s"} and ${lighting.cameraDevices.length} camera${
                          lighting.cameraDevices.length === 1 ? "" : "s"
                        } are active on ${currentFloor.name}.`
                      : `${currentFloor.name} is in standby with ${currentFloor.devices.length} devices visible.`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const deviceColors: Record<DeviceKind, string> = {
  Camera: "#38bdf8",
  Lighting: "#fbbf24",
  Safety: "#fb7185",
  "Multi-switch": "#e879f9",
  Outlet: "#34d399",
};

function DeviceIcon({ kind, className = "h-5 w-5" }: { kind: DeviceKind; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (kind === "Camera") {
    return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path {...common} d="M4 7.5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" /><path {...common} d="m17 10 5-2.5v9L17 14" /><circle {...common} cx="8" cy="12" r="2.5" /></svg>;
  }

  if (kind === "Lighting") {
    return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path {...common} d="M8.5 15.5c-1.6-1.1-2.5-2.8-2.5-4.8a6 6 0 1 1 12 0c0 2-.9 3.7-2.5 4.8-.8.6-1.2 1.2-1.2 2H9.7c0-.8-.4-1.4-1.2-2Z" /><path {...common} d="M9.5 20h5M10.5 23h3" /></svg>;
  }

  if (kind === "Safety") {
    return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path {...common} d="M12 3 3.5 19h17L12 3Z" /><path {...common} d="M12 9v4.5M12 17h.01" /></svg>;
  }

  if (kind === "Multi-switch") {
    return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><rect {...common} x="4" y="3" width="16" height="18" rx="3" /><path {...common} d="M8 8h8M8 12h8M8 16h8" /><circle cx="9" cy="8" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="10" cy="16" r="1" fill="currentColor" /></svg>;
  }

  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><rect {...common} x="5" y="3" width="14" height="18" rx="3" /><circle cx="9" cy="10" r="1.5" fill="currentColor" /><circle cx="15" cy="10" r="1.5" fill="currentColor" /><path {...common} d="M12 15v3" /></svg>;
}

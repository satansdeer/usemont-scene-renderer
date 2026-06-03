import type {
  ProgrammaticSpanLiteral,
  ProgrammaticSpanSetting,
  ProgrammaticSpanSettings,
  ProgrammaticSpanSpec
} from './types.js';

export type ProgrammaticSpanEditOverlayHandle =
  | {
      kind: 'frame';
      settingId: string;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      kind: 'point';
      settingId: string;
      label: string;
      x: number;
      y: number;
      overlayGroup?: string;
      overlayOrder?: number;
    };

export type ProgrammaticSpanEditOverlayConnection = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type ProgrammaticSpanAuthoringState = {
  handles: ProgrammaticSpanEditOverlayHandle[];
  connections: ProgrammaticSpanEditOverlayConnection[];
  overlaySettings: ProgrammaticSpanSetting[];
  panelSettings: ProgrammaticSpanSetting[];
};

export function createProgrammaticSpanAuthoringState(
  spec: ProgrammaticSpanSpec | null,
  settings: ProgrammaticSpanSettings
): ProgrammaticSpanAuthoringState {
  if (!spec) {
    return { handles: [], connections: [], overlaySettings: [], panelSettings: [] };
  }

  const overlaySettings = spec.settings.filter((setting) => !!setting.overlay);
  const handles = overlaySettings.flatMap((setting) => createOverlayHandlesForSetting(setting, settings));

  return {
    handles,
    connections: createOverlayConnections(handles),
    overlaySettings,
    panelSettings: spec.settings
  };
}

export function updateProgrammaticSpanPointSetting(
  settings: ProgrammaticSpanSettings,
  settingId: string,
  nextPoint: { x: number; y: number }
): ProgrammaticSpanSettings {
  return {
    ...settings,
    [settingId]: {
      ...(asRecord(settings[settingId]) ?? {}),
      x: nextPoint.x,
      y: nextPoint.y
    }
  };
}

export function updateProgrammaticSpanFrameSetting(
  settings: ProgrammaticSpanSettings,
  settingId: string,
  nextFrame: { x: number; y: number; width: number; height: number }
): ProgrammaticSpanSettings {
  return {
    ...settings,
    [settingId]: {
      ...(asRecord(settings[settingId]) ?? {}),
      x: nextFrame.x,
      y: nextFrame.y,
      width: nextFrame.width,
      height: nextFrame.height
    }
  };
}

function createOverlayHandlesForSetting(
  setting: ProgrammaticSpanSetting,
  settings: ProgrammaticSpanSettings
): ProgrammaticSpanEditOverlayHandle[] {
  const value = asRecord(settings[setting.id] ?? setting.default);
  if (!value) return [];

  if (setting.overlay === 'frame') {
    return [
      {
        kind: 'frame',
        settingId: setting.id,
        label: setting.label ?? setting.id,
        x: asNumber(value.x, 0),
        y: asNumber(value.y, 0),
        width: asNumber(value.width, 0),
        height: asNumber(value.height, 0)
      }
    ];
  }

  if (setting.overlay === 'point') {
    return [
      {
        kind: 'point',
        settingId: setting.id,
        label: setting.label ?? setting.id,
        x: asNumber(value.x, 0),
        y: asNumber(value.y, 0),
        overlayGroup: setting.overlayGroup,
        overlayOrder: setting.overlayOrder
      }
    ];
  }

  return [];
}

function createOverlayConnections(
  handles: ProgrammaticSpanEditOverlayHandle[]
): ProgrammaticSpanEditOverlayConnection[] {
  const groups = new Map<string, Extract<ProgrammaticSpanEditOverlayHandle, { kind: 'point' }>[]>();
  for (const handle of handles) {
    if (handle.kind !== 'point' || !handle.overlayGroup) continue;
    const group = groups.get(handle.overlayGroup) ?? [];
    group.push(handle);
    groups.set(handle.overlayGroup, group);
  }

  const connections: ProgrammaticSpanEditOverlayConnection[] = [];
  for (const [groupId, groupHandles] of groups.entries()) {
    const sorted = [...groupHandles].sort((a, b) => (a.overlayOrder ?? 0) - (b.overlayOrder ?? 0));
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const from = sorted[index];
      const to = sorted[index + 1];
      connections.push({
        id: `${groupId}-${index}`,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y
      });
    }
  }
  return connections;
}

function asRecord(value: ProgrammaticSpanLiteral | undefined): Record<string, ProgrammaticSpanLiteral> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, ProgrammaticSpanLiteral>)
    : null;
}

function asNumber(value: ProgrammaticSpanLiteral | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

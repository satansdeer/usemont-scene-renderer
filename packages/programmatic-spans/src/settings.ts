import type {
  ProgrammaticSpanLiteral,
  ProgrammaticSpanSetting,
  ProgrammaticSpanSettings
} from './types.js';

export function createDefaultProgrammaticSpanSettings(
  settings: ProgrammaticSpanSetting[]
): ProgrammaticSpanSettings {
  return Object.fromEntries(settings.map((setting) => [setting.id, setting.default])) as Record<
    string,
    ProgrammaticSpanLiteral
  >;
}

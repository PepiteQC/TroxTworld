// UI State, Sound Settings & Theme Types

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  radioVolume: number;
  isTypingSoundEnabled: boolean;
  selectedRingtone: string;
}

export interface UIState {
  isPhoneOpen: boolean;
  isInventoryOpen: boolean;
  isMapOpen: boolean;
  isSettingsOpen: boolean;
  activeNotification?: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
  } | null;
}

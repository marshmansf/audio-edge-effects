export type EdgePosition = 'top' | 'bottom' | 'left' | 'right';
export type VisualizerMode = 'spectrum' | 'waveform';
export interface Settings {
    position: EdgePosition;
    height: number;
    opacity: number;
    visualizerMode: VisualizerMode;
    audioDeviceId: string | null;
    colorScheme: string;
    barCount: number;
    showPeaks: boolean;
}
export declare const defaultSettings: Settings;
export interface AudioDevice {
    deviceId: string;
    label: string;
}
export declare const IPC: {
    readonly GET_SETTINGS: "get-settings";
    readonly SET_SETTINGS: "set-settings";
    readonly GET_AUDIO_DEVICES: "get-audio-devices";
    readonly TOGGLE_VISUALIZER: "toggle-visualizer";
    readonly SET_POSITION: "set-position";
    readonly SET_OPACITY: "set-opacity";
    readonly SET_VISUALIZER_MODE: "set-visualizer-mode";
};
//# sourceMappingURL=types.d.ts.map
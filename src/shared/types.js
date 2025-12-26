"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC = exports.defaultSettings = void 0;
exports.defaultSettings = {
    position: 'bottom',
    height: 60,
    opacity: 0.85,
    visualizerMode: 'spectrum',
    audioDeviceId: null,
    colorScheme: 'classic',
    barCount: 64,
    showPeaks: true
};
// IPC channel names
exports.IPC = {
    GET_SETTINGS: 'get-settings',
    SET_SETTINGS: 'set-settings',
    GET_AUDIO_DEVICES: 'get-audio-devices',
    TOGGLE_VISUALIZER: 'toggle-visualizer',
    SET_POSITION: 'set-position',
    SET_OPACITY: 'set-opacity',
    SET_VISUALIZER_MODE: 'set-visualizer-mode'
};
//# sourceMappingURL=types.js.map
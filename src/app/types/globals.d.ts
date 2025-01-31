export interface CustomWindow extends Window {
  inputMode?: string;
  shouldMaskAudioStream?: boolean;
  inputSensitivityScale?: number;
  inputVolumeScale?: number;
  sbVolumeScale?: number;
  speakers?: Set<string>;
  attenuationStrength?: number;
  streamAttenuation?: string;
  showNoMicInputWarning?: string;
}

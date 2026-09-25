/**
 * Synthesised cabin ambience: a low engine rumble plus a faint air-vent hiss,
 * both shaped from looping white noise. White noise has no audible seam, and
 * the filters run live, so the loop never clicks.
 */

const NOISE_SECONDS = 4
/** Seconds for volume changes to settle; avoids clicks and abrupt starts. */
const FADE_S = 0.6
/** Keeps the loudest setting comfortable for hours of background listening. */
const MAX_GAIN = 0.5

function createNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(2, context.sampleRate * NOISE_SECONDS, context.sampleRate)
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return buffer
}

export class CabinNoise {
  private context = new AudioContext()
  private master = this.context.createGain()

  constructor() {
    const { context, master } = this
    const noise = createNoiseBuffer(context)
    master.gain.value = 0
    master.connect(context.destination)

    // Engine rumble: heavily low-passed noise, breathing slowly.
    const rumble = this.loop(noise)
    const highpass = new BiquadFilterNode(context, { type: "highpass", frequency: 35 })
    const lowpass = new BiquadFilterNode(context, { type: "lowpass", frequency: 320, Q: 0.5 })
    const rumbleGain = new GainNode(context, { gain: 1 })
    rumble.connect(highpass).connect(lowpass).connect(rumbleGain).connect(master)

    const swell = new OscillatorNode(context, { frequency: 0.07 })
    const swellDepth = new GainNode(context, { gain: 0.08 })
    swell.connect(swellDepth).connect(rumbleGain.gain)
    swell.start()

    // Air vents: a quiet band of higher noise.
    const hiss = this.loop(noise, NOISE_SECONDS / 2)
    const band = new BiquadFilterNode(context, { type: "bandpass", frequency: 2800, Q: 0.4 })
    hiss.connect(band).connect(new GainNode(context, { gain: 0.04 })).connect(master)
  }

  private loop(buffer: AudioBuffer, offset = 0) {
    const source = new AudioBufferSourceNode(this.context, { buffer, loop: true })
    source.start(0, offset)
    return source
  }

  /** Fades to `volume` (0–1); 0 silences it. */
  setVolume(volume: number) {
    if (volume > 0) void this.context.resume()
    // Squared for a more even-feeling slider.
    const target = Math.max(0, Math.min(1, volume)) ** 2 * MAX_GAIN
    this.master.gain.setTargetAtTime(target, this.context.currentTime, FADE_S / 3)
  }

  dispose() {
    void this.context.close()
  }
}

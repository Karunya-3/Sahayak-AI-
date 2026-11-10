/**
 * Lightweight, zero-dependency browser PCM WAV recorder.
 * Captures microphone audio, resamples to 16,000 Hz 16-bit Mono,
 * and builds a valid RIFF/WAVE header accepted natively by speech recognition models (Prisma).
 */

export class WavRecorder {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.source = null;
    this.audioBuffers = [];
    this.recording = false;
    this.targetSampleRate = 16000;
  }

  async start() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.audioBuffers = [];

    // ScriptProcessor to capture raw PCM float32 samples
    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.recording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      // Copy float array
      this.audioBuffers.push(new Float32Array(inputData));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.recording = true;
  }

  async stop() {
    this.recording = false;

    // Disconnect audio nodes
    if (this.processor && this.source) {
      this.source.disconnect(this.processor);
      this.processor.disconnect();
    }

    // Stop all microphone tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }

    // Merge recorded float buffers
    const totalLength = this.audioBuffers.reduce((acc, b) => acc + b.length, 0);
    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of this.audioBuffers) {
      mergedSamples.set(buf, offset);
      offset += buf.length;
    }

    // Resample from audioContext.sampleRate to targetSampleRate (16000Hz)
    const currentSampleRate = this.audioContext?.sampleRate || 44100;
    const resampledSamples = this.resampleAudio(
      mergedSamples,
      currentSampleRate,
      this.targetSampleRate
    );

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }

    // Encode to 16-bit PCM WAV Blob
    const wavBlob = this.encodeWAV(resampledSamples, this.targetSampleRate);
    return wavBlob;
  }

  resampleAudio(samples, fromRate, toRate) {
    if (fromRate === toRate) {
      return samples;
    }
    const ratio = fromRate / toRate;
    const newLength = Math.round(samples.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const originIndex = i * ratio;
      const indexPrev = Math.floor(originIndex);
      const indexNext = Math.min(indexPrev + 1, samples.length - 1);
      const fraction = originIndex - indexPrev;

      // Linear interpolation
      result[i] =
        samples[indexPrev] * (1 - fraction) + samples[indexNext] * fraction;
    }
    return result;
  }

  encodeWAV(samples, sampleRate) {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // 1. RIFF Identifier
    this.writeString(view, 0, 'RIFF');
    // 2. RIFF Chunk Size (36 + dataSize)
    view.setUint32(4, 36 + dataSize, true);
    // 3. WAVE Identifier
    this.writeString(view, 8, 'WAVE');
    // 4. Format Chunk Identifier: 'fmt '
    this.writeString(view, 12, 'fmt ');
    // 5. Format Chunk Length (16 for PCM)
    view.setUint32(16, 16, true);
    // 6. Sample Format: 1 = PCM
    view.setUint16(20, 1, true);
    // 7. Channels: 1 = Mono
    view.setUint16(22, numChannels, true);
    // 8. Sample Rate: 16000
    view.setUint32(24, sampleRate, true);
    // 9. Byte Rate
    view.setUint32(28, byteRate, true);
    // 10. Block Align: 2
    view.setUint16(32, blockAlign, true);
    // 11. Bits Per Sample: 16
    view.setUint16(34, 16, true);
    // 12. Data Chunk Identifier: 'data'
    this.writeString(view, 36, 'data');
    // 13. Data Chunk Length
    view.setUint32(40, dataSize, true);

    // 14. Write 16-bit PCM Audio Samples (clamped between -32768 and 32767)
    let pcmOffset = 44;
    for (let i = 0; i < samples.length; i++, pcmOffset += 2) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(pcmOffset, int16, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}


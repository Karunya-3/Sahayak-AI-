import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { AudioWaveform } from './AudioWaveform';
import { WavRecorder } from '../utils/audioRecorder';
import {
  Mic,
  Square,
  Send,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export const VoiceInteractionArea = ({
  onQuerySubmitted,
  placeholder = "Speak naturally, or type what you need help with...",
  compact = false,
}) => {
  const {
    currentLanguage,
    isSpeaking,
    stopSpeaking,
    playAudio,
    showToast,
    setPendingTaskConfirmation,
    refreshTasks,
  } = useApp();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [inputText, setInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const wavRecorderRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start Voice Recording with 16kHz PCM WAV
  const startRecording = async () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    try {
      const recorder = new WavRecorder();
      wavRecorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);
      setStatusMessage('Listening to your voice with Prisma STT (16kHz PCM)...');
    } catch (err) {
      console.warn('WavRecorder fallback to MediaRecorder:', err);
      // Fallback to MediaRecorder if AudioContext not permitted
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          await handleAudioCaptured(audioBlob);
        };
        mediaRecorder.start(250);
        setIsRecording(true);
        setStatusMessage('Listening to your voice...');
      } catch (fallbackErr) {
        console.error('Microphone access denied:', fallbackErr);
        showToast('Could not access microphone. Please allow microphone permission in your browser.', 'error');
        setIsRecording(false);
      }
    }
  };

  // Stop Voice Recording
  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsProcessing(true);
    setStatusMessage('Transcribing speech using Gnani Prisma...');

    if (wavRecorderRef.current && wavRecorderRef.current.recording) {
      try {
        const wavBlob = await wavRecorderRef.current.stop();
        await handleAudioCaptured(wavBlob);
      } catch (err) {
        console.error('Error stopping WavRecorder:', err);
        setIsProcessing(false);
        setStatusMessage('Error capturing audio.');
      }
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Process captured audio
  const handleAudioCaptured = async (audioBlob) => {
    try {
      const res = await api.transcribeAudio(audioBlob, currentLanguage);
      setIsProcessing(false);

      if (res && res.transcript && res.transcript.trim()) {
        const recognizedText = res.transcript.trim();
        setTranscriptPreview(recognizedText);
        setInputText(recognizedText);
        setStatusMessage(`Recognized (${res.detected_language_code || currentLanguage}): "${recognizedText}"`);
        showToast('Speech transcribed successfully!', 'success');

        // Automatically dispatch query if callback provided
        if (onQuerySubmitted) {
          onQuerySubmitted(recognizedText);
          setInputText('');
          setTranscriptPreview('');
          setStatusMessage('');
        }
      } else if (res && res.is_mock) {
        showToast(res.error || 'Please configure GNANI_API_KEY for live Prisma STT.', 'info');
        setStatusMessage('Prisma API key pending in backend/.env. You can also type your query below.');
      } else {
        setStatusMessage('No clear speech was recognized. Try speaking again or type below.');
        showToast('No speech detected. Please try speaking closer to the mic.', 'info');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setIsProcessing(false);
      setStatusMessage('Speech recognition encountered an error. Please try again or type.');
      showToast('Error during transcription', 'error');
    }
  };

  // Submit typed or edited text
  const handleSubmit = (e) => {
    e?.preventDefault();
    const query = (inputText || transcriptPreview).trim();
    if (!query) return;

    if (onQuerySubmitted) {
      onQuerySubmitted(query);
    }
    setInputText('');
    setTranscriptPreview('');
    setStatusMessage('');
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`w-full ${compact ? '' : 'max-w-3xl mx-auto'}`}>
      {/* Central Visual Interaction Area */}
      <div className={`relative overflow-hidden rounded-3xl p-6 md:p-8 card-soft text-center transition-all ${
        isRecording ? 'border-red-300 ring-4 ring-red-100' : isProcessing ? 'border-indigo-300 ring-4 ring-indigo-50' : ''
      }`}>
        {/* Soft Background Radial Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-transparent to-transparent pointer-events-none" />

        {/* Dynamic Voice State Indicator */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Waveform Visualization during Recording or Speaking */}
          <div className="h-12 flex items-center justify-center mb-3">
            {isRecording ? (
              <div className="flex flex-col items-center gap-1">
                <AudioWaveform isRecording={true} size="md" />
                <span className="text-xs font-semibold text-red-600 tracking-wide animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  Recording {formatTimer(recordingSeconds)}
                </span>
              </div>
            ) : isSpeaking ? (
              <div className="flex flex-col items-center gap-1">
                <AudioWaveform isSpeaking={true} size="md" />
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                  Sahayak is speaking (Timbre TTS)
                </span>
              </div>
            ) : isProcessing ? (
              <div className="flex items-center gap-2 text-primary font-medium text-sm animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Understanding your request with Evon...</span>
              </div>
            ) : (
              <p className="text-xs md:text-sm text-charcoal-muted max-w-md">
                Click the microphone to speak, or type your question below.
              </p>
            )}
          </div>

          {/* Large Interactive Microphone Button */}
          <div className="relative my-2">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform transform active:scale-95 group"
                title="Click to stop recording"
              >
                <Square className="w-8 h-8 fill-current group-hover:scale-110 transition-transform" />
              </button>
            ) : isProcessing ? (
              <div className="w-20 h-20 rounded-full bg-secondary text-primary flex items-center justify-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg animate-pulse-glow transition-all transform active:scale-95 group"
                title="Click to speak"
              >
                <Mic className="w-9 h-9 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* Speaking Stop Control Pill */}
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-charcoal text-white text-xs px-3 py-1 rounded-full shadow-md hover:bg-black flex items-center gap-1 transition-transform active:scale-95 whitespace-nowrap z-20"
              >
                <VolumeX className="w-3.5 h-3.5" />
                Stop Voice
              </button>
            )}
          </div>

          {/* Live Transcript / Status Preview */}
          {statusMessage && (
            <div className="mt-3 text-xs text-charcoal-muted font-medium bg-warm-200/70 px-3 py-1.5 rounded-full inline-block max-w-lg truncate">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Text Input Fallback Bar */}
        <form onSubmit={handleSubmit} className="relative z-10 mt-6 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-white border border-warm-300 rounded-2xl pl-4 pr-12 py-3.5 text-sm text-charcoal placeholder-charcoal-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
            />
            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-subtle hover:text-charcoal text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() && !transcriptPreview.trim()}
            className="bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:hover:bg-primary text-white p-3.5 rounded-2xl shadow-sm transition-all transform active:scale-95 flex items-center justify-center"
            title="Send query"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

import { useCallback, useEffect, useRef, useState } from 'react';

/* Minimal Web Speech typings (not in the DOM lib by default). */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: { 0: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface VoiceWindow extends Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

export interface UseVoice {
  /** Speech recognition support. */
  recognitionSupported: boolean;
  /** Speech synthesis support. */
  synthesisSupported: boolean;
  listening: boolean;
  /** id currently being spoken aloud, or null. */
  speakingId: string | null;
  /** Start/stop dictation. Recognized text is passed to `onResult`. */
  toggleMic: (onResult: (text: string) => void) => void;
  /** Speak `text`; calling again with the same id stops it (toggle). */
  speak: (text: string, id: string) => void;
}

/**
 * Web Speech API wrapper (SpeechRecognition + speechSynthesis) with graceful
 * fallback: when unsupported, `toggleMic` briefly flips `listening` for UI feedback
 * and `speak` is a no-op.
 */
export function useVoice(): UseVoice {
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const w = typeof window !== 'undefined' ? (window as VoiceWindow) : undefined;
  const Ctor = w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
  const recognitionSupported = Boolean(Ctor);
  const synthesisSupported = Boolean(w && 'speechSynthesis' in w);

  const toggleMic = useCallback(
    (onResult: (text: string) => void) => {
      if (listening) {
        setListening(false);
        try {
          recRef.current?.stop();
        } catch {
          /* ignore */
        }
        return;
      }
      if (Ctor) {
        const r = new Ctor();
        r.lang = 'en-US';
        r.interimResults = false;
        r.onresult = (e) => onResult(e.results[0][0].transcript);
        r.onend = () => setListening(false);
        r.onerror = () => setListening(false);
        recRef.current = r;
        try {
          r.start();
          setListening(true);
        } catch {
          setListening(false);
        }
      } else {
        // Unsupported: flash the listening state so the mic button still reacts.
        setListening(true);
        fallbackTimer.current = setTimeout(() => setListening(false), 1800);
      }
    },
    [Ctor, listening],
  );

  const speak = useCallback(
    (text: string, id: string) => {
      if (!w || !('speechSynthesis' in w)) return;
      const synth = w.speechSynthesis;
      if (speakingId === id) {
        synth.cancel();
        setSpeakingId(null);
        return;
      }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.onend = () => setSpeakingId(null);
      setSpeakingId(id);
      synth.speak(u);
    },
    [speakingId, w],
  );

  useEffect(
    () => () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  return { recognitionSupported, synthesisSupported, listening, speakingId, toggleMic, speak };
}

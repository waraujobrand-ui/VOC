/*
 * useVoiceRecorder
 *
 * Real browser microphone capture via navigator.mediaDevices.getUserMedia
 * and MediaRecorder. Produces a real audio Blob (no fake / simulated state).
 *
 * States:
 *   idle              — never started
 *   requesting        — getUserMedia in flight
 *   recording         — MediaRecorder running
 *   stopped           — final Blob ready, previewable
 *   failed            — permission denied or runtime error
 *   unsupported       — browser cannot record (no MediaRecorder / getUserMedia)
 *
 * Output:
 *   blob              — real Blob (no fallback)
 *   url               — object URL for preview
 *   mimeType          — e.g. audio/webm;codecs=opus
 *   fileName          — stable filename for clone upload
 *   asFile()          — File-like for the clone endpoint
 *   durationMs        — recording length in ms
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export const RECORDER_STATES = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  RECORDING: 'recording',
  STOPPED: 'stopped',
  FAILED: 'failed',
  UNSUPPORTED: 'unsupported',
};

function detectSupport() {
  if (typeof window === 'undefined') return false;
  if (!window.MediaRecorder) return false;
  if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  return true;
}

function pickMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const m of candidates) {
    try {
      if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(m)) {
        return m;
      }
    } catch {
      // ignore
    }
  }
  return '';
}

function extensionFor(mimeType) {
  if (!mimeType) return 'webm';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

export function useVoiceRecorder() {
  const [supported, setSupported] = useState(true);
  const [state, setState] = useState(RECORDER_STATES.IDLE);
  const [error, setError] = useState('');
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [durationMs, setDurationMs] = useState(0);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const urlRef = useRef('');

  // Detect support on mount (avoids SSR / build-time issues).
  useEffect(() => {
    const ok = detectSupport();
    setSupported(ok);
    if (!ok) {
      setState(RECORDER_STATES.UNSUPPORTED);
      setError(
        'This browser cannot record audio. MediaRecorder or getUserMedia is unavailable.',
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = '';
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const clearPreviousBlob = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = '';
    }
    setBlob(null);
    setUrl('');
    setDurationMs(0);
  }, []);

  const start = useCallback(async () => {
    if (!detectSupport()) {
      setSupported(false);
      setState(RECORDER_STATES.UNSUPPORTED);
      setError(
        'This browser cannot record audio. MediaRecorder or getUserMedia is unavailable.',
      );
      return { ok: false, reason: 'unsupported' };
    }
    clearPreviousBlob();
    setError('');
    setState(RECORDER_STATES.REQUESTING);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const reason = err && (err.message || err.name)
        ? `${err.name || 'Error'}: ${err.message || ''}`.trim()
        : 'Microphone permission denied or unavailable.';
      setState(RECORDER_STATES.FAILED);
      setError(reason);
      return { ok: false, reason };
    }
    streamRef.current = stream;
    const chosenMime = pickMimeType();
    let recorder;
    try {
      recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const reason = err && err.message ? err.message : 'MediaRecorder construction failed.';
      setState(RECORDER_STATES.FAILED);
      setError(reason);
      return { ok: false, reason };
    }
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onerror = (event) => {
      const reason =
        (event && event.error && event.error.message) ||
        'Recorder error.';
      setState(RECORDER_STATES.FAILED);
      setError(reason);
    };
    recorder.onstop = () => {
      try {
        const finalMime = recorder.mimeType || chosenMime || 'audio/webm';
        const finalBlob = new Blob(chunksRef.current, { type: finalMime });
        chunksRef.current = [];
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (!finalBlob || finalBlob.size === 0) {
          setState(RECORDER_STATES.FAILED);
          setError('Recording produced no audio data.');
          return;
        }
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }
        const objectUrl = URL.createObjectURL(finalBlob);
        urlRef.current = objectUrl;
        setBlob(finalBlob);
        setUrl(objectUrl);
        setMimeType(finalMime);
        setDurationMs(Date.now() - startedAtRef.current);
        setState(RECORDER_STATES.STOPPED);
      } catch (err) {
        const reason = err && err.message ? err.message : 'Failed to finalize recording.';
        setState(RECORDER_STATES.FAILED);
        setError(reason);
      }
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setMimeType(chosenMime || '');
    try {
      recorder.start();
      setState(RECORDER_STATES.RECORDING);
      return { ok: true };
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const reason = err && err.message ? err.message : 'Recorder failed to start.';
      setState(RECORDER_STATES.FAILED);
      setError(reason);
      return { ok: false, reason };
    }
  }, [clearPreviousBlob]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') {
      return { ok: false, reason: 'not recording' };
    }
    try {
      recorder.stop();
      return { ok: true };
    } catch (err) {
      const reason = err && err.message ? err.message : 'Recorder failed to stop.';
      setState(RECORDER_STATES.FAILED);
      setError(reason);
      return { ok: false, reason };
    }
  }, []);

  const reset = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    clearPreviousBlob();
    setError('');
    setMimeType('');
    setState(
      detectSupport() ? RECORDER_STATES.IDLE : RECORDER_STATES.UNSUPPORTED,
    );
  }, [clearPreviousBlob]);

  const asFile = useCallback(
    (baseName = 'voc-recording') => {
      if (!blob) return null;
      const ext = extensionFor(mimeType || blob.type || '');
      const name = `${baseName}.${ext}`;
      try {
        return new File([blob], name, { type: blob.type || mimeType });
      } catch {
        // Older browsers without File constructor — return a Blob with a name shim.
        const shim = blob;
        Object.defineProperty(shim, 'name', { value: name, configurable: true });
        return shim;
      }
    },
    [blob, mimeType],
  );

  const fileName = (() => {
    const ext = extensionFor(mimeType || (blob && blob.type) || '');
    return `voc-recording.${ext}`;
  })();

  return {
    state,
    supported,
    error,
    blob,
    url,
    mimeType,
    fileName,
    durationMs,
    start,
    stop,
    reset,
    asFile,
  };
}

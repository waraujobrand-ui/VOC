import { useEffect, useRef, useState } from 'react';

import { localDeterministicToneEngine } from '../audio/localDeterministicToneEngine.js';
import { createVocString } from '../schema.js';

export const GENERATION_STATES = {
  IDLE: 'idle',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
};

export function useAudioGeneration({ provider = localDeterministicToneEngine } = {}) {
  const [state, setState] = useState(GENERATION_STATES.IDLE);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [providerStatus, setProviderStatus] = useState({ ok: null, reason: '' });
  const lastUrlRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    provider
      .available()
      .then((availability) => {
        if (!cancelled) {
          setProviderStatus({
            ok: !!availability.ok,
            reason: availability.reason || '',
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProviderStatus({ ok: false, reason: err.message || String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = '';
      }
    };
  }, []);

  async function generate({ parameters, sourceMeta }) {
    setState(GENERATION_STATES.GENERATING);
    setError('');
    try {
      const vocString = createVocString(parameters);
      const generation = await provider.generate({
        parameters,
        vocString,
        sourceMeta,
      });

      const url = URL.createObjectURL(generation.blob);
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
      }
      lastUrlRef.current = url;

      setResult(generation);
      setPreviewUrl(url);
      setState(GENERATION_STATES.READY);
      return generation;
    } catch (err) {
      setError(err?.message || String(err));
      setState(GENERATION_STATES.FAILED);
      setResult(null);
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = '';
      }
      setPreviewUrl('');
      return null;
    }
  }

  function exportGeneratedAudio() {
    if (!result || !result.blob) {
      return false;
    }
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (result.vocString || 'voc-audio')
      .replace(/[^a-z0-9_.-]+/gi, '_')
      .slice(0, 80);
    link.download = `voc_${result.providerId}_${safeName}.${result.extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  }

  function reset() {
    if (lastUrlRef.current) {
      URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = '';
    }
    setResult(null);
    setPreviewUrl('');
    setError('');
    setState(GENERATION_STATES.IDLE);
  }

  return {
    provider,
    providerStatus,
    state,
    result,
    previewUrl,
    error,
    generate,
    exportGeneratedAudio,
    reset,
  };
}

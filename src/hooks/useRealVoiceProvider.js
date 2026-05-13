/*
 * useRealVoiceProvider
 *
 * Tracks the real ElevenLabs provider connection + capability matrix and
 * exposes truth-only clone / preview / export actions.
 *
 * Invariants:
 *   - No fake voice_id is ever set; voice_id only comes from a successful
 *     backend clone call.
 *   - No fake audio is ever produced; preview blob only comes from a
 *     successful backend generate call.
 *   - If status reports disconnected, all action capabilities are forced off.
 *   - Export reuses the exact preview blob; if no preview, export is
 *     unavailable.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  defaultRealProviderCapabilities,
  fetchRealProviderStatus,
  realProviderClone,
  realProviderGenerate,
} from '../audio/realProviderAdapter.js';

export const REAL_PROVIDER_STATES = {
  IDLE: 'idle',
  WORKING: 'working',
  READY: 'ready',
  FAILED: 'failed',
};

export function useRealVoiceProvider() {
  const [status, setStatus] = useState({
    checked: false,
    connected: false,
    reason: 'status not yet checked',
    capabilities: defaultRealProviderCapabilities(),
    provider: 'elevenlabs',
  });
  const [cloneState, setCloneState] = useState({
    state: REAL_PROVIDER_STATES.IDLE,
    voice_id: null,
    requires_verification: false,
    reason: '',
  });
  const [previewState, setPreviewState] = useState({
    state: REAL_PROVIDER_STATES.IDLE,
    blob: null,
    url: '',
    mimeType: '',
    mapping: null,
    reason: '',
  });

  const previewUrlRef = useRef('');

  const refreshStatus = useCallback(async () => {
    const result = await fetchRealProviderStatus();
    setStatus((current) => ({
      checked: true,
      connected: !!result.connected,
      reason: result.reason || '',
      capabilities: {
        connected: !!result.connected,
        cloning: !!result.connected,
        analysis: false,
        preview: !!result.connected,
        export: false,
      },
      provider: result.provider || current.provider,
    }));
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchRealProviderStatus();
      if (cancelled) return;
      setStatus({
        checked: true,
        connected: !!result.connected,
        reason: result.reason || '',
        capabilities: {
          connected: !!result.connected,
          cloning: !!result.connected,
          analysis: false,
          preview: !!result.connected,
          export: false,
        },
        provider: result.provider || 'elevenlabs',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = '';
      }
    };
  }, []);

  const cloneFromFile = useCallback(
    async ({ file, name }) => {
      if (!status.capabilities.cloning) {
        setCloneState({
          state: REAL_PROVIDER_STATES.FAILED,
          voice_id: null,
          requires_verification: false,
          reason:
            status.reason ||
            'Provider disconnected — real cloning unavailable.',
        });
        return null;
      }
      setCloneState({
        state: REAL_PROVIDER_STATES.WORKING,
        voice_id: null,
        requires_verification: false,
        reason: '',
      });
      const result = await realProviderClone({ file, name });
      if (!result.ok) {
        setCloneState({
          state: REAL_PROVIDER_STATES.FAILED,
          voice_id: null,
          requires_verification: false,
          reason: result.reason || 'clone failed',
        });
        return null;
      }
      setCloneState({
        state: REAL_PROVIDER_STATES.READY,
        voice_id: result.voice_id,
        requires_verification: !!result.requires_verification,
        reason: '',
      });
      return result;
    },
    [status.capabilities.cloning, status.reason],
  );

  const generatePreview = useCallback(
    async ({ text, parameters }) => {
      if (!status.capabilities.preview) {
        setPreviewState((current) => ({
          ...current,
          state: REAL_PROVIDER_STATES.FAILED,
          reason:
            status.reason ||
            'Provider disconnected — real preview unavailable.',
        }));
        return null;
      }
      if (!cloneState.voice_id) {
        setPreviewState((current) => ({
          ...current,
          state: REAL_PROVIDER_STATES.FAILED,
          reason: 'No provider voice_id — clone a source first.',
        }));
        return null;
      }
      setPreviewState({
        state: REAL_PROVIDER_STATES.WORKING,
        blob: null,
        url: '',
        mimeType: '',
        mapping: null,
        reason: '',
      });
      const result = await realProviderGenerate({
        voiceId: cloneState.voice_id,
        text,
        parameters,
      });
      if (!result.ok) {
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = '';
        }
        setPreviewState({
          state: REAL_PROVIDER_STATES.FAILED,
          blob: null,
          url: '',
          mimeType: '',
          mapping: null,
          reason: result.reason || 'generate failed',
        });
        return null;
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const url = URL.createObjectURL(result.blob);
      previewUrlRef.current = url;
      setPreviewState({
        state: REAL_PROVIDER_STATES.READY,
        blob: result.blob,
        url,
        mimeType: result.mimeType,
        mapping: result.mapping,
        reason: '',
      });
      return result;
    },
    [cloneState.voice_id, status.capabilities.preview, status.reason],
  );

  const exportPreview = useCallback(() => {
    if (!previewState.blob) {
      return { ok: false, reason: 'No real provider preview to export.' };
    }
    const url = URL.createObjectURL(previewState.blob);
    const link = document.createElement('a');
    link.href = url;
    const ext = (previewState.mimeType || 'audio/mpeg').includes('wav')
      ? 'wav'
      : 'mp3';
    link.download = `voc_elevenlabs_${(cloneState.voice_id || 'preview').slice(0, 12)}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { ok: true };
  }, [cloneState.voice_id, previewState.blob, previewState.mimeType]);

  const reset = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setCloneState({
      state: REAL_PROVIDER_STATES.IDLE,
      voice_id: null,
      requires_verification: false,
      reason: '',
    });
    setPreviewState({
      state: REAL_PROVIDER_STATES.IDLE,
      blob: null,
      url: '',
      mimeType: '',
      mapping: null,
      reason: '',
    });
  }, []);

  // Live "export available" is preview-blob driven, not just provider-driven.
  const effectiveCapabilities = {
    ...status.capabilities,
    export:
      status.capabilities.preview &&
      previewState.state === REAL_PROVIDER_STATES.READY &&
      !!previewState.blob,
  };

  return {
    status,
    capabilities: effectiveCapabilities,
    cloneState,
    previewState,
    cloneFromFile,
    generatePreview,
    exportPreview,
    refreshStatus,
    reset,
  };
}

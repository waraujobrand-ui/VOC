import { useRef, useState } from 'react';

import { REAL_PROVIDER_STATES } from '../hooks/useRealVoiceProvider.js';
import { mapVocToElevenLabsRequest } from '../audio/elevenLabsParameterMapping.js';

const CAPABILITY_LABELS = {
  connected: 'Provider connected',
  cloning: 'Cloning (upload → real voice_id)',
  analysis: 'Voice analysis → VOC parameters',
  preview: 'Real provider preview (TTS)',
  export: 'Export real provider preview',
};

function CapabilityRow({ label, value, detail }) {
  return (
    <div className="voc-status-item">
      <span>{label}</span>
      <strong>
        {value ? 'available' : 'unavailable'}
        {detail ? ` — ${detail}` : ''}
      </strong>
    </div>
  );
}

export default function RealProviderPanel({
  realProvider,
  parameters,
  previewText: previewTextProp,
}) {
  const {
    status,
    capabilities,
    cloneState,
    previewState,
    cloneFromFile,
    generatePreview,
    exportPreview,
    refreshStatus,
    reset,
  } = realProvider;

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewText, setPreviewText] = useState(
    previewTextProp || 'This is a VOC real provider preview.',
  );
  const [voiceName, setVoiceName] = useState('VOC Source Voice');
  const [exportInfo, setExportInfo] = useState('');

  const mapping = mapVocToElevenLabsRequest(parameters);

  function handleFile(event) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  }

  async function handleClone() {
    setExportInfo('');
    await cloneFromFile({ file: selectedFile, name: voiceName });
  }

  async function handlePreview() {
    setExportInfo('');
    await generatePreview({ text: previewText, parameters });
  }

  function handleExport() {
    const r = exportPreview();
    setExportInfo(r.ok ? 'Export started.' : `Export unavailable: ${r.reason}`);
  }

  const isCloning = cloneState.state === REAL_PROVIDER_STATES.WORKING;
  const isPreviewing = previewState.state === REAL_PROVIDER_STATES.WORKING;
  const previewReady = previewState.state === REAL_PROVIDER_STATES.READY;
  const cloneReady = cloneState.state === REAL_PROVIDER_STATES.READY;

  return (
    <section className="voc-card voc-real-provider-panel">
      <div className="voc-card-heading-row">
        <div>
          <span className="voc-card-subtitle">Real Provider Truth</span>
          <h2>ElevenLabs Voice Identity</h2>
          <p>
            Real provider path. Cloning calls ElevenLabs Instant Voice Cloning
            (IVC); preview calls ElevenLabs Text-to-Speech. No local fallback
            audio is ever substituted on this path. If the backend reports the
            provider is disconnected (no ELEVENLABS_API_KEY configured), all
            real-provider actions explicitly fail.
          </p>
        </div>
        <span
          className={`voc-status-pill voc-real-provider-state voc-real-provider-state-${
            status.connected ? 'connected' : 'disconnected'
          }`}
        >
          {status.checked
            ? status.connected
              ? 'CONNECTED'
              : 'DISCONNECTED'
            : 'CHECKING…'}
        </span>
      </div>

      <div className="voc-audio-provider">
        <CapabilityRow
          label={CAPABILITY_LABELS.connected}
          value={capabilities.connected}
          detail={status.connected ? '' : status.reason}
        />
        <CapabilityRow
          label={CAPABILITY_LABELS.cloning}
          value={capabilities.cloning}
        />
        <CapabilityRow
          label={CAPABILITY_LABELS.analysis}
          value={capabilities.analysis}
          detail="not implemented — uploads are not analyzed into VOC parameters"
        />
        <CapabilityRow
          label={CAPABILITY_LABELS.preview}
          value={capabilities.preview}
        />
        <CapabilityRow
          label={CAPABILITY_LABELS.export}
          value={capabilities.export}
          detail={
            previewReady
              ? 'export = exact preview blob'
              : 'requires a successful real provider preview first'
          }
        />
      </div>

      <p className="voc-audio-note">
        Cost / rate-limit truth: when ELEVENLABS_API_KEY is configured and the
        provider is connected, each clone and each preview consumes ElevenLabs
        plan quota (cloning slots, character credits, and concurrency limits
        per the plan). No numeric estimates are claimed here — see the
        ElevenLabs pricing/quota pages for current values.
      </p>

      <div className="voc-real-provider-actions">
        <button
          type="button"
          className="voc-button voc-button-secondary"
          onClick={refreshStatus}
        >
          Refresh provider status
        </button>
        <button
          type="button"
          className="voc-button voc-button-secondary"
          onClick={reset}
        >
          Reset real provider state
        </button>
      </div>

      <div className="voc-real-provider-clone">
        <h3>1. Clone source → real voice_id</h3>
        <label className="voc-label">
          Voice name
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            data-testid="voc-real-provider-voice-name"
          />
        </label>
        <label className="voc-label">
          Audio file (sent directly to ElevenLabs IVC)
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFile}
            data-testid="voc-real-provider-audio-input"
          />
        </label>
        <button
          type="button"
          className="voc-button voc-button-primary"
          onClick={handleClone}
          disabled={isCloning}
          data-testid="voc-real-provider-clone-button"
        >
          {isCloning ? 'Cloning…' : 'Clone via ElevenLabs IVC'}
        </button>
        {!capabilities.cloning ? (
          <p
            className="voc-audio-fail"
            data-testid="voc-real-provider-clone-unavailable"
          >
            CLONE UNAVAILABLE: provider disconnected.{' '}
            {status.reason || 'ELEVENLABS_API_KEY is not configured on the backend.'}{' '}
            Clicking Clone will produce an explicit failure; no voice_id is
            invented.
          </p>
        ) : !selectedFile ? (
          <p className="voc-audio-note" data-testid="voc-real-provider-clone-needs-file">
            Select an audio file above. Clicking Clone without a file will
            produce an explicit failure.
          </p>
        ) : null}
        {cloneState.state === REAL_PROVIDER_STATES.FAILED ? (
          <p className="voc-audio-fail" data-testid="voc-real-provider-clone-fail">
            CLONE FAILED: {cloneState.reason}
          </p>
        ) : null}
        {cloneReady ? (
          <div className="voc-audio-verify-grid">
            <div className="voc-status-item">
              <span>Real provider voice_id</span>
              <strong className="voc-audio-signature">{cloneState.voice_id}</strong>
            </div>
            <div className="voc-status-item">
              <span>Requires verification</span>
              <strong>{cloneState.requires_verification ? 'yes' : 'no'}</strong>
            </div>
            <div className="voc-status-item">
              <span>Provider note</span>
              <strong>
                IVC creates a near-instant clone from short samples; it is not
                exact training. Higher-fidelity PVC takes hours, not seconds.
              </strong>
            </div>
          </div>
        ) : null}
      </div>

      <div className="voc-real-provider-preview">
        <h3>2. Real provider preview (TTS)</h3>
        <label className="voc-label">
          Preview text
          <textarea
            rows={3}
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            data-testid="voc-real-provider-preview-text"
          />
        </label>
        <button
          type="button"
          className="voc-button voc-button-primary"
          onClick={handlePreview}
          disabled={isPreviewing}
          data-testid="voc-real-provider-preview-button"
        >
          {isPreviewing ? 'Generating…' : 'Generate ElevenLabs preview'}
        </button>
        {!capabilities.preview ? (
          <p
            className="voc-audio-fail"
            data-testid="voc-real-provider-preview-unavailable"
          >
            PREVIEW UNAVAILABLE: provider disconnected.{' '}
            {status.reason || 'ELEVENLABS_API_KEY is not configured on the backend.'}{' '}
            Clicking Generate will produce an explicit failure; no fallback
            audio is synthesized.
          </p>
        ) : !cloneReady ? (
          <p
            className="voc-audio-fail"
            data-testid="voc-real-provider-preview-needs-voice"
          >
            PREVIEW UNAVAILABLE: no real provider voice_id yet. Clone a source
            first. Clicking Generate without a voice_id will produce an
            explicit failure.
          </p>
        ) : null}
        {previewState.state === REAL_PROVIDER_STATES.FAILED ? (
          <p
            className="voc-audio-fail"
            data-testid="voc-real-provider-preview-fail"
          >
            PREVIEW FAILED: {previewState.reason}
          </p>
        ) : null}
        {previewReady && previewState.url ? (
          <div className="voc-audio-result">
            <audio
              controls
              src={previewState.url}
              data-testid="voc-real-provider-preview-audio"
            />
            <button
              type="button"
              className="voc-button voc-button-secondary"
              onClick={handleExport}
              data-testid="voc-real-provider-export-button"
            >
              Export real provider preview
            </button>
            {exportInfo ? <p className="voc-audio-note">{exportInfo}</p> : null}
            <p className="voc-audio-note">
              ElevenLabs TTS exposes a <code>seed</code> field but does NOT
              guarantee byte-identical output. The exported blob is the EXACT
              audio you just played; it is not synthesized again on export.
            </p>
          </div>
        ) : (
          <p
            className="voc-audio-fail"
            data-testid="voc-real-provider-export-unavailable"
          >
            EXPORT UNAVAILABLE: no real provider preview blob exists yet.
            Export of the real provider path becomes available only after a
            successful ElevenLabs preview. The local deterministic engine is
            never substituted here.
          </p>
        )}
      </div>

      <div className="voc-real-provider-mapping">
        <h3>Deterministic VOC → ElevenLabs mapping</h3>
        <p className="voc-audio-note">
          This mapping is deterministic; the provider audio is not.
        </p>
        <ul className="voc-audio-mapping">
          <li>
            <span>voice_settings.stability</span>
            <strong>{mapping.forwarded.voice_settings.stability}</strong>
          </li>
          <li>
            <span>voice_settings.similarity_boost</span>
            <strong>{mapping.forwarded.voice_settings.similarity_boost}</strong>
          </li>
          <li>
            <span>voice_settings.style</span>
            <strong>{mapping.forwarded.voice_settings.style}</strong>
          </li>
          <li>
            <span>voice_settings.use_speaker_boost</span>
            <strong>
              {mapping.forwarded.voice_settings.use_speaker_boost
                ? 'true'
                : 'false'}
            </strong>
          </li>
          <li>
            <span>speed</span>
            <strong>{mapping.forwarded.speed}</strong>
          </li>
          <li>
            <span>seed (deterministic from VOC params)</span>
            <strong>{mapping.forwarded.seed}</strong>
          </li>
          <li>
            <span>not forwarded</span>
            <strong>
              pitch={mapping.unsupported.pitch}, cadence=
              {mapping.unsupported.cadence}, accent={mapping.unsupported.accent}
            </strong>
          </li>
        </ul>
      </div>
    </section>
  );
}

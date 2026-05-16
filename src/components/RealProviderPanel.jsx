import { useRef, useState } from 'react';

import { REAL_PROVIDER_STATES } from '../hooks/useRealVoiceProvider.js';
import { mapVocToElevenLabsRequest } from '../audio/elevenLabsParameterMapping.js';
import {
  RECORDER_FAIL_KIND,
  RECORDER_STATES,
  useVoiceRecorder,
} from '../hooks/useVoiceRecorder.js';
import RecordingConfirmation from './RecordingConfirmation.jsx';

const RECORDER_RECOVERY_COPY = {
  [RECORDER_FAIL_KIND.PERMISSION_DENIED]: {
    title: 'Microphone access was blocked',
    body:
      'Your browser or operating system blocked microphone access for this site. ' +
      'Open the site permissions in your browser (or System Settings → Privacy → Microphone on macOS / iOS), ' +
      'allow microphone access for this site, then tap Try again.',
  },
  [RECORDER_FAIL_KIND.NO_MICROPHONE]: {
    title: 'No microphone detected',
    body:
      'We couldn’t find a microphone on this device. Connect or enable one, then tap Try again. ' +
      'If you have a headset or external mic, make sure it’s plugged in and selected as the input device.',
  },
  [RECORDER_FAIL_KIND.MIC_IN_USE]: {
    title: 'Microphone is unavailable',
    body:
      'Another app or browser tab may be using your microphone right now. ' +
      'Close other apps that might be holding it (video calls, voice memos, other tabs), then tap Try again.',
  },
  [RECORDER_FAIL_KIND.UNSUPPORTED]: {
    title: 'This browser can’t record audio',
    body:
      'Microphone recording isn’t supported here. Try the latest Chrome, Safari, or Edge over HTTPS, ' +
      'or upload an audio file below instead.',
  },
  [RECORDER_FAIL_KIND.EMPTY_RECORDING]: {
    title: 'Recording was empty',
    body:
      'No audio was captured. Check that your microphone isn’t muted, speak closer to it, then tap Try again.',
  },
  [RECORDER_FAIL_KIND.GENERIC]: {
    title: 'Recording failed',
    body:
      'Something went wrong while recording. Tap Try again — if it keeps failing, reload the page or upload an audio file below.',
  },
};

function getRecoveryCopy(failKind) {
  return (
    RECORDER_RECOVERY_COPY[failKind] || RECORDER_RECOVERY_COPY[RECORDER_FAIL_KIND.GENERIC]
  );
}

// ── Internal constants ────────────────────────────────────────────────────────

const CAPABILITY_LABELS = {
  connected: 'Provider connected',
  cloning: 'Cloning (recording or upload → real voice_id)',
  analysis: 'Voice analysis → VOC parameters',
  preview: 'Real provider preview (TTS)',
  export: 'Export real provider preview',
};

const SOURCE_KIND = {
  NONE: 'none',
  RECORDED: 'recorded',
  UPLOADED: 'uploaded',
};

// Internal confirmation state — sits between "recording done" and "clone".
const CONFIRM_STATE = {
  NONE: 'none',        // no recording yet, or user discarded
  PENDING: 'pending',  // recording stopped, awaiting user decision
  CONFIRMED: 'confirmed', // user pressed "Use This" — clone is now primary
};

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Main panel ────────────────────────────────────────────────────────────────

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

  const recorder = useVoiceRecorder();

  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [activeSource, setActiveSource] = useState(SOURCE_KIND.NONE);
  const [confirmState, setConfirmState] = useState(CONFIRM_STATE.NONE);
  const [previewText, setPreviewText] = useState(
    previewTextProp || 'This is a VOC real provider preview.',
  );
  const [voiceName, setVoiceName] = useState('VOC Source Voice');
  const [exportInfo, setExportInfo] = useState('');
  const [showProviderDetails, setShowProviderDetails] = useState(false);

  const mapping = mapVocToElevenLabsRequest(parameters);

  // ── Recording handlers ──────────────────────────────────────────────────

  async function handleStartRecording() {
    setExportInfo('');
    setConfirmState(CONFIRM_STATE.NONE);
    await recorder.start();
  }

  function handleStopRecording() {
    const r = recorder.stop();
    if (r && r.ok) {
      // onstop is async — UI will react when recorder.state → STOPPED.
      // setConfirmState here so it's ready the moment the blob lands.
      setConfirmState(CONFIRM_STATE.PENDING);
    }
  }

  function handleConfirmRecording() {
    // User chose "Use This Recording"
    setActiveSource(SOURCE_KIND.RECORDED);
    setConfirmState(CONFIRM_STATE.CONFIRMED);
  }

  function handleRetryRecording() {
    recorder.reset();
    setConfirmState(CONFIRM_STATE.NONE);
    if (activeSource === SOURCE_KIND.RECORDED) {
      setActiveSource(uploadedFile ? SOURCE_KIND.UPLOADED : SOURCE_KIND.NONE);
    }
  }

  // ── Upload handler ──────────────────────────────────────────────────────

  function handleFile(event) {
    const file = event.target.files?.[0] || null;
    setUploadedFile(file);
    if (file) {
      setActiveSource(SOURCE_KIND.UPLOADED);
      // If we had a pending confirmation in flight, don't interrupt it —
      // the user may still want to use the recording.
    } else if (activeSource === SOURCE_KIND.UPLOADED) {
      setActiveSource(
        recorder.blob ? SOURCE_KIND.RECORDED : SOURCE_KIND.NONE,
      );
    }
  }

  // ── Clone / preview / export ────────────────────────────────────────────

  function getActiveCloneFile() {
    if (activeSource === SOURCE_KIND.RECORDED && recorder.blob) {
      return recorder.asFile('voc-recording');
    }
    if (activeSource === SOURCE_KIND.UPLOADED && uploadedFile) {
      return uploadedFile;
    }
    if (recorder.blob && !uploadedFile) return recorder.asFile('voc-recording');
    if (uploadedFile && !recorder.blob) return uploadedFile;
    return null;
  }

  async function handleClone() {
    setExportInfo('');
    const file = getActiveCloneFile();
    await cloneFromFile({ file, name: voiceName });
  }

  async function handlePreview() {
    setExportInfo('');
    await generatePreview({ text: previewText, parameters });
  }

  function handleExport() {
    const r = exportPreview();
    setExportInfo(r.ok ? 'Export started.' : `Export unavailable: ${r.reason}`);
  }

  // ── Derived state ───────────────────────────────────────────────────────

  const isCloning = cloneState.state === REAL_PROVIDER_STATES.WORKING;
  const isPreviewing = previewState.state === REAL_PROVIDER_STATES.WORKING;
  const previewReady = previewState.state === REAL_PROVIDER_STATES.READY;
  const cloneReady = cloneState.state === REAL_PROVIDER_STATES.READY;

  const isRecording = recorder.state === RECORDER_STATES.RECORDING;
  const isRequestingMic = recorder.state === RECORDER_STATES.REQUESTING;
  const recordingReady = recorder.state === RECORDER_STATES.STOPPED && !!recorder.blob;
  const recordingFailed = recorder.state === RECORDER_STATES.FAILED;
  const recordingUnsupported = recorder.state === RECORDER_STATES.UNSUPPORTED;

  const effectiveActiveSource =
    activeSource !== SOURCE_KIND.NONE
      ? activeSource
      : recordingReady
      ? SOURCE_KIND.RECORDED
      : uploadedFile
      ? SOURCE_KIND.UPLOADED
      : SOURCE_KIND.NONE;

  const activeSourceDetail = (() => {
    if (effectiveActiveSource === SOURCE_KIND.RECORDED && recorder.blob) {
      const seconds = Math.round((recorder.durationMs || 0) / 100) / 10;
      return `${seconds}s recorded`;
    }
    if (effectiveActiveSource === SOURCE_KIND.UPLOADED && uploadedFile) {
      return uploadedFile.name;
    }
    return null;
  })();

  // Whether the confirmation screen should show (recording just finished
  // and user hasn't decided yet).
  const showConfirmation =
    confirmState === CONFIRM_STATE.PENDING && recordingReady && recorder.url;

  // Whether the Clone step should be visible (user confirmed recording,
  // or they have an uploaded file, or they already confirmed a prior recording).
  const showClone =
    confirmState === CONFIRM_STATE.CONFIRMED ||
    (effectiveActiveSource !== SOURCE_KIND.NONE &&
      confirmState !== CONFIRM_STATE.PENDING);

  return (
    <section
      id="real-provider-controls"
      className="voc-card voc-real-provider-panel"
      data-testid="voc-real-provider-panel"
    >
      {/* ── Section heading ──────────────────────────────────────────────── */}
      <div className="voc-card-heading-row">
        <div>
          <span className="voc-card-subtitle">Voice Cloning</span>
          <h2>Record &amp; Clone</h2>
          <p>
            Record your voice below, then clone it to create a reusable voice
            profile.
          </p>
        </div>
        <span
          className={`voc-status-pill voc-real-provider-state voc-real-provider-state-${
            status.connected ? 'connected' : 'disconnected'
          }`}
          title={status.connected ? 'ElevenLabs connected' : (status.reason || 'ElevenLabs not configured')}
        >
          {status.checked
            ? status.connected
              ? 'CONNECTED'
              : 'DISCONNECTED'
            : 'CHECKING…'}
        </span>
      </div>

      {/* ── Step 1: Record ────────────────────────────────────────────────── */}
      <div
        className="voc-real-provider-record voc-real-provider-record-primary"
        data-testid="voc-real-provider-record-section"
      >
        {/* If recording just finished and user hasn't decided, show confirmation */}
        {showConfirmation ? (
          <RecordingConfirmation
            url={recorder.url}
            durationMs={recorder.durationMs}
            onConfirm={handleConfirmRecording}
            onRetry={handleRetryRecording}
          />
        ) : (
          <>
            <h3>
              {confirmState === CONFIRM_STATE.CONFIRMED
                ? '1. Recording confirmed'
                : '1. Record your voice'}
            </h3>

            {/* Quiet guidance — only shows before any recording */}
            {confirmState === CONFIRM_STATE.NONE && !isRecording && !isRequestingMic && (
              <p className="voc-audio-note">
                Speak naturally for 15–60 seconds. Your browser will ask for
                microphone permission.
              </p>
            )}

            {/* Error states — human-friendly recovery copy with retry path */}
            {recordingUnsupported && (() => {
              const copy = getRecoveryCopy(
                recorder.failKind || RECORDER_FAIL_KIND.UNSUPPORTED,
              );
              return (
                <div
                  className="voc-recorder-recovery"
                  data-testid="voc-recorder-unsupported"
                  data-fail-kind={recorder.failKind || RECORDER_FAIL_KIND.UNSUPPORTED}
                  role="status"
                >
                  <strong className="voc-recorder-recovery-title">{copy.title}</strong>
                  <p className="voc-recorder-recovery-body">{copy.body}</p>
                  {recorder.error && (
                    <p
                      className="voc-recorder-recovery-detail"
                      data-testid="voc-recorder-recovery-detail"
                    >
                      Technical detail: {recorder.error}
                    </p>
                  )}
                </div>
              );
            })()}
            {recordingFailed && (() => {
              const copy = getRecoveryCopy(recorder.failKind);
              return (
                <div
                  className="voc-recorder-recovery"
                  data-testid="voc-recorder-failed"
                  data-fail-kind={recorder.failKind || RECORDER_FAIL_KIND.GENERIC}
                  role="alert"
                >
                  <strong className="voc-recorder-recovery-title">{copy.title}</strong>
                  <p className="voc-recorder-recovery-body">{copy.body}</p>
                  {recorder.error && (
                    <p
                      className="voc-recorder-recovery-detail"
                      data-testid="voc-recorder-recovery-detail"
                    >
                      Technical detail: {recorder.error}
                    </p>
                  )}
                  <div className="voc-recorder-recovery-actions">
                    <button
                      type="button"
                      className="voc-button voc-button-primary"
                      onClick={handleStartRecording}
                      data-testid="voc-recorder-retry"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      className="voc-entry-link"
                      onClick={handleRetryRecording}
                      data-testid="voc-recorder-reset"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Confirmed recording summary (quiet — action is Clone below) */}
            {confirmState === CONFIRM_STATE.CONFIRMED && recordingReady && (
              <div className="voc-confirm-summary" data-testid="voc-confirm-summary">
                <span className="voc-confirm-summary-check">✓</span>
                <span className="voc-confirm-summary-label">
                  {activeSourceDetail} ready to clone
                </span>
                <button
                  type="button"
                  className="voc-entry-link"
                  onClick={handleRetryRecording}
                  data-testid="voc-confirm-rerecord"
                >
                  Re-record
                </button>
                {/* Inline playback so they can still listen */}
                {recorder.url && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio
                    controls
                    src={recorder.url}
                    className="voc-confirm-summary-audio"
                    data-testid="voc-confirm-summary-audio"
                  />
                )}
              </div>
            )}

            {/* Recording controls — hidden once confirmed */}
            {confirmState !== CONFIRM_STATE.CONFIRMED && (
              <div
                className="voc-real-provider-record-controls"
                data-testid="voc-real-provider-record-controls"
              >
                <button
                  type="button"
                  className={`voc-button ${isRecording ? 'voc-button-danger' : 'voc-button-primary'} voc-record-main-btn`}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isRequestingMic || recordingUnsupported}
                  data-testid={isRecording ? 'voc-real-provider-record-stop' : 'voc-real-provider-record-start'}
                >
                  {isRequestingMic
                    ? 'Requesting microphone…'
                    : isRecording
                    ? '⏹ Stop Recording'
                    : '⏺ Record My Voice'}
                </button>
              </div>
            )}

            {/* Live recording indicator */}
            {isRecording && (
              <div
                className="voc-recorder-status"
                data-testid="voc-recorder-status"
                data-state="recording"
              >
                <span>Recording in progress</span>
                <strong>RECORDING…</strong>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Step 2: Upload (secondary — collapsed unless no recording) ───── */}
      <div
        className="voc-real-provider-upload voc-real-provider-upload-secondary"
        data-testid="voc-real-provider-upload-section"
      >
        <button
          type="button"
          className="voc-upload-toggle"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={isRecording}
        >
          {uploadedFile
            ? `📎 ${uploadedFile.name} — change file`
            : '📎 Upload an audio file instead'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFile}
          style={{ display: 'none' }}
          data-testid="voc-real-provider-audio-input"
        />
        {uploadedFile && effectiveActiveSource === SOURCE_KIND.UPLOADED && (
          <div className="voc-confirm-summary">
            <span className="voc-confirm-summary-check">✓</span>
            <span className="voc-confirm-summary-label">{uploadedFile.name} ready</span>
          </div>
        )}
      </div>

      {/* ── Step 3: Clone (only after confirmation or upload) ────────────── */}
      {showClone && (
        <div className="voc-real-provider-clone" data-testid="voc-real-provider-clone-section">
          <h3>2. Clone your voice</h3>

          <label className="voc-label">
            Give this voice a name
            <input
              type="text"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              data-testid="voc-real-provider-voice-name"
            />
          </label>

          <button
            type="button"
            className="voc-button voc-button-primary"
            onClick={handleClone}
            disabled={isCloning || effectiveActiveSource === SOURCE_KIND.NONE}
            data-testid="voc-real-provider-clone-button"
          >
            {isCloning ? 'Creating your voice profile…' : 'Clone My Voice'}
          </button>

          {!capabilities.cloning && (
            <p className="voc-audio-fail" data-testid="voc-real-provider-clone-unavailable">
              Voice cloning requires ElevenLabs to be configured.{' '}
              {status.reason || 'ELEVENLABS_API_KEY is not set on the backend.'}
            </p>
          )}

          {cloneState.state === REAL_PROVIDER_STATES.FAILED && (
            <p className="voc-audio-fail" data-testid="voc-real-provider-clone-fail">
              Clone failed: {cloneState.reason}
            </p>
          )}

          {cloneReady && (
            <div className="voc-audio-verify-grid">
              <div className="voc-status-item">
                <span>Voice profile created</span>
                <strong className="voc-audio-signature">{cloneState.voice_id}</strong>
              </div>
              <div className="voc-status-item">
                <span>Requires verification</span>
                <strong>{cloneState.requires_verification ? 'yes' : 'no'}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Preview (only after clone) ───────────────────────────── */}
      {cloneReady && (
        <div className="voc-real-provider-preview" data-testid="voc-real-provider-preview-section">
          <h3>3. Hear it speak</h3>
          <label className="voc-label">
            Type anything
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
            {isPreviewing ? 'Generating…' : 'Play in My Voice'}
          </button>

          {previewState.state === REAL_PROVIDER_STATES.FAILED && (
            <p className="voc-audio-fail" data-testid="voc-real-provider-preview-fail">
              Preview failed: {previewState.reason}
            </p>
          )}

          {previewReady && previewState.url && (
            <div className="voc-audio-result">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
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
                Export audio
              </button>
              {exportInfo && <p className="voc-audio-note">{exportInfo}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── Provider details (collapsed) ─────────────────────────────────── */}
      <div className="voc-provider-details-toggle-row">
        <button
          type="button"
          className="voc-entry-link"
          onClick={() => setShowProviderDetails((v) => !v)}
          data-testid="voc-provider-details-toggle"
        >
          {showProviderDetails ? 'Hide' : 'Show'} provider details
        </button>
      </div>

      {showProviderDetails && (
        <div className="voc-provider-details" data-testid="voc-provider-details">
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
              detail="not implemented — uploads/recordings are not analyzed into VOC parameters"
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
            Cost / rate-limit truth: when ELEVENLABS_API_KEY is configured and
            the provider is connected, each clone and each preview consumes
            ElevenLabs plan quota. See ElevenLabs pricing for current values.
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
              Reset provider state
            </button>
          </div>

          <div className="voc-real-provider-mapping">
            <h3>VOC → ElevenLabs mapping</h3>
            <p className="voc-audio-note">
              This mapping is deterministic; the provider audio is not.
            </p>
            <ul className="voc-audio-mapping">
              <li>
                <span>stability</span>
                <strong>{mapping.forwarded.voice_settings.stability}</strong>
              </li>
              <li>
                <span>similarity_boost</span>
                <strong>{mapping.forwarded.voice_settings.similarity_boost}</strong>
              </li>
              <li>
                <span>style</span>
                <strong>{mapping.forwarded.voice_settings.style}</strong>
              </li>
              <li>
                <span>use_speaker_boost</span>
                <strong>
                  {mapping.forwarded.voice_settings.use_speaker_boost ? 'true' : 'false'}
                </strong>
              </li>
              <li>
                <span>speed</span>
                <strong>{mapping.forwarded.speed}</strong>
              </li>
              <li>
                <span>seed</span>
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
        </div>
      )}
    </section>
  );
}

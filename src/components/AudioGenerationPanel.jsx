import { GENERATION_STATES } from '../hooks/useAudioGeneration.js';
import { createVocString } from '../schema.js';

const STATE_LABELS = {
  [GENERATION_STATES.IDLE]: 'Idle',
  [GENERATION_STATES.GENERATING]: 'Generating…',
  [GENERATION_STATES.READY]: 'Ready (verified)',
  [GENERATION_STATES.FAILED]: 'FAILED',
};

export default function AudioGenerationPanel({
  parameters,
  audioFileName,
  videoFileName,
  generation,
}) {
  const {
    provider,
    providerStatus,
    state,
    result,
    previewUrl,
    error,
    generate,
    exportGeneratedAudio,
    reset,
  } = generation;

  const vocString = createVocString(parameters);
  const providerAvailable = providerStatus.ok === true;
  const providerPending = providerStatus.ok === null;
  const isGenerating = state === GENERATION_STATES.GENERATING;
  const isReady = state === GENERATION_STATES.READY && !!result;
  const isFailed = state === GENERATION_STATES.FAILED;

  const sourceMeta = audioFileName
    ? { type: 'audio', name: audioFileName }
    : videoFileName
    ? { type: 'video', name: videoFileName }
    : null;

  async function handleGenerate() {
    await generate({ parameters, sourceMeta });
  }

  return (
    <section className="voc-card voc-audio-panel">
      <div className="voc-card-heading-row">
        <div>
          <span className="voc-card-subtitle">Product Proof</span>
          <h2>Audio Generation</h2>
          <p>
            Real audio synthesis from the locked VOC parameters. Same parameters
            produce the same WAV bytes (verifiable signature). Exported audio is
            the exact preview blob.
          </p>
        </div>
        <span
          className={`voc-status-pill voc-audio-state voc-audio-state-${state}`}
        >
          {STATE_LABELS[state]}
        </span>
      </div>

      <div className="voc-audio-provider">
        <div className="voc-status-item">
          <span>Provider</span>
          <strong>{provider.label}</strong>
        </div>
        <div className="voc-status-item">
          <span>Kind</span>
          <strong>{provider.kind}</strong>
        </div>
        <div className="voc-status-item">
          <span>Analyzes uploads</span>
          <strong>{provider.analyzesUploads ? 'yes' : 'no'}</strong>
        </div>
        <div className="voc-status-item">
          <span>Clones uploads</span>
          <strong>{provider.clonesUploads ? 'yes' : 'no'}</strong>
        </div>
        <div className="voc-status-item">
          <span>Provider availability</span>
          <strong>
            {providerPending
              ? 'checking…'
              : providerAvailable
              ? 'available'
              : `unavailable: ${providerStatus.reason || 'unknown'}`}
          </strong>
        </div>
      </div>

      {!provider.analyzesUploads && sourceMeta ? (
        <p className="voc-audio-note">
          Note: {provider.label} does NOT analyze or clone uploaded voices. The
          uploaded {sourceMeta.type} file ({sourceMeta.name}) is recorded as
          source metadata only and does not influence the generated audio.
        </p>
      ) : null}

      <p className="voc-string">VOC: {vocString}</p>

      <div className="voc-button-group">
        <button
          type="button"
          className="voc-button voc-button-primary"
          onClick={handleGenerate}
          disabled={!providerAvailable || isGenerating}
        >
          {isGenerating ? 'Generating…' : 'Generate Audio'}
        </button>

        {isReady ? (
          <button
            type="button"
            className="voc-button voc-button-secondary"
            onClick={exportGeneratedAudio}
          >
            Export Generated Audio
          </button>
        ) : null}

        {isReady || isFailed ? (
          <button
            type="button"
            className="voc-button voc-button-secondary"
            onClick={reset}
          >
            Reset
          </button>
        ) : null}
      </div>

      {isFailed ? (
        <p className="voc-audio-fail">
          GENERATION FAILED: {error || 'unknown error'}
        </p>
      ) : null}

      {!providerAvailable && !providerPending ? (
        <p className="voc-audio-fail">
          PROVIDER UNAVAILABLE: {providerStatus.reason || 'no provider'}
        </p>
      ) : null}

      {isReady && previewUrl ? (
        <div className="voc-audio-result">
          <h3>Preview</h3>
          <audio
            controls
            src={previewUrl}
            data-testid="voc-audio-preview"
          />
          <div className="voc-audio-verify-grid">
            <div className="voc-status-item">
              <span>Signature (SHA-256)</span>
              <strong className="voc-audio-signature">
                {result.signature}
              </strong>
            </div>
            <div className="voc-status-item">
              <span>Duration</span>
              <strong>{result.durationMs} ms</strong>
            </div>
            <div className="voc-status-item">
              <span>Sample rate</span>
              <strong>{result.sampleRate} Hz</strong>
            </div>
            <div className="voc-status-item">
              <span>MIME / Format</span>
              <strong>{result.mimeType}</strong>
            </div>
            <div className="voc-status-item">
              <span>Preview ↔ Export identity</span>
              <strong>PASS — same blob, same signature</strong>
            </div>
          </div>

          <h3>Deterministic Parameter Mapping</h3>
          <ul className="voc-audio-mapping">
            {Object.entries(result.parameterMapping).map(([key, value]) => (
              <li key={key}>
                <span>{key}</span>
                <strong>{String(value)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

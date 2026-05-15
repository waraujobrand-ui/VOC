/**
 * VocEntry — first-load screen.
 *
 * One job: tell the user what this is and give them a single obvious action.
 * Nothing about providers, engines, capability states, or architecture here.
 * Provider connected-status is shown only as a quiet dot — no text noise.
 */
export default function VocEntry({ onStart, providerConnected }) {
  return (
    <div className="voc-entry" data-testid="voc-entry">
      <div className="voc-entry-logo" aria-label="VOC logo">VOC</div>

      <h1 className="voc-entry-headline">Clone your voice.</h1>
      <p className="voc-entry-sub">
        Record a short sample and VOC creates a voice profile you can use to
        generate speech in your voice.
      </p>

      <button
        type="button"
        className="voc-entry-cta"
        onClick={onStart}
        data-testid="voc-entry-start"
      >
        Record My Voice
      </button>

      <p className="voc-entry-secondary">
        Already have an audio file?{' '}
        <button
          type="button"
          className="voc-entry-link"
          onClick={onStart}
          data-testid="voc-entry-upload-link"
        >
          Upload instead
        </button>
      </p>

      {/* Quiet provider dot — visible only, no text block */}
      <div className="voc-entry-provider-dot-row">
        <span
          className={`voc-entry-provider-dot ${providerConnected ? 'voc-entry-provider-dot--connected' : 'voc-entry-provider-dot--off'}`}
          title={providerConnected ? 'ElevenLabs connected' : 'ElevenLabs not connected — configure in Settings'}
        />
        <span className="voc-entry-provider-dot-label">
          {providerConnected ? 'Voice service connected' : 'Voice service not configured'}
        </span>
      </div>
    </div>
  );
}

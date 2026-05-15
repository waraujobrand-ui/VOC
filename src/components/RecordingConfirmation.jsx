/**
 * RecordingConfirmation — shown immediately after recording stops.
 *
 * Answers three questions the user has the moment they hit Stop:
 *   1. Did it work?   → Yes — "Here's your recording"
 *   2. Can I hear it? → Playback auto-shown
 *   3. What do I do?  → Two choices only: "Use This" or "Record Again"
 *
 * Clone action becomes available AFTER the user confirms "Use This".
 * No provider status, no MIME info, no architecture notes here.
 */
export default function RecordingConfirmation({
  url,
  durationMs,
  onConfirm,
  onRetry,
}) {
  const seconds = durationMs > 0
    ? (Math.round(durationMs / 100) / 10).toFixed(1)
    : null;

  return (
    <div className="voc-confirm" data-testid="voc-recording-confirm">
      <div className="voc-confirm-check" aria-hidden="true">✓</div>

      <h2 className="voc-confirm-headline">Here's your recording.</h2>

      {seconds && (
        <p className="voc-confirm-duration" data-testid="voc-confirm-duration">
          {seconds}s captured
        </p>
      )}

      <div className="voc-confirm-player" data-testid="voc-confirm-player">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          controls
          autoPlay={false}
          src={url}
          data-testid="voc-confirm-audio"
        />
      </div>

      <div className="voc-confirm-actions">
        <button
          type="button"
          className="voc-button voc-button-primary voc-confirm-use"
          onClick={onConfirm}
          data-testid="voc-confirm-use"
        >
          Use This Recording
        </button>
        <button
          type="button"
          className="voc-button voc-button-secondary"
          onClick={onRetry}
          data-testid="voc-confirm-retry"
        >
          Record Again
        </button>
      </div>
    </div>
  );
}

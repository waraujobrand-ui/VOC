import {
  ACCENT_OPTIONS,
  PARAMETER_GROUPS,
  VIEWS,
} from '../constants.js';
import { createVocString } from '../schema.js';

export default function ProfileBuilder({
  activeView,
  profileName,
  setProfileName,
  parameters,
  updateParameter,
  saveProfile,
  editingProfileId,
  cancelEditProfile,
}) {
  return (
    <section className="voc-card voc-builder-card">
      <h2>{activeView === VIEWS.PROFILE_BUILDER ? 'Profile Builder' : 'Profile Schema'}</h2>
      <p>Parameters are the locked source of truth for every VOC profile.</p>

      <label className="voc-field">
        Profile name
        <input
          type="text"
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
          placeholder="Name this VOC profile"
        />
      </label>

      <div className="voc-parameter-groups">
        {PARAMETER_GROUPS.map((group) => (
          <div key={group.title} className="voc-parameter-group">
            <h3>{group.title}</h3>
            <div className="voc-parameter-grid">
              {group.keys.map((key) => (
                <label key={key} className="voc-field">
                  <span>{key}</span>
                  {key === 'accent' ? (
                    <select
                      value={parameters.accent}
                      onChange={(event) =>
                        updateParameter(key, event.target.value)
                      }
                    >
                      {ACCENT_OPTIONS.map((accent) => (
                        <option key={accent} value={accent}>
                          {accent}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={parameters[key]}
                        onChange={(event) =>
                          updateParameter(key, event.target.value)
                        }
                      />
                <span className="voc-param-value">{parameters[key]}</span>
              </>
            )}
          </label>
              ))}
            </div>
          </div>
        ))}

        <div className="voc-parameter-group voc-future-analysis-group">
          <h3>Future Analysis</h3>
          <p>
            Analysis traits and estimated parameters are reserved for a real
            analyzer. This demo does not infer values from uploads.
          </p>
        </div>
      </div>

      <p className="voc-string">{createVocString(parameters)}</p>

      <div className="voc-button-group">
        <button type="button" className="voc-button voc-button-primary" onClick={saveProfile}>
          Save Profile
        </button>

        {editingProfileId ? (
          <button
            type="button"
            className="voc-button voc-button-secondary"
            onClick={cancelEditProfile}
          >
            Cancel Edit
          </button>
        ) : null}
      </div>
    </section>
  );
}

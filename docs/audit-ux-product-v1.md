# VOC — UX/Product Audit
**Honest. No softening.**
_Conducted: May 2026_

---

## TL;DR Verdict

VOC is a technically impressive tool dressed in developer clothes, handed to a civilian. The primary emotional experience right now is: "I don't know what I did, I don't know if it worked, and I don't know what to do next." That's not a polish problem. That's a structural problem.

---

## 1. The Core Mental Model Mismatch

A normal person arrives thinking: "I'm going to clone my voice."  
VOC immediately teaches them: "First, understand the system."

That inversion is the root cause of almost every UX problem in the app. The interface currently describes itself rather than guiding the user. The user has to decode what VOC _is_ before they can use what VOC _does_.

| What they'll think | What's actually happening |
|--------------------|--------------------------|
| "I record once and it clones my voice" | They're in a multi-step pipeline with different recording purposes |
| "The Clone button clones my voice" | Clone submits source audio to a provider; it doesn't produce output immediately |
| "Upload is for if I already have a file" | Upload is apparently treated as the primary/equal flow, not a fallback |
| "The app is broken, nothing is working" | The app is in a state that requires configuration before recording matters |
| "I saved my voice profile" | JSON export ≠ saved profile in any way that feels real to a user |

---

## 2. First-Use Experience — Where It Breaks Immediately

The very first question a new user has is: "What do I do first?"

If the answer isn't visible, obvious, and single within 3 seconds, you've already lost most people. Right now the answer appears to be: figure it out yourself.

**Specific first-use failures:**

- **Provider state is exposed before it's relevant.** If the user hasn't configured ElevenLabs and the app surfaces that information upfront, the user thinks the app is broken or incomplete before they've done anything. The emotional read is: "This isn't ready yet." That's a trust-killer on arrival.

- **Upload is elevated to co-equal status with Record.** For a first-time user, Upload should be a secondary path — an "I already have audio" escape hatch. Treating it as a primary entry point splits attention immediately. Users who want to record their voice don't understand why they're being asked about files.

- **There is no single clear start action.** The primary happy path should have exactly one button on first load: something that unambiguously says "start here." If the user has to pick between recording, uploading, choosing a provider, or reviewing their source library before doing anything meaningful, they will freeze.

- **No feedback loop on the first action.** The moment after pressing Record is the most emotionally loaded moment in the entire app. If nothing visible, reassuring, and clear happens — a waveform, a timer, a countdown, a status indicator — the user immediately assumes they did something wrong or the app didn't register their action.

---

## 3. Flow Breakdown — The Happy Path Doesn't Exist Yet

**Intended flow:**
```
Record → Playback → Confirm → Clone → Generate → Save
```

**Actual experienced flow:**
```
Land on app → see technical state indicators → figure out which panel to engage →
choose between record and upload → record without knowing if it worked →
look for playback → can't find or doesn't work intuitively →
wonder if clone button is for this recording or something else →
press Clone → unclear what happened → look for output →
maybe generate something → export JSON and wonder what to do with it
```

The gap between those two flows is the entire product problem.

**Specific flow failures:**

- **"Why am I recording twice?"** This is a symptom of the pipeline being exposed. The user is recording source audio and doesn't know if that's different from training audio, confirmation audio, or preview audio. These need to either collapse into one perceived action or be clearly sequenced with explicit labels like "Step 1 of 3."

- **"Did my voice save?"** There's no persistent, human-readable confirmation that a voice profile exists and is usable. JSON export is a developer artifact. Users need a named, visual "voice card" — something that says "Your voice: [name], recorded [date], ready to use." Until that exists, every session will feel like starting over.

- **"Is it local or ElevenLabs?"** This is being surfaced as a user concern when it should be an implementation detail. The user doesn't care where computation happens. They care that it works. Route the provider selection to settings or an advanced mode. The default should just work.

- **"Clone vs. Generate — what's the difference?"** If a user has to think about this, the labeling has failed. Clone should feel like "create my voice profile." Generate should feel like "use my voice to say something." If both buttons are visible at the same stage, the user will press the wrong one, get a confusing result, and blame themselves.

---

## 4. Information Hierarchy — What's Loud That Should Be Quiet

Everything currently prominent that should be hidden, collapsed, or moved to a settings/advanced panel:

- **Provider truth states** — users don't need to see "ElevenLabs: connected / degraded / unavailable." Show a simple green dot or nothing. Surface errors only when they block action.
- **Deterministic engine notes** — internal architecture commentary. No place in primary UI.
- **JSON import/export** — power-user/developer feature. Move to a menu or settings drawer.
- **Source libraries** — needs to be either the very first thing (a list of saved voices) or the very last thing (after the user has created something). Not in the middle.
- **Capability limitations messaging** — "Analysis unavailable" or "this feature requires X" should never appear as prominent UI states. If something can't run, either hide it or replace it with a clear action: "Connect ElevenLabs to enable this."
- **Technical engine terminology** — words like "deterministic," "provider," "truth-state," "source" are dev-speak. Replace with: "engine," "voice service," "connection status," "recording."

---

## 5. Where the App Leaks Engineering Thinking

- **State is exposed instead of outcome.** The app tells the user the system's status rather than what the user can do. "ElevenLabs provider: connected" → "Ready to clone." "Analysis unavailable" → just hide that section until it's available.

- **The architecture is the navigation.** If the sections or panels map to internal system components (source handler, provider layer, engine) rather than to user tasks (record, review, clone, use), the user is navigating your codebase instead of a product.

- **Error states describe the system, not the user's next step.** Any error message that doesn't end with "here's what to do" is developer output, not user communication.

- **The sequence is pipeline order, not user task order.** Engineers build left-to-right in the order the data flows. Users need to interact in the order that answers their questions: "Did it work? Can I hear it? Is it good enough? What do I do with it?"

---

## 6. What Users Will Misunderstand Immediately

- They'll think the app is broken if provider status is shown and degraded.
- They'll think Record starts a permanent capture (not a draft).
- They'll think Clone produces audio output immediately (it doesn't — it submits for processing).
- They'll think Upload is the main way to use the app (if it's visually primary).
- They'll think their voice is "lost" if there's no visible saved profile.
- They'll think Generate creates a new voice (not that it uses the cloned one to speak text).

---

## 7. Where Trust and Confidence Break

Trust breaks at four specific moments:

1. **On arrival.** If the first thing visible is technical state, error messages, or an unexplained interface, the user's gut reaction is "this isn't ready." They haven't done anything wrong but they already feel like they don't know what they're doing.

2. **After recording.** If there's no immediate, warm confirmation — waveform, playback button, duration, visual success state — the user doesn't believe the recording happened. This is catastrophic because the whole product depends on that moment feeling real.

3. **After Clone.** If Clone doesn't produce a visible, named, tangible artifact — a voice card, a saved profile entry, anything — the user believes nothing happened. The action disappears into the void.

4. **When they return.** If a returning user can't see "my voices" or "my sessions" immediately, they feel like the app forgot them. Continuity of work is a trust signal.

---

## 8. Mobile Usability

Structural issues that will hurt most on mobile:

- Any multi-column or side-panel layout collapses into a scrolling mess that destroys sequencing.
- Tap targets on recording controls need to be large and unambiguous — a small Record button on mobile causes anxiety because the user can't be sure they hit it.
- Status indicators that rely on color alone fail on small screens and for users with color blindness.
- Technical text blocks are unreadable at mobile font sizes and take up screen real estate the user needs for action.
- If there's any modal or overlay, mobile keyboard behavior will likely break it.

---

## 9. What the Interface Should Emotionally Feel Like

Right now it feels like: **a control panel.**  
It should feel like: **a recording booth that someone set up for you.**

The emotional register of a voice cloning app should be: calm, capable, personal, and slightly magical. The user is doing something intimate — capturing their voice. The app should honor that. It should feel like it's paying attention to them, not reporting system telemetry at them.

Practically: warmer language, singular focus at each step, immediate sensory feedback (waveform, playback), and clear progress indicators. The user should always know where they are, what just happened, and what they do next.

---

## 10. The Primary Happy Path (What It Should Be)

This is the only flow that matters until it's perfect:

1. **Land** → one button: "Record My Voice" (no choices, no configuration, no technical state)
2. **Recording screen** → clear visual feedback (waveform, timer, large stop button)
3. **Immediately after stopping** → playback ("Here's what we captured. Listen back.")
4. **Single decision:** "Use this" or "Try again" (no explanation needed)
5. **Clone screen** → one button: "Clone My Voice" with progress indicator, human language ("We're creating your voice profile...")
6. **Success state** → named voice card ("Your voice is ready. Want to hear it speak?")
7. **Generate screen** → text input + play button ("Type anything. Hear it in your voice.")
8. **Save/export** as a natural last step, not a mid-flow escape hatch

Everything else — provider selection, source libraries, JSON tools, engine configuration — exists only in Settings, accessible via a small gear icon, touched only by people who know what they're looking for.

---

## Summary Diagnosis

| Problem | Severity |
|---------|----------|
| No clear primary action on first load | **Critical** |
| No feedback after recording | **Critical** |
| Provider/engine state exposed in primary UI | High |
| Clone vs. Generate confusion | High |
| No persistent voice profile artifact | High |
| Upload treated as co-equal to Record | High |
| Technical terminology throughout | Medium |
| No step sequencing / progress awareness | Medium |
| Mobile layout likely breaks flow sequencing | Medium |
| JSON export as "save" mechanism | Medium |

**The good news:** the technical foundation is solid. The product layer is thin and fixable. None of this requires rebuilding the engine — it requires building a face for the engine that a normal person can trust. That's a UI, copy, and sequencing problem. Not an infrastructure problem.

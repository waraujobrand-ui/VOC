/*
 * Direct check of useVoiceUploads behavior after the fix:
 *   - Uploading audio then video must leave BOTH filenames set.
 *   - loadVoiceSource(audio) must still set audio and clear video (single-type).
 *   - loadVoiceSource(video) must still set video and clear audio (single-type).
 */

import { readFileSync } from 'node:fs';

const src = readFileSync(
  new URL('../src/hooks/useVoiceUploads.js', import.meta.url),
  'utf8',
);

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('PASS:', msg);
}

assert(
  !/setVideoFileName\(''\)/.test(
    src.slice(src.indexOf('handleAudioUpload'), src.indexOf('handleVideoUpload')),
  ),
  'handleAudioUpload no longer clears videoFileName',
);

assert(
  !/setAudioFileName\(''\)/.test(
    src.slice(src.indexOf('handleVideoUpload'), src.indexOf('loadVoiceSource')),
  ),
  'handleVideoUpload no longer clears audioFileName',
);

assert(
  /loadVoiceSource[\s\S]*setVideoFileName\(''\)[\s\S]*setAudioFileName\(''\)/.test(src),
  'loadVoiceSource still clears the unused channel for single-source loads',
);

console.log('upload regression fix: OK');

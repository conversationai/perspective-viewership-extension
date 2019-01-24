// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { scoreText, suggestCommentScore } from './perspective';
import { TuneSettingsManager, TUNE_INSTALL_STATES } from '../tune_settings';
import { ChromeMessageName, ChromeMessage, ChromeMessageEnum,
         ScoreTextRequest, SendFeedbackRequest } from '../messages';
import { environment as devEnvironment } from '../environments/environment';
import { environment as prodEnvironment } from '../environments/environment.prod';
// Hack to prevent Typescript error "Cannot find name 'ga'" when using google
// analytics. The type definition has to be imported directly from types because
// the library itself is loaded dynamically and not through npm.
// For import hack, see discussion on https://stackoverflow.com/a/46463247
// For more information on how google analytics is loaded, see
// https://developers.google.com/analytics/devguides/collection/analyticsjs/
import {} from '@types/google.analytics';


console.log('^^^ background.ts top ^^^');

// Technically a race condition, but should be pretty safe that onInstalled
// function runs before the user loads a page, scores comments, and submits
// feedback.
let sessionId = '<uninitialized>';

chrome.extension.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  console.log('in background.js onMessage handler:', message);
  switch (message.action) {
    case ChromeMessageEnum.SCORE_TEXT:
      // TODO: we don't handle failure here, so if the user did not
      // authenticate during the startup flow, then comment scoring will just
      // fail silently. https://github.com/Jigsaw-Code/tune/issues/119
      scoreText((message as ScoreTextRequest).text).then(scores => {
        sendResponse(scores);
      });
      return true;  // asynchronous sendResponse
    case ChromeMessageEnum.SUBMIT_FEEDBACK:
      const { text, attribute, score, site } = message as SendFeedbackRequest;
      // Response is whether RPC succeeded or not.
      suggestCommentScore(text, attribute, score, site, sessionId)
        .then(() => sendResponse(true))
        .catch(() => sendResponse(false));
      return true;  // asynchronous sendResponse
    default:
      console.error('Unhandled message:', message);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Installed');
  const settings = new TuneSettingsManager();
  settings.initializeSessionId().then(id => sessionId = id);

  // TODO: figure out what behavior we want before prod launch: https://github.com/Jigsaw-Code/tune/issues/169
  //
  // the default value for the Tune install state is newly-installed, so
  // we already send people through the setup flow on initial install. To test
  // the setup flow, we can temporarily uncomment this, or call
  // `chrome.storage.local.clear()` from the javascript debug console for the
  // extension.
  //
  // settings.setTuneInstallState(TUNE_INSTALL_STATES.newlyInstalled);
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('Unloading.');
  chrome.browserAction.setBadgeText({text: ''});
});

const manifest = chrome.runtime.getManifest();
// The prod manifest doesn't have a key, so use that to distinguish dev vs prod.
// TODO: Look into alternatives to this.
const isProd = !manifest.key;
const analyticsKey = isProd ? prodEnvironment.googleAnalyticsKey
                            : devEnvironment.googleAnalyticsKey;

console.log('Loading google analytics for background.ts');

// Google analytics tracking snippet (with spacing and casting added to make
// the TypeScript compiler and linter happy).
// From https://developers.google.com/analytics/devguides/collection/analyticsjs/
(function(i, s, o, g, r, a, m) {i['GoogleAnalyticsObject'] = r; i[r] = i[r] || function() {
(i[r].q = i[r].q || []).push(arguments); }, i[r].l = 1 * (new Date() as any); a = s.createElement(o),
m = s.getElementsByTagName(o)[0]; a.async = 1; a.src = g; m.parentNode.insertBefore(a, m);
})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

ga('create', analyticsKey, 'auto');
// Removes failing protocol check.
// See http://stackoverflow.com/a/22152353/1958200
ga('set', 'checkProtocolTask', () => {});
ga('send', 'pageview', '/background.html');

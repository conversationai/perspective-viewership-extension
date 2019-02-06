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

import { EnabledAttributes } from '../scores';
import { EnabledWebsites, TuneSettingsManager, ThemeType } from '../tune_settings';
import { ChromeMessageEnum, ChromeMessage } from '../messages';
import { SiteTuner } from './site_tuner';
import { DisqusTuner } from './disqus';
import { FacebookTuner } from './facebook';
import { RedditTuner } from './reddit';
import { TwitterTuner } from './twitter';
import { YoutubeTuner } from './youtube';

console.log('content script loaded!');

// Drops subdomains like 'www' from hostname.
function getCurrentMainDomainName(): string {
  return getMainDomainNameUnsafe(window.location.host);
}

// Note: Make sure that 'host' is trusted (e.g. from window.location.host). If
// it's called on e.g. evil.com/?blah=youtube.com, this will be tricked. Also
// supports localhost for karma testing.
// Exported for testing only.
export function getMainDomainNameUnsafe(host: string): string {
  const parts = host.split('.');
  if (parts.length < 2 && parts[0] !== 'localhost:9876') {
    throw new Error('Invalid domain name: ' + host);
  }
  const lastTwoParts = parts.slice(-2);
  return lastTwoParts.join('.');
}

function createCommentTunerForSite(threshold: number,
                                   enabledAttributes: EnabledAttributes,
                                   theme: ThemeType,
                                   subtypesEnabled: boolean)
: SiteTuner|null {
  // TODO: does this handle various "short" URLs? I believe at least 'youtu.be'
  // gets redirected to youtube.com, so that works, but check others.
  const domain = getCurrentMainDomainName();
  switch (domain) {
    case 'youtube.com':
      return new YoutubeTuner(threshold, enabledAttributes, theme, subtypesEnabled);
    case 'reddit.com':
      return new RedditTuner(threshold, enabledAttributes, theme, subtypesEnabled);
    case 'twitter.com':
      return new TwitterTuner(threshold, enabledAttributes, theme, subtypesEnabled);
    case 'facebook.com':
      return new FacebookTuner(threshold, enabledAttributes, theme, subtypesEnabled);
    case 'disqus.com':
      return new DisqusTuner(threshold, enabledAttributes, theme, subtypesEnabled);
    default:
      console.log('site not handled?:', domain);
      return null;
  }
}

async function launchCommentTuner() {
  const settings = new TuneSettingsManager();
  const threshold = await settings.getThreshold();
  const attributes = await settings.getAttributes();
  const subtypesEnabled = await settings.getSubtypesEnabled();
  const enabledWebsites = await settings.getWebsites();
  const globalEnabled = await settings.getEnabled();
  const theme = await settings.getTheme();
  const siteTuner: SiteTuner|null = createCommentTunerForSite(
    threshold, attributes, theme, subtypesEnabled);
  // If the site isn't enabled, we don't launch the tuner, but we still inject
  // the content script. This is so that if the site is enabled later, Tune
  // starts working.
  if (siteTuner) {
    if (globalEnabled && enabledWebsites[siteTuner.siteName]) {
      siteTuner.launchTuner();
    } else {
      siteTuner.disableTuner();
    }
    settings.onFilterSettingsChange((
      thresh, attrs, tuneTheme, subtypesEnabledValue) =>
        siteTuner.onFilterSettingsChange(
          thresh, attrs, tuneTheme, subtypesEnabledValue));
    settings.onEnabledSettingsChange((
      newGlobalEnabled, newEnabledWebsites) =>
        siteTuner.onEnabledSettingsChange(newGlobalEnabled, newEnabledWebsites));
    listenForWebpageRequest(siteTuner.siteName);
  }
}

function listenForWebpageRequest(siteName: string) {
  chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
    console.log('in content_script.ts onMessage handler:', message);
    switch (message.action) {
      case ChromeMessageEnum.GET_CURRENT_WEBSITE:
        sendResponse({siteName});
        return;
      default:
        console.log('Unhandled message:', message);
    }
  });
}

launchCommentTuner();

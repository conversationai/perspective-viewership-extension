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

// TuneSettingsManager contains getters and setters for all Tune settings.
//
// Settings are stored with the Chrome Storage API, which is acessible via all
// page contexts. Notifications of changed settings are received by setting an
// 'onChange' callback.

// TODO: maybe use chrome.storage.sync instead of chrome.storage.local? that
// gives globally-synced settings (if the user has multiple browsers and Chrome
// sync enabled). but may have stricter rate limits or add latency. research
// needed.

import * as uuidv4 from 'uuid/v4';

import { EnabledAttributes } from './scores';
import { environment } from './environments/environment';

export const THRESHOLD_KEY = 'tuneThreshold';
export const ATTRIBUTES_KEY = 'tuneAttributes';
export const THEME_KEY = 'tuneTheme';
export const INSTALL_STATE_KEY = 'tuneInstallState';
export const WEBSITES_KEY = 'tuneWebsites';
export const SESSION_ID_KEY = 'tuneSessionId';
export const ENABLED_KEY = 'tuneEnabled';
// Toxicity subtypes can be enabled for an experimental UX.
export const SUBTYPES_ENABLED_KEY = 'subtypesEnabled';

export const DEFAULT_THRESHOLD = 0.80;

export type TuneInstallStateType = 'newlyInstalled' | 'setupCompleted';
export const TUNE_INSTALL_STATES = {
  newlyInstalled: 'newlyInstalled' as TuneInstallStateType,
  setupCompleted: 'setupCompleted' as TuneInstallStateType
};

export type ThemeType = 'Dotted' | 'Debug';
export const THEMES = {
  dotted: 'Dotted' as ThemeType,
  debug: 'Debug' as ThemeType
};

export const DEFAULT_ATTRIBUTES: EnabledAttributes = {
  identityAttack: true,
  insult: true,
  profanity: true,
  threat: true,
  sexuallyExplicit: true,
};

// This type should correspond to the options in WEBSITE_SETTING_KEYS.
export type WebsiteSettingName = 'youtube' | 'twitter' | 'facebook' | 'reddit' | 'disqus';
export type EnabledWebsites = {
  [key in WebsiteSettingName]: boolean;
};

// Constant for values in the WebsiteSettingName type; must be kept in sync.
export const WEBSITE_NAMES = {
  youtube: 'youtube',
  twitter: 'twitter',
  facebook: 'facebook',
  reddit: 'reddit',
  disqus: 'disqus'
};

export const WEBSITE_SETTING_KEYS = [
  WEBSITE_NAMES.youtube,
  WEBSITE_NAMES.twitter,
  WEBSITE_NAMES.facebook,
  WEBSITE_NAMES.reddit,
  WEBSITE_NAMES.disqus
];

export const DEFAULT_WEBSITES: EnabledWebsites = {
  youtube: true,
  twitter: true,
  facebook: true,
  reddit: true,
  disqus: true
};

// Map keys to names so we can keep our keys styled according to TypeScript
// conventions.
export const WEBSITE_NAME_MAP = {
  youtube: 'YouTube',
  twitter: 'Twitter',
  facebook: 'Facebook',
  reddit: 'Reddit',
  // TODO: Should we be more specific here? Lots of people might not know what disqus is.
  disqus: 'Disqus'
};

export const DEFAULT_THEME = 'Dotted' as ThemeType;
export const DEFAULT_INSTALL_STATE = TUNE_INSTALL_STATES.newlyInstalled;

export const DEFAULT_ENABLED = true;
export const DEFAULT_SUBTYPES_ENABLED = false;

function getStorage<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError || result[key] === undefined) {
        console.log('error getting stored data:', chrome.runtime.lastError);
        resolve(defaultValue);
      } else {
        resolve(result[key]);
      }
    });
  });
}

function saveStorage<T>(key: string, value: T): Promise<void> {
  const settings = {};
  settings[key] = value;
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('error saving value (' + key + '):', chrome.runtime.lastError);
        reject();
      } else {
        if (!environment.production) {
          console.log('saved value (' + key + '):', value);
        }
        resolve();
      }
    });
  });
}

type OnFilterSettingsChangeCallback = (threshold: number, enabledAttributes: EnabledAttributes,
                                       theme: ThemeType, subtypesEnabled: boolean) => void;

type OnEnabledSettingsChangeCallback = (globalEnabled: boolean, enabledWebsites: EnabledWebsites) => void;

// TODO: Consider refactoring this to better support adding more
// settings each time we need to. We might be able to use Typescript native
// getters and setters.
export class TuneSettingsManager {
  constructor() {
    if (!environment.production) {
      console.log('settings manager created.');
    }
  }

  getThreshold(): Promise<number> {
    return getStorage(THRESHOLD_KEY, DEFAULT_THRESHOLD);
  }

  getAttributes(): Promise<EnabledAttributes> {
    return getStorage(ATTRIBUTES_KEY, DEFAULT_ATTRIBUTES);
  }

  getTheme(): Promise<ThemeType> {
    return getStorage(THEME_KEY, DEFAULT_THEME);
  }

  getInstallState(): Promise<TuneInstallStateType> {
    return getStorage(INSTALL_STATE_KEY, DEFAULT_INSTALL_STATE);
  }

  getWebsites(): Promise<EnabledWebsites> {
    return getStorage(WEBSITES_KEY, DEFAULT_WEBSITES);
  }

  getEnabled(): Promise<boolean> {
    return getStorage(ENABLED_KEY, DEFAULT_ENABLED);
  }

  getSubtypesEnabled(): Promise<boolean> {
    return getStorage(SUBTYPES_ENABLED_KEY, DEFAULT_SUBTYPES_ENABLED);
  }

  setThreshold(threshold: number): Promise<void> {
    return saveStorage(THRESHOLD_KEY, threshold);
  }

  setAttributes(attributes: EnabledAttributes): Promise<void> {
    return saveStorage(ATTRIBUTES_KEY, attributes);
  }

  setTheme(theme: ThemeType): Promise<void> {
    return saveStorage(THEME_KEY, theme);
  }

  setTuneInstallState(state: TuneInstallStateType): Promise<void> {
    return saveStorage(INSTALL_STATE_KEY, state);
  }

  setWebsites(websites: EnabledWebsites): Promise<void> {
    return saveStorage(WEBSITES_KEY, websites);
  }

  setEnabled(enabled: boolean): Promise<void> {
    return saveStorage(ENABLED_KEY, enabled);
  }

  setSubtypesEnabled(enabled: boolean): Promise<void> {
    return saveStorage(SUBTYPES_ENABLED_KEY, enabled);
  }

  // Returns session ID. If session ID does not exist, generates and stores it.
  initializeSessionId(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([SESSION_ID_KEY], (result) => {
        if (chrome.runtime.lastError || result[SESSION_ID_KEY] === undefined) {
          const new_id = uuidv4();
          if (!environment.production) {
            console.log('generating new session ID:', new_id);
          }
          saveStorage(SESSION_ID_KEY, new_id);
          resolve(new_id);
        } else {
          resolve(result[SESSION_ID_KEY]);
        }
      });
    });
  }

  async onFilterSettingsChange(callback: OnFilterSettingsChangeCallback): Promise<void> {
    // On any change, return both threshold and enabled attributes. This allows
    // other code to be stateless.
    chrome.storage.onChanged.addListener(async changes => {
      if (changes[THRESHOLD_KEY]) {
        const attributes = await this.getAttributes();
        const theme = await this.getTheme();
        const subtypesEnabled = await this.getSubtypesEnabled();
        callback(
          changes[THRESHOLD_KEY].newValue, attributes, theme, subtypesEnabled);
      } else if (changes[ATTRIBUTES_KEY]) {
        const threshold = await this.getThreshold();
        const theme = await this.getTheme();
        const subtypesEnabled = await this.getSubtypesEnabled();
        callback(
          threshold, changes[ATTRIBUTES_KEY].newValue, theme, subtypesEnabled);
      } else if (changes[THEME_KEY]) {
        const attributes = await this.getAttributes();
        const threshold = await this.getThreshold();
        const subtypesEnabled = await this.getSubtypesEnabled();
        callback(
          threshold, attributes, changes[THEME_KEY].newValue, subtypesEnabled);
      } else if (changes[SUBTYPES_ENABLED_KEY]) {
        const attributes = await this.getAttributes();
        const threshold = await this.getThreshold();
        const theme = await this.getTheme();
        callback(
          threshold, attributes, theme, changes[SUBTYPES_ENABLED_KEY].newValue);
      }
    });
  }

  async onEnabledSettingsChange(callback: OnEnabledSettingsChangeCallback): Promise<void> {
    chrome.storage.onChanged.addListener(async changes => {
      if (changes[ENABLED_KEY]) {
        const websitesEnabled = await this.getWebsites();
        callback(changes[ENABLED_KEY].newValue, websitesEnabled);
      }
      if (changes[WEBSITES_KEY]) {
        const globalEnabled = await this.getEnabled();
        callback(globalEnabled, changes[WEBSITES_KEY].newValue);
      }
    });
  }

}

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

import { TuneSettingsManager, THRESHOLD_KEY, ATTRIBUTES_KEY, THEME_KEY,
         INSTALL_STATE_KEY, WEBSITES_KEY, ENABLED_KEY, SESSION_ID_KEY,
         DEFAULT_ATTRIBUTES, THEMES, TUNE_INSTALL_STATES, DEFAULT_WEBSITES,
         DEFAULT_THRESHOLD, DEFAULT_THEME, DEFAULT_INSTALL_STATE,
         DEFAULT_ENABLED, SUBTYPES_ENABLED_KEY, DEFAULT_SUBTYPES_ENABLED } from './tune_settings';

// Mock out chrome.
import * as chrome from 'sinon-chrome';
window.chrome = chrome;
// Chrome stub.
// Note: The any cast is required since the SinonChrome typing is incomplete
// and is missing the field "accessibilityFeatures".
// TODO: Maybe send them a PR to fix this?
const chromeStub = <typeof chrome.SinonChrome> <any> window.chrome;

describe('TuneSettingsManager tests', () => {
  beforeEach(() => {
    chromeStub.reset();
  });

  it('Test get settings', async() => {
    const testThreshold = 0.4;
    const testAttributes = {
      identityAttack: true,
      insult: false,
      profanity: false,
      threat: true,
      sexuallyExplicit: true,
    };
    const testTheme = THEMES.debug;
    const testInstallState = TUNE_INSTALL_STATES.setupCompleted;
    const testWebsites = {
      youtube: true,
      twitter: true,
      facebook: false,
      reddit: true,
      disqus: false
    };

    const settings = {};
    settings[THRESHOLD_KEY] = 0.4,
    settings[ATTRIBUTES_KEY] = testAttributes;
    settings[THEME_KEY] = testTheme;
    settings[INSTALL_STATE_KEY] = testInstallState;
    settings[WEBSITES_KEY] = testWebsites;

    chromeStub.storage.local.get.yields(settings);
    const tuneSettingsManager = new TuneSettingsManager();

    const threshold = await tuneSettingsManager.getThreshold();
    expect(threshold).toEqual(testThreshold);

    const attributes = await tuneSettingsManager.getAttributes();
    expect(attributes).toEqual(testAttributes);

    const theme = await tuneSettingsManager.getTheme();
    expect(theme).toEqual(testTheme);

    const installState = await tuneSettingsManager.getInstallState();
    expect(installState).toEqual(testInstallState);

    const websites = await tuneSettingsManager.getWebsites();
    expect(websites).toEqual(testWebsites);
  });

  it('Test get settings returns default values if key missing', async() => {
    const settings = {};

    chromeStub.storage.local.get.yields(settings);
    const tuneSettingsManager = new TuneSettingsManager();

    const threshold = await tuneSettingsManager.getThreshold();
    expect(threshold).toEqual(DEFAULT_THRESHOLD);

    const attributes = await tuneSettingsManager.getAttributes();
    expect(attributes).toEqual(DEFAULT_ATTRIBUTES);

    const theme = await tuneSettingsManager.getTheme();
    expect(theme).toEqual(DEFAULT_THEME);

    const installState = await tuneSettingsManager.getInstallState();
    expect(installState).toEqual(DEFAULT_INSTALL_STATE);

    const websites = await tuneSettingsManager.getWebsites();
    expect(websites).toEqual(DEFAULT_WEBSITES);
  });

  it('Test setThreshold', async() => {
    chromeStub.storage.local.set.yields({});
    const tuneSettingsManager = new TuneSettingsManager();

    const settings = {};
    settings[THRESHOLD_KEY] = 0.1;
    await tuneSettingsManager.setThreshold(0.1);
    expect(chrome.storage.local.set.calledWith(settings)).toBeTruthy();
  });

  it('Test setAttributes', async() => {
    chromeStub.storage.local.set.yields({});
    const tuneSettingsManager = new TuneSettingsManager();

    const testAttributes = {
      identityAttack: true,
      insult: false,
      profanity: false,
      threat: true,
      sexuallyExplicit: true,
    };

    const settings = {};
    settings[ATTRIBUTES_KEY] = testAttributes;
    await tuneSettingsManager.setAttributes(testAttributes);
    expect(chrome.storage.local.set.calledWith(settings)).toBeTruthy();
  });

  it('Test setTheme', async() => {
    chromeStub.storage.local.set.yields({});
    const tuneSettingsManager = new TuneSettingsManager();

    const testTheme = THEMES.debug;
    const settings = {};
    settings[THEME_KEY] = testTheme;
    await tuneSettingsManager.setTheme(testTheme);
    expect(chrome.storage.local.set.calledWith(settings)).toBeTruthy();
  });

  it('Test setTuneInstallState', async() => {
    chromeStub.storage.local.set.yields({});
    const tuneSettingsManager = new TuneSettingsManager();

    const testInstallState = TUNE_INSTALL_STATES.setupCompleted;
    const settings = {};
    settings[INSTALL_STATE_KEY] = testInstallState;
    await tuneSettingsManager.setTuneInstallState(testInstallState);
    expect(chrome.storage.local.set.calledWith(settings)).toBeTruthy();
  });

  it('Test setWebsites', async() => {
    chromeStub.storage.local.set.yields();
    const tuneSettingsManager = new TuneSettingsManager();

    const testWebsites = {
      youtube: true,
      twitter: true,
      facebook: false,
      reddit: true,
      disqus: false
    };
    const settings = {};
    settings[WEBSITES_KEY] = testWebsites;
    await tuneSettingsManager.setWebsites(testWebsites);
    expect(chrome.storage.local.set.calledWith(settings)).toBeTruthy();
  });

  it('Test setSubtypesEnabled', async() => {
    chromeStub.storage.local.set.yields();
    const tuneSettingsManager = new TuneSettingsManager();
    const settings = {};
    settings[SUBTYPES_ENABLED_KEY] = true;
    await tuneSettingsManager.setSubtypesEnabled(true);
    expect(chrome.storage.local.set.calledWith(settings)).toBeTruthy();
  });

  it('Test onFilterSettingsChange gets fired when threshold changes',
     async(done: () => void) => {
    const otherSettings = {};
    otherSettings[ATTRIBUTES_KEY] = DEFAULT_ATTRIBUTES;
    otherSettings[THEME_KEY] = DEFAULT_THEME;
    otherSettings[SUBTYPES_ENABLED_KEY] = DEFAULT_SUBTYPES_ENABLED;
    chromeStub.storage.local.get.yields(otherSettings);

    const settings = new TuneSettingsManager();
    await settings.onFilterSettingsChange(
      (threshold, attrs, tuneTheme, subtypesEnabled) => {
        expect(threshold).toEqual(0.2);
        expect(attrs).toEqual(otherSettings[ATTRIBUTES_KEY]);
        expect(tuneTheme).toEqual(otherSettings[THEME_KEY]);
        expect(subtypesEnabled).toEqual(otherSettings[SUBTYPES_ENABLED_KEY]);
        done();
      });
    const change = {};
    change[THRESHOLD_KEY] = {newValue: 0.2};
    chromeStub.storage.onChanged.trigger(change);
  });

  it('Test onFilterSettingsChange gets fired when attributes change',
     async(done: () => void) => {
    const otherSettings = {};
    otherSettings[THRESHOLD_KEY] = DEFAULT_THRESHOLD;
    otherSettings[THEME_KEY] = DEFAULT_THEME;
    otherSettings[SUBTYPES_ENABLED_KEY] = DEFAULT_SUBTYPES_ENABLED;
    chromeStub.storage.local.get.yields(otherSettings);

    const testAttributes = {
      identityAttack: true,
      insult: false,
      profanity: false,
      threat: false,
      sexuallyExplicit: true,
    };
    const settings = new TuneSettingsManager();
    await settings.onFilterSettingsChange(
      (threshold, attrs, tuneTheme, subtypesEnabled) => {
        expect(threshold).toEqual(otherSettings[THRESHOLD_KEY]);
        expect(attrs).toEqual(testAttributes);
        expect(tuneTheme).toEqual(otherSettings[THEME_KEY]);
        expect(subtypesEnabled).toEqual(otherSettings[SUBTYPES_ENABLED_KEY]);
        done();
      });
    const change = {};
    change[ATTRIBUTES_KEY] = {newValue: testAttributes};
    chromeStub.storage.onChanged.trigger(change);
  });

  it('Test onFilterSettingsChange gets fired when theme changes',
     async(done: () => void) => {
    const otherSettings = {};
    otherSettings[THRESHOLD_KEY] = DEFAULT_THRESHOLD;
    otherSettings[ATTRIBUTES_KEY] = DEFAULT_ATTRIBUTES;
    otherSettings[SUBTYPES_ENABLED_KEY] = DEFAULT_SUBTYPES_ENABLED;
    chromeStub.storage.local.get.yields(otherSettings);

    const settings = new TuneSettingsManager();
    await settings.onFilterSettingsChange(
      (threshold, attrs, tuneTheme, subtypesEnabled) => {
        expect(threshold).toEqual(otherSettings[THRESHOLD_KEY]);
        expect(attrs).toEqual(otherSettings[ATTRIBUTES_KEY]);
        expect(tuneTheme).toEqual(THEMES.debug);
        expect(subtypesEnabled).toEqual(otherSettings[SUBTYPES_ENABLED_KEY]);
        done();
      });
    const change = {};
    change[THEME_KEY] = {newValue: THEMES.debug};
    chromeStub.storage.onChanged.trigger(change);
  });

  it('Test onFilterSettingsChange gets fired when subtypesEnabled changes',
     async(done: () => void) => {
    const otherSettings = {};
    otherSettings[THRESHOLD_KEY] = DEFAULT_THRESHOLD;
    otherSettings[ATTRIBUTES_KEY] = DEFAULT_ATTRIBUTES;
    otherSettings[THEME_KEY] = DEFAULT_THEME;
    chromeStub.storage.local.get.yields(otherSettings);

    const settings = new TuneSettingsManager();
    await settings.onFilterSettingsChange(
      (threshold, attrs, tuneTheme, subtypesEnabled) => {
        expect(threshold).toEqual(otherSettings[THRESHOLD_KEY]);
        expect(attrs).toEqual(otherSettings[ATTRIBUTES_KEY]);
        expect(tuneTheme).toEqual(otherSettings[THEME_KEY]);
        expect(subtypesEnabled).toEqual(true);
        done();
      });
    const change = {};
    change[SUBTYPES_ENABLED_KEY] = {newValue: true};
    chromeStub.storage.onChanged.trigger(change);
  });

  it('Test onEnabledSettingsChange gets fired when enabled changes',
     async(done: () => void) => {
    const otherSettings = {};
    otherSettings[WEBSITES_KEY] = DEFAULT_WEBSITES;
    chromeStub.storage.local.get.yields(otherSettings);

    const settings = new TuneSettingsManager();
    await settings.onEnabledSettingsChange((enabled, websitesEnabled) => {
      expect(enabled).toEqual(false);
      expect(websitesEnabled).toEqual(otherSettings[WEBSITES_KEY]);
      done();
    });
    const change = {};
    change[ENABLED_KEY] = {newValue: false};
    chromeStub.storage.onChanged.trigger(change);
  });

  it('Test onEnabledSettingsChange gets fired when enabled websites change',
     async(done: () => void) => {
    const otherSettings = {};
    otherSettings[ENABLED_KEY] = DEFAULT_ENABLED;
    chromeStub.storage.local.get.yields(otherSettings);

    const testWebsites = {
      youtube: true,
      twitter: true,
      facebook: false,
      reddit: true,
      disqus: false
    };

    const settings = new TuneSettingsManager();
    await settings.onEnabledSettingsChange((enabled, websitesEnabled) => {
      expect(enabled).toEqual(otherSettings[ENABLED_KEY]);
      expect(websitesEnabled).toEqual(testWebsites);
      done();
    });
    const change = {};
    change[WEBSITES_KEY] = {newValue: testWebsites};
    chromeStub.storage.onChanged.trigger(change);
  });

  it('Reuses existing session ID', async() => {
    const existingSettings = {};
    existingSettings[SESSION_ID_KEY] = 'testSessionId';
    chromeStub.storage.local.get.yields(existingSettings);

    const settings = new TuneSettingsManager();
    const sessionId = await settings.initializeSessionId();
    expect(sessionId).toEqual(existingSettings[SESSION_ID_KEY]);
  });

  it('Creates new session ID if no session ID is stored', async() => {
    chromeStub.storage.local.get.yields({});

    const settings = new TuneSettingsManager();

    expect(chromeStub.storage.local.set.callCount).toEqual(0);

    const sessionId = await settings.initializeSessionId();

    expect(chromeStub.storage.local.set.callCount).toEqual(1);
    const chromeStorageSettingsArg =
      chromeStub.storage.local.set.getCall(0).args[0];

    expect(chromeStorageSettingsArg.hasOwnProperty(SESSION_ID_KEY)).toBe(true);
    expect(chromeStorageSettingsArg[SESSION_ID_KEY]).toEqual(sessionId);
  });
});

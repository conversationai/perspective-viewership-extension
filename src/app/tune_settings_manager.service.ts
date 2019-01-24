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

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { TuneSettingsManager, TuneInstallStateType, ThemeType, EnabledWebsites } from '../tune_settings';
import { EnabledAttributes } from '../scores';

/**
 * Service for components that want to use the TuneSettingsManager.
 *
 * This is just a convenience so we don't have to construct a new
 * TuneSettingsManager object in every component that wants to use the
 * TuneSettingsManager.
 *
 * Components that inject this service should listen on the observables
 * threshold, attributes, theme, and installState to get the values of the
 * settings when the popup is opened.
 *
 * TODO: Add support for handling settings changes as well.
 */
@Injectable()
export class TuneSettingsManagerService {
  private thresholdSubject = new Subject<number>();
  private attributesSubject = new Subject<EnabledAttributes>();
  private themeSubject = new Subject<ThemeType>();
  private installStateSubject = new Subject<TuneInstallStateType>();
  private websitesSubject = new Subject<EnabledWebsites>();
  private enabledSubject = new Subject<boolean>();
  private subtypesEnabledSubject = new Subject<boolean>();

  threshold = this.thresholdSubject.asObservable();
  attributes = this.attributesSubject.asObservable();
  theme = this.themeSubject.asObservable();
  installState = this.installStateSubject.asObservable();
  websites = this.websitesSubject.asObservable();
  enabled = this.enabledSubject.asObservable();
  subtypesEnabled = this.subtypesEnabledSubject.asObservable();

  private settings = new TuneSettingsManager();

  constructor() {
    this.requestSettingsUpdate();
  }

  requestSettingsUpdate() {
    this.settings.getAttributes().then(attributes => {
      this.attributesSubject.next(attributes);
    });
    this.settings.getTheme().then(theme => {
      this.themeSubject.next(theme);
    });
    this.settings.getInstallState().then(installState => {
      this.installStateSubject.next(installState);
    });
    this.settings.getThreshold().then(threshold => {
      this.thresholdSubject.next(threshold);
    });
    this.settings.getWebsites().then(websites => {
      this.websitesSubject.next(websites);
    });
    this.settings.getEnabled().then(enabled => {
      this.enabledSubject.next(enabled);
    });
    this.settings.getSubtypesEnabled().then(subtypesEnabled => {
      this.subtypesEnabledSubject.next(subtypesEnabled);
    });
  }

  setThreshold(threshold: number): Promise<void> {
    return this.settings.setThreshold(threshold);
  }

  setAttributes(attributes: EnabledAttributes): Promise<void> {
    return this.settings.setAttributes(attributes);
  }

  setTheme(theme: ThemeType): Promise<void> {
    return this.settings.setTheme(theme);
  }

  setTuneInstallState(state: TuneInstallStateType): Promise<void> {
    return this.settings.setTuneInstallState(state);
  }

  setWebsites(websites: EnabledWebsites): Promise<void> {
    return this.settings.setWebsites(websites);
  }

  setEnabled(enabled: boolean): Promise<void> {
    return this.settings.setEnabled(enabled);
  }

  setSubtypesEnabled(subtypesEnabled: boolean): Promise<void> {
    return this.settings.setSubtypesEnabled(subtypesEnabled);
  }
}

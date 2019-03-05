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

import { Component, EventEmitter, OnInit, AfterViewInit, Output } from '@angular/core';
import { TuneSettingsManagerService } from './tune_settings_manager.service';
import { DEFAULT_ATTRIBUTES } from '../tune_settings';
import { EnabledAttributes, ATTRIBUTE_NAME_MAP, SETTING_ATTRIBUTE_NAMES,
         SettingAttributeName } from '../scores';
import { MatCheckbox } from '@angular/material/checkbox';
import { GoogleAnalyticsService, EventAction, EventCategory } from './google_analytics.service';

// Animate in animation length (1s) + longest cascading animation delay (850ms)
const ANIMATE_IN_TIME_MS = 1850;
// Animate out animation length (1s) + longest cascading animation delay (300ms)
const ANIMATE_OUT_TIME_MS = 1300;

@Component({
  selector: 'tune-subtype-settings',
  templateUrl: './subtype_settings.component.html',
  styleUrls: ['./subtype_settings.component.css']
})
export class SubtypeSettingsComponent {
  attributes: EnabledAttributes = DEFAULT_ATTRIBUTES;
  readonly attributeKeys = SETTING_ATTRIBUTE_NAMES;
  readonly attributeNameMap = ATTRIBUTE_NAME_MAP;
  applyAnimateInAnimationClass = false;
  applyAnimateOutAnimationClass = false;
  subtypesEnabled = false;

  @Output() learnMoreClicked = new EventEmitter<void>();

  constructor(private tuneSettingsManagerService: TuneSettingsManagerService,
              private googleAnalyticsService: GoogleAnalyticsService) {
    tuneSettingsManagerService.attributes.subscribe(
      (attributes: EnabledAttributes) => {
        console.log('initializing attributes:', attributes);
        this.attributes = attributes;
      });
    tuneSettingsManagerService.subtypesEnabled.subscribe(
      (subtypesEnabled: boolean) => {
        this.subtypesEnabled = subtypesEnabled;
      });
  }

  animateIn(): Promise<void> {
    // Setting the class triggers the animation.
    this.applyAnimateInAnimationClass = true;

    // Return a Promise so that callers can wait for the animation to finish.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.applyAnimateInAnimationClass = false;
        resolve();
      }, ANIMATE_IN_TIME_MS);
    });
  }

  animateOut(): Promise<void> {
    // Setting the class triggers the animation.
    this.applyAnimateOutAnimationClass = true;

    // Return a Promise so that callers can wait for the animation to finish.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.applyAnimateOutAnimationClass = false;
        resolve();
      }, ANIMATE_OUT_TIME_MS);
    });
  }

  onChecked(attribute: SettingAttributeName) {
    this.logSubtypeToggled(attribute);
    this.tuneSettingsManagerService.setAttributes(this.attributes);
  }

  onLearnMoreClicked() {
    this.learnMoreClicked.emit();
  }

  // TODO: Investigate why space bar/enter don't work automatically for the
  // checkbox in the list items when using ChromeVox.
  sendKeyEventToCheckbox(attribute: SettingAttributeName) {
    this.attributes[attribute] = !this.attributes[attribute];
    // Note: For some reason, the (change) event for the checkbox doesn't get
    // triggered here, so we make the callback to onChecked manually.
    this.onChecked(attribute);
  }

  sendClickEventToCheckbox(event: MouseEvent, checkbox: MatCheckbox,
                           attribute: SettingAttributeName) {
    // Checks if the click event is already contained within the checkbox, to
    // avoid changing the checkbox state twice (the checkbox handles clicks
    // automatically).
    if (!checkbox._elementRef.nativeElement.contains(event.target)) {
      this.attributes[attribute] = !this.attributes[attribute];
      // Note: For some reason, the (change) event for the checkbox doesn't get
      // triggered here, so we make the callback to onChecked manually.
      this.onChecked(attribute);
    }
  }

  updateSubtypesEnabledSetting() {
    this.tuneSettingsManagerService.setSubtypesEnabled(this.subtypesEnabled);
    this.googleAnalyticsService.emitEvent(
      EventCategory.EXPERIMENTAL_FILTER_OPTION,
      this.subtypesEnabled ? EventAction.TOGGLE_ON : EventAction.TOGGLE_OFF);
  }

  logSubtypeToggled(attribute: SettingAttributeName) {
    this.googleAnalyticsService.emitEvent(
      EventCategory.SUBTYPE_OPTION,
      this.attributes[attribute] ? EventAction.TOGGLE_ON : EventAction.TOGGLE_OFF,
      attribute);
  }
}

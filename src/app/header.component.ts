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

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TuneSettingsManagerService } from './tune_settings_manager.service';
import { GoogleAnalyticsService, EventAction, EventCategory } from './google_analytics.service';

@Component({
  selector: 'tune-app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})

export class HeaderComponent {
  @Input() showEnableSwitch = false;
  @Output() titleClicked: EventEmitter<void> = new EventEmitter<void>();

  enabled = true;

  constructor(private tuneSettingsManagerService: TuneSettingsManagerService,
              private googleAnalyticsService: GoogleAnalyticsService) {
    tuneSettingsManagerService.enabled.subscribe(
      enabled => this.enabled = enabled);
  }

  switchClicked() {
    this.tuneSettingsManagerService.setEnabled(this.enabled);
    this.googleAnalyticsService.emitEvent(
      EventCategory.MASTER_ON_OFF,
      this.enabled ? EventAction.TOGGLE_ON : EventAction.TOGGLE_OFF);
  }

  onTitleClicked() {
    this.titleClicked.emit();
    this.googleAnalyticsService.emitEvent(
      EventCategory.TITLE_BUTTON, EventAction.CLICK);
  }
}

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

import { Component, EventEmitter, OnInit, AfterViewInit, Output, ViewChild } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { TuneSettingsManagerService } from './tune_settings_manager.service';
import { GoogleAnalyticsService, Page } from './google_analytics.service';

export enum SettingsPage {
  WEBSITES = 0,
  SUBTYPES = 1
}

@Component({
  selector: 'tune-settings-page',
  templateUrl: './settings_page.component.html',
  styleUrls: ['./settings_page.component.css']
})
export class SettingsPageComponent {
  @Output() settingsClosed = new EventEmitter<void>();
  @ViewChild(MatTabGroup) settingPageTabs: MatTabGroup;

  constructor(private googleAnalyticsService: GoogleAnalyticsService) {}

  selectedTab = SettingsPage.WEBSITES;
  learnMoreOpen = false;

  realignInkBar() {
    this.settingPageTabs.realignInkBar();
  }

  onSettingsClosed() {
    this.settingsClosed.emit();
  }

  onLearnMoreClicked() {
    this.learnMoreOpen = true;
  }

  setTab(settingsPage: SettingsPage) {
    this.selectedTab = settingsPage;
  }

  onTabChange(selectedIndex: number) {
    this.googleAnalyticsService.sendPageView(
      selectedIndex === SettingsPage.WEBSITES ? Page.WEBSITE_SETTINGS
                                              : Page.FILTER_SETTINGS);
  }
}

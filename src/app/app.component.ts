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

import { Component, ElementRef, ViewChild } from '@angular/core';
import { GoogleAnalyticsService, Page } from './google_analytics.service';
import { TuneSettingsManagerService } from './tune_settings_manager.service';
import { TUNE_INSTALL_STATES, TuneInstallStateType } from '../tune_settings';
import { KnobPageComponent, OpenSettingsEvent } from './knob_page.component';
import { HeaderComponent } from './header.component';
import { SetupFlowComponent } from './setup_flow.component';
import { SettingsPageComponent, SettingsPage } from './settings_page.component';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { MatTabGroup } from '@angular/material/tabs';
import { environment } from '../environments/environment';

// TODO: wrap these into a service to avoid importing multiple times.
import { hasAuthToken, getAuthToken } from '../auth';

const DIAL_ICON = 'dial-icon';
const DIAL_ICON_LOCATION = 'ic_nav_dial.svg';
const BRUSH_ICON = 'brush-icon';
const BRUSH_ICON_LOCATION = 'ic_nav-themes.svg';
const ABOUT_ICON = 'about-icon';
const ABOUT_ICON_LOCATION = 'ic_nav-about.svg';
const KNOB_TAB_INDEX = 0;
// The about tab index is different depending on whether or not the themes
// tab is present, which is currently only for dev builds.
const ABOUT_TAB_INDEX = environment.production ? 1 : 2;

@Component({
  selector: 'tune-app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild(HeaderComponent) headerComponent: HeaderComponent;
  @ViewChild(KnobPageComponent) knobComponent: KnobPageComponent;
  @ViewChild(SetupFlowComponent) setupFlow: SetupFlowComponent;
  @ViewChild(MatTabGroup) navigationTabs: MatTabGroup;
  @ViewChild(SettingsPageComponent) settingsPage: SettingsPageComponent;

  title = 'app';
  settingsVisible = false;
  feedbackVisible = false;

  // Flag used in the template to control UI state depending on whether we are
  // in the setup flow (if the install state is newly installed) or not.
  inSetupFlow = false;
  // This flag is to let us know if we have previously run the setup flow when
  // the install state is updated. If we haven't, then we don't have to do anything
  // special about the knobcomponent, but if we have, we need to adjust the
  // bounds of the knob component so the point and click logic works correctly.
  // TODO: Consider using states instead of booleans.
  setupFlowRan = false;

  readonly showThemes = !environment.production;

  constructor(public sanitizer: DomSanitizer,
              private matIconRegistry: MatIconRegistry,
              private tuneSettingsManagerService: TuneSettingsManagerService,
              private googleAnalyticsService: GoogleAnalyticsService) {

    this.googleAnalyticsService.appendGaTrackingCode(document.head);

    // Note: The bypassSecurity function is required to register svg files with
    // the icon registry. Alternate options are not currently available. This is
    // safe because these are all referencing static files that are packaged
    // with the extension.
    matIconRegistry
        .addSvgIcon(DIAL_ICON, sanitizer.bypassSecurityTrustResourceUrl(DIAL_ICON_LOCATION))
        .addSvgIcon(BRUSH_ICON, sanitizer.bypassSecurityTrustResourceUrl(BRUSH_ICON_LOCATION))
        .addSvgIcon(ABOUT_ICON, sanitizer.bypassSecurityTrustResourceUrl(ABOUT_ICON_LOCATION));

    tuneSettingsManagerService.installState.subscribe(
      (installState: TuneInstallStateType) => {
        // We send the user through the setup flow if there's a problem with
        // their token (e.g., it expires, or they manually delete it). It would
        // be better to refactor this to only send the user through the first
        // part of the setup flow for signing in. However, because signing in
        // interrupts the flow (causes the popup to collapse), in practice the
        // user isn't actually forced to walk through the entire flow if they've
        // stepped through it previously.
        hasAuthToken().then(hasToken => {
          if (installState === TUNE_INSTALL_STATES.newlyInstalled
              || !hasToken) {
            this.triggerSetupFlow();
          } else {
            this.logKnobPageView();
            // TODO: hack. this is done so that the animation isn't always
            // running in the background even after the setup flow is completed.
            // would be better to not even load the setupFlow component in the
            // first place.
            this.setupFlow.disableIntroPageAnimation();
            if (this.setupFlowRan) {
              // If the knob page loads after the setup flow, we have to recalculate
              // the bounds of the knob view, because it gets initialized when the
              // setup component is still visible, making the y position off and
              // messing up the point-and-click behavior.
              this.knobComponent.calculateDialCenter();

              // Animate.
              this.knobComponent.animateIn();
            }
          }
        });
      });
  }

  triggerSetupFlow() {
    console.log('Triggering the setup flow!');
    this.inSetupFlow = true;
  }

  finishSetup() {
    // Set the knob component state ahead of making it visible (triggered by
    // this.inSetupFlow = false below).
    this.knobComponent.setPreAnimationState();

    this.inSetupFlow = false;
    this.setupFlowRan = true;

    // Since the navigation tabs are initially hidden during the setup flow,
    // the ink bar doesn't get properly aligned when the UI changes. We have to
    // manually realign it. See https://github.com/angular/material2/pull/10343
    this.navigationTabs.realignInkBar();

    this.tuneSettingsManagerService.setTuneInstallState(
      TUNE_INSTALL_STATES.setupCompleted);
    this.tuneSettingsManagerService.requestSettingsUpdate();
  }

  getBackgroundColor(): string {
    if (this.inSetupFlow) {
      return '#512da8';
    } else if (!this.headerComponent.enabled) {
      return '#212121';
    } else {
      return this.knobComponent.bgChoice;
    }
  }

  onSettingsOpened(openSettingsEvent: OpenSettingsEvent): void {
    this.settingsVisible = true;
    this.googleAnalyticsService.sendPageView(Page.SETTINGS);
    // It shouldn't be possible to get into this state, but just in case.
    if (this.feedbackVisible) {
      console.error(
        'Error: Attempting to open settings page while feedback page is open.');
      this.feedbackVisible = false;
    }

    // Since the settings page tabs are initially hidden, the ink bar doesn't
    // get properly aligned when the page is opened. We have to manually
    // realign it. See https://github.com/angular/material2/pull/10343
    this.settingsPage.realignInkBar();

    // If the desired settings page tab is specified, navigate to that tab.
    if (openSettingsEvent.tab) {
      this.settingsPage.setTab(openSettingsEvent.tab);
      // The valueOf() is required because you can't directly compare two enum
      // objects in Typescript; see https://stackoverflow.com/q/39785320.
      this.googleAnalyticsService.sendPageView(
        openSettingsEvent.tab.valueOf() === SettingsPage.WEBSITES
            ? Page.WEBSITE_SETTINGS
            : Page.FILTER_SETTINGS);
    } else {
      this.googleAnalyticsService.sendPageView(
        this.settingsPage.selectedTab.valueOf() === SettingsPage.WEBSITES
            ? Page.WEBSITE_SETTINGS
            : Page.FILTER_SETTINGS);

    }
  }

  onFeedbackOpened() {
    this.feedbackVisible = true;
    this.googleAnalyticsService.sendPageView(Page.FEEDBACK);
    // It shouldn't be possible to get into this state, but just in case.
    if (this.settingsVisible) {
      console.error(
        'Error: Attempting to open feedback page while settings page is open.');
      this.settingsVisible = false;
    }
  }

  onSettingsClosed(): void {
    this.settingsVisible = false;
  }

  logKnobPageView(): void {
    this.googleAnalyticsService.sendPageView(
      this.knobComponent.currentWebsite === null ? Page.UNSUPPORTED_SITE
                                                 : Page.DIAL);
  }

  onTabChange(selectedIndex: number): void {
    if (selectedIndex === KNOB_TAB_INDEX) {
      this.logKnobPageView();
    } else if (selectedIndex === ABOUT_TAB_INDEX) {
      this.googleAnalyticsService.sendPageView(Page.ABOUT);
    } else {
      this.googleAnalyticsService.sendPageView(Page.THEMES);
    }
  }

  changeToAboutTab(): void {
    this.navigationTabs.selectedIndex = ABOUT_TAB_INDEX;
  }
}

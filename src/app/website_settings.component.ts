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

import { Component, EventEmitter, Input, OnInit, AfterViewInit, Output } from '@angular/core';
import { TuneSettingsManagerService } from './tune_settings_manager.service';
import { DEFAULT_WEBSITES, EnabledWebsites, WebsiteSettingName, WEBSITE_NAME_MAP, WEBSITE_SETTING_KEYS } from '../tune_settings';
import { DomSanitizer } from '@angular/platform-browser';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconRegistry } from '@angular/material/icon';
import { GoogleAnalyticsService, EventAction, EventCategory } from './google_analytics.service';

const YOUTUBE_ICON_LOCATION = 'ic_youtube.svg';
const TWITTER_ICON_LOCATION = 'ic_twitter.svg';
const FACEBOOK_ICON_LOCATION = 'ic_facebook.svg';
const REDDIT_ICON_LOCATION = 'ic_reddit.svg';
const DISQUS_ICON_LOCATION = 'ic_disqus.svg';

// Animate in animation length (1s) + longest cascading animation delay (850ms)
const ANIMATE_IN_TIME_MS = 1850;
// Animate out animation length (1s) + longest cascading animation delay (300ms)
const ANIMATE_OUT_TIME_MS = 1300;

@Component({
  selector: 'tune-website-settings',
  templateUrl: './website_settings.component.html',
  styleUrls: ['./website_settings.component.css']
})
export class WebsiteSettingsComponent {
  websites: EnabledWebsites = DEFAULT_WEBSITES;
  readonly websiteKeys = WEBSITE_SETTING_KEYS;
  readonly websiteNameMap = WEBSITE_NAME_MAP;
  @Input() showPrivacyNotice = false;
  applyAnimateInAnimationClass = false;
  applyAnimateOutAnimationClass = false;

  constructor(private tuneSettingsManagerService: TuneSettingsManagerService,
              private sanitizer: DomSanitizer,
              private matIconRegistry: MatIconRegistry,
              private googleAnalyticsService: GoogleAnalyticsService) {
    // Note: The bypassSecurity function is required to register svg files with
    // the icon registry. Alternate options are not currently available. This is
    // safe because these are all referencing static files that are packaged
    // with the extension.
    matIconRegistry
      .addSvgIcon('youtube', sanitizer.bypassSecurityTrustResourceUrl(YOUTUBE_ICON_LOCATION))
      .addSvgIcon('twitter', sanitizer.bypassSecurityTrustResourceUrl(TWITTER_ICON_LOCATION))
      .addSvgIcon('facebook', sanitizer.bypassSecurityTrustResourceUrl(FACEBOOK_ICON_LOCATION))
      .addSvgIcon('reddit', sanitizer.bypassSecurityTrustResourceUrl(REDDIT_ICON_LOCATION))
      .addSvgIcon('disqus', sanitizer.bypassSecurityTrustResourceUrl(DISQUS_ICON_LOCATION));
    tuneSettingsManagerService.websites.subscribe(
      (websites: EnabledWebsites) => {
        console.log('initializing websites:', websites);
        this.websites = websites;
      });
  }

  onChecked(website: WebsiteSettingName) {
    this.logWebsiteToggled(website);
    this.tuneSettingsManagerService.setWebsites(this.websites);
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

  // TODO: Investigate why space bar/enter don't work automatically for the
  // checkbox in the list items when using ChromeVox.
  sendKeyEventToCheckbox(website: WebsiteSettingName) {
    this.websites[website] = !this.websites[website];
    // Note: For some reason, the (change) event for the checkbox doesn't get
    // triggered here, so we make the callback to onChecked() manually.
    this.onChecked(website);
  }

  sendClickEventToCheckbox(event: MouseEvent, checkbox: MatCheckbox,
                           website: WebsiteSettingName) {
    // Checks if the click event is already contained within the checkbox, to
    // avoid changing the checkbox state twice (the checkbox handles clicks
    // automatically).
    if (!checkbox._elementRef.nativeElement.contains(event.target)) {
      this.websites[website] = !this.websites[website];
      // Note: For some reason, the (change) event for the checkbox doesn't get
      // triggered here, so we make the callback to onChecked() manually.
      this.onChecked(website);
    }
  }

  logWebsiteToggled(website: WebsiteSettingName) {
    this.googleAnalyticsService.emitEvent(
      EventCategory.WEBSITE_OPTION,
      this.websites[website] ? EventAction.TOGGLE_ON : EventAction.TOGGLE_OFF,
      website);
  }
}

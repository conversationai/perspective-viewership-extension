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
import { environment } from '../environments/environment';
import { SettingAttributeName } from '../scores';
import { WebsiteSettingName } from '../tune_settings';
// Hack to prevent Typescript error "Cannot find name 'ga'" when using google
// analytics. The type definition has to be imported directly from types because
// the library itself is loaded dynamically and not through npm.
// For import hack, see discussion on https://stackoverflow.com/a/46463247
// For more information on how google analytics is loaded, see
// https://developers.google.com/analytics/devguides/collection/analyticsjs/
import {} from '@types/google.analytics';

export enum Page {
  APP = '/popup/popup.html',
  UNSUPPORTED_SITE = '/popup/unsupported_site.html',
  DIAL = '/popup/dial.html',
  SETTINGS = '/popup/settings.html',
  WEBSITE_SETTINGS = '/popup/settings/website.html',
  FILTER_SETTINGS = '/popup/settings/filter.html',
  ABOUT = '/popup/about.html',
  FEEDBACK = '/popup/feedback.html',
  THEMES = '/popup/themes.html'
}

/**
 * We use the category to refer to which element was interacted with, per
 * documentation guidelines:
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/events
 */
export enum EventCategory {
  MASTER_ON_OFF = 'master_on_off',
  TITLE_BUTTON = 'header_title',
  SETTINGS_BUTTON = 'settings_button',
  WEBSITE_OPTION = 'website_option',
  EXPERIMENTAL_FILTER_OPTION = 'experimental_filter_option',
  SUBTYPE_OPTION = 'subtype_option',
  SHOW_ALL = 'show_all',
  HIDE_ALL = 'hide_all',
  DIAL = 'dial',
  DISABLED_PAGE_OUTGOING_LINK = 'disabled_page_outgoing_link'
}

/**
 * We use EventAction to refer to the type of interaction, per documentation
 * guidelines:
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/events
 */
export enum EventAction {
  CLICK = 'click',
  TOGGLE_ON = 'toggle_on',
  TOGGLE_OFF = 'toggle_off',
  DIAL_MOVE = 'dial_move'
}

export type OutgoingLinkName = 'https://youtube.com' | 'https://twitter.com'
                               | 'https://facebook.com' | 'https://reddit.com';

/**
 * The documentation says to use this field for 'categorizing events'.
 * We use the label to refer to which option was selected when the
 * EventCategory refers to a list of options.
 */
export type EventLabel = WebsiteSettingName | SettingAttributeName | OutgoingLinkName | null;


/** Service for sending Google Analytics events. */
@Injectable()
export class GoogleAnalyticsService {
  /**
   * Appends the google analytics script to the specified element. This should
   * ordinarily be document.head. This should get triggered by a component since
   * services can be loaded before the page. We do this instead of hard coding
   * into the component html so we can control the key with environment
   * variables.
   */
  public appendGaTrackingCode(hostElement: HTMLElement) {
    ga((tracker) => {
      if (!environment.production) {
        console.log('Google analytics script finished loading!');
        console.log('Client id', tracker.get('clientId'));
      }
    });
    ga('create', environment.googleAnalyticsKey, 'auto');
    // Removes failing protocol check.
    // See http://stackoverflow.com/a/22152353/1958200
    ga('set', 'checkProtocolTask', () => {});
    this.sendPageView(Page.APP);
  }

  /** Records a google analytics pageview. */
  public sendPageView(page: Page): void {
    if (!environment.production) {
      console.log('Sending pageview event for page', page);
    }
    // The third argument here can be arbitrary (but must be set for analytics
    // to log the url; it normaly rejects chrome extension urls). We use it to
    // distinguish different pages in the app.
    ga('send', 'pageview', page);
  }

  /**
   * Emit google analytics event
   * Fire event example:
   *   this.emitEvent("testCategory", "testAction", "testLabel", 10);
   */
  public emitEvent(eventCategory: EventCategory, eventAction: EventAction,
                   eventLabel: EventLabel|null = null,
                   eventValue: number|null = null) {
    if (!environment.production) {
      console.log(
        'Emitting event', eventCategory, eventAction, eventLabel, eventValue);
    }
    ga('send', 'event', {
      eventCategory: eventCategory,
      eventLabel: eventLabel,
      eventAction: eventAction,
      eventValue: eventValue
    });
  }
}

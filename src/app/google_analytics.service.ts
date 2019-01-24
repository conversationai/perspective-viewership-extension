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
// Hack to prevent Typescript error "Cannot find name 'ga'" when using google
// analytics. The type definition has to be imported directly from types because
// the library itself is loaded dynamically and not through npm.
// For import hack, see discussion on https://stackoverflow.com/a/46463247
// For more information on how google analytics is loaded, see
// https://developers.google.com/analytics/devguides/collection/analyticsjs/
import {} from '@types/google.analytics';

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
      console.log('Google analytics script finished loading!');
      console.log('Client id', tracker.get('clientId'));
    });
    ga('create', environment.googleAnalyticsKey, 'auto');
    // Removes failing protocol check.
    // See http://stackoverflow.com/a/22152353/1958200
    ga('set', 'checkProtocolTask', () => {});
    // TODO: Define a set of pages we want to log pageviews for. I think that
    // the third argument here can be arbitrary (but must be set for analytics
    // to log the url; it normaly rejects chrome extension urls).
    ga('send', 'pageview', '/popup/popup.html');
  }

  /**
   * Emit google analytics event
   * Fire event example:
   *   this.emitEvent("testCategory", "testAction", "testLabel", 10);
   */
  public emitEvent(eventCategory: string, eventAction: string,
                   eventLabel: string|null = null,
                   eventValue: number|null = null) {
    ga('send', 'event', {
      eventCategory: eventCategory,
      eventLabel: eventLabel,
      eventAction: eventAction,
      eventValue: eventValue
    });
  }
}

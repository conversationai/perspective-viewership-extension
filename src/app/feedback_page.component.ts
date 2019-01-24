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

import { Component, EventEmitter, Output } from '@angular/core';
// Declares the userfeedback constant for the TypeScript compiler. The variable
// value is loaded via a script.
// TODO: Investigate if there are typings for this, or write our own.
declare const userfeedback;

@Component({
  selector: 'tune-feedback-page',
  templateUrl: './feedback_page.component.html',
  styleUrls: ['./feedback_page.component.css']
})
export class FeedbackPageComponent {
  @Output() backClicked = new EventEmitter<void>();
  feedbackText = '';
  feedbackSubmitted = false;

  goBack() {
    this.backClicked.emit();
  }

  // By default, clicking on <a> elements in chrome extensions doesn't open the
  // link. We have to manually open the link in a new tab. Including the field
  // active: false prevents this from closing the popup.
  openLink(url: string) {
    chrome.tabs.create({url: url, active: false});
  }

  sendFeedback() {
    const manifest = chrome.runtime.getManifest();
    console.log('Sending feedback: ', this.feedbackText);
    userfeedback.api.startFeedback({
      serverUri: 'https://www.google.com/tools/feedback',
      productId: '5085267',
      bucket: '7869076729972496467',
      locale: 'en',
      productVersion: manifest.version_name || manifest.version,
      flow: 'submit',
      report: {
        'description': this.feedbackText
      }
    });
    this.feedbackText = ''; // Clears the textbox so submit is disabled again.
    this.feedbackSubmitted = true;
  }
}

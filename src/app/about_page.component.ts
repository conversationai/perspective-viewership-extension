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

@Component({
  selector: 'tune-about-page',
  templateUrl: './about_page.component.html',
  styleUrls: ['./about_page.component.css']
})
export class AboutPageComponent {

  @Output() showFeedbackClicked = new EventEmitter<void>();

  // By default, clicking on <a> elements in chrome extensions doesn't open the
  // link. We have to manually open the link in a new tab. Including the field
  // active: false prevents this from closing the popup.
  openLink(url: string) {
    chrome.tabs.create({url: url, active: false});
  }

  showFeedback() {
    this.showFeedbackClicked.emit();
  }
}

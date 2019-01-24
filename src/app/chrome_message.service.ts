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
import { ChromeMessage, GetCurrentWebsiteResponse } from '../messages';

/**
 * Service for interacting with the chrome extension message passing API.
 */
@Injectable()
export class ChromeMessageService {
  // TODO: Right now this observable isn't used anywhere but is present to model
  // a way of handling receiving messages from the content script. We should
  // probably create subjects for specific message types, or find a better way
  // of validating types so we don't have to use any.
  private messageSubject = new Subject<any>();
  messageReceived = this.messageSubject.asObservable();

  constructor() {
    this.listenForMessages();
  }

  /**
   * Listens to messages from the content script and notifies observers of
   * messageReceived of the request.
   */
  private listenForMessages(): void {
    console.log('Listening for messages...');
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Checks that the sender was the content script.
      if (sender.tab) {
        this.messageSubject.next(request);
      }
    });
  }

  /**
   * Sends a message to the content script and returns a Promise that will
   * resolve with the response, or reject if there's an error.
   */
  sendMessage(message: ChromeMessage): Promise<GetCurrentWebsiteResponse> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    });
  }

}

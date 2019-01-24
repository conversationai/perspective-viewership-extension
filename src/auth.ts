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

function removeCachedAuthToken(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({'token': token}, () => resolve());
  });
}

export function getAuthToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({interactive: interactive}, (token) => {
      if (token === undefined) {
        console.error('getAccessToken failed:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

// This function tells us if the user already has an auth token. If so, we don't
// need to do the interactive auth flow again.
export function hasAuthToken(): Promise<boolean> {
  return getAuthToken(false)
    .then(unused_token => true)
    .catch(unused_error => false);
}

// If auth token has expired, this automatically tries to get a new one and retry the request.
export function postRequest(url: string, postBody: Object, retry: boolean = true)
: Promise<Object> {
  return getAuthToken(false).then((token) => {
    const options = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
    };
    options['method'] = 'POST';
    options['body'] = JSON.stringify(postBody);
    // TODO: handle network errors.
    return fetch(url, options)
      .then(result => result.json())
      .then(res => {
        if (res.error && res.error.code === 401 && retry) {
          return removeCachedAuthToken(token).then(() => {
            return postRequest(url, postBody, false);
          });
        } else if (res.error) {
          // TODO: inspect error.message to see if it's a language
          // error?
          console.log('API error occurred:', res.error);
          return null;
        } else {
          return res;
        }
      })
      .catch(err => {
        console.error('postRequest fetch error (UNHANDLED):', err);
        throw new Error(err);
      });
  });
}

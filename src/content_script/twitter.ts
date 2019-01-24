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

// Twitter implementation of SiteTuner.

import { SiteTuner, getTextWithSelector } from './site_tuner';
import { THEMES, WEBSITE_NAMES } from '../tune_settings';

// DOM hacking notes:
//
// The TWEET_BLOCK selector handles tweets in search results and tweets from a
// user's profile. After clicking on a tweet to expand it, however, the main
// tweet won't be handled. We could handle this by expanding this selector to
// include .tweet.permalink-tweet, but having the permalinked tweet always
// visible seems right.
const TWEET_BLOCK = '.js-stream-item.stream-item';
const TWEET_TEXT = '.js-tweet-text';


export class TwitterTuner extends SiteTuner {
  siteName = WEBSITE_NAMES.twitter;
  commentBlockSelector = TWEET_BLOCK;
  getTextFromCommentBlock(commentBlock: HTMLElement): string|null {
    return getTextWithSelector(commentBlock, TWEET_TEXT);
  }

  protected getCommentWrapperElement(): string {
     if (this.theme === THEMES.dotted) {
       return 'tune-dotted-twitter-comment-wrapper';
     } else {
       return super.getCommentWrapperElement();
     }
  }
}

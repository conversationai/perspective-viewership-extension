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

// Facebook implementation of SiteTuner.

import { SiteTuner, getTextWithSelector } from './site_tuner';
import { WEBSITE_NAMES } from '../tune_settings';

// DOM hacking notes:
//
// Note that we don't analyze posts themselves, just the comments on them.
const COMMENT_BLOCK = '.UFIComment';
const COMMENT_TEXT = '.UFICommentBody';


export class FacebookTuner extends SiteTuner {
  siteName = WEBSITE_NAMES.facebook;
  commentBlockSelector = COMMENT_BLOCK;
  getTextFromCommentBlock(commentBlock: HTMLElement): string|null {
    return getTextWithSelector(commentBlock, COMMENT_TEXT);
  }
}

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

// Defines Youtube implementation of SiteTuner.

import { SEEN_SELECTOR, UNSEEN_SELECTOR, SiteTuner,
         getTextWithSelector } from './site_tuner';
import { WEBSITE_NAMES } from '../tune_settings';

const YT_COMMENT_BLOCK = 'ytd-comment-thread-renderer, ytd-comment-renderer.ytd-comment-replies-renderer';
const YT_COMMENT_TEXT = '.comment-renderer-text-content, yt-formatted-string.ytd-comment-renderer#content-text';


export class YoutubeTuner extends SiteTuner {
  // Overridden from superclass.
  siteName = WEBSITE_NAMES.youtube;
  commentBlockSelector = YT_COMMENT_BLOCK;
  shouldHandleRemoveMutations = true;

  // Specific to this class.
  private readonly commentContentSelector = 'yt-formatted-string#content-text';
  private readonly seenCommentContentSelector = SEEN_SELECTOR + ' ' + this.commentContentSelector;

  getTextFromCommentBlock(commentBlock: HTMLElement): string|null {
    return getTextWithSelector(commentBlock, YT_COMMENT_TEXT);
  }

  protected handleCommentChanged(mutation: MutationRecord): void {
    // Handle resorting of comments, where the comment block element remains in
    // the DOM but the child text node changes. In this case we want to
    // re-score.
    if (mutation.target instanceof HTMLElement
        && mutation.target.matches(this.seenCommentContentSelector)
        && mutation.removedNodes.length === 1) {
      // Old comment removed. This happens before the new comment gets added, so
      // we pretend that the parent comment block element was removed from the
      // DOM and reset it.
      console.log('Comment removed from sort change');
      this.handleRemovedComment(mutation.target.closest(this.commentBlockSelector));
    } else if (mutation.target instanceof HTMLElement
               && mutation.target.matches(this.commentContentSelector)
               && mutation.addedNodes.length === 1) {
      // New comment added. Check that it has been reset. If so, then we score
      // it.
      const commentBlock = mutation.target.closest(this.commentBlockSelector);
      if (commentBlock.matches(UNSEEN_SELECTOR)) {
        console.log('Comment added from sort change');
        this.handleAddedComment(commentBlock);
      }
    }
  }

}

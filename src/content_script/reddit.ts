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

// Reddit implementation of SiteTuner.

import { WRAPPER_CLASS, WRAPPER_COMMENT_TEXT_ATTR, WRAPPER_SITE_NAME_ATTR,
         SiteTuner } from './site_tuner';
import { THEMES, WEBSITE_NAMES } from '../tune_settings';

// DOM hacking notes:
//
// We use the parent of the comment block nodes as the primary comment unit.
// This way, threads/comments that are hidden due to downvotes still get handled
// when they're expanded (when hidden, the COMMENT_BLOCK is still present, but
// the COMMENT_TEXT is missing and loaded later).
//
// When operating on the DOM, we use the Element.closest method on the text node
// to find the enclosing COMMENT_BLOCK.
//
// We also need to make sure that the original COMMENT_BLOCK stays in the DOM
// since some reddit code seems to depend on it; we can't just use its children
// and nest them under our webcomponent.
const REDDIT_COMMENT_BLOCK = '.Comment';  // Thanks, Reddit!

const REDDIT_SEEN_CLASS = '--tune-reddit-comment';

const MORE_COMMENTS_ID = 'moreComments';
const CONTINUE_THEAD_ID = 'continueThread';

export class RedditTuner extends SiteTuner {
  siteName = WEBSITE_NAMES.reddit;
  commentBlockSelector = null;

  getTextFromCommentBlock(commentBlock: HTMLElement): string|null {
    const paragraphs = [];
    commentBlock.querySelectorAll('p').forEach((e: HTMLElement) => {
      paragraphs.push(e.innerText);
    });
    return paragraphs.join('\n');
  }

  protected adjustCommentBlock(commentBlock: HTMLElement): HTMLElement {
    return commentBlock.querySelector(REDDIT_COMMENT_BLOCK) as HTMLElement;
  }

  getWrapperForAdjustedCommentBlock(commentBlock: HTMLElement): Element|null {
    return commentBlock.closest('.' + WRAPPER_CLASS);
  }

  protected getCommentWrapperElement(): string {
     if (this.theme === THEMES.dotted) {
       return 'tune-dotted-reddit-comment-wrapper';
     } else {
       return super.getCommentWrapperElement();
     }
  }

  // Note that this will fail if there are no comments on the specified reddit
  // page. But we won't need to filter anything in this case anyway
  protected initializeSelectors(): void {
    // Only run if selector hasn't already been initialized.
    if (this.commentBlockSelector !== null) {
      return;
    }
    const comment = document.body.querySelector(REDDIT_COMMENT_BLOCK);
    if (comment === null) {
      console.error('No comments found on the page, so cannot ' +
                    'identify the comment block selector');
      return;
    }
    this.commentBlockSelector = '.' + comment.parentElement.classList[0];
  }

  protected canWrapCommentBlock(commentBlock: HTMLElement): boolean {
    // Don't wrap the comments which say "x more replies" or "Continue this
    // thread". Unfortunately we can't account for this in the selector because
    // the only indication of these are a substring within the id.
    return !(commentBlock.id.includes(MORE_COMMENTS_ID)
             || commentBlock.id.includes(CONTINUE_THEAD_ID));
  }

  // Replaces the original comment element with the webcomponent, and nests the
  // original comment element inside the webcomponent. This is necessary in
  // order to not break expanding and collapsing.
  wrapCommentBlock(commentBlockParent: HTMLElement, commentText: string): Element {
    const commentBlock = this.adjustCommentBlock(commentBlockParent);

    if (!commentBlock || !(commentBlock instanceof HTMLElement)) {
      console.log('couldnt find container for comment:', commentBlockParent, commentBlock);
      return null;
    }

    // Note: when expanding a collapsed thread, the textNode is re-added to the
    // DOM, which causes handleAddedComment to be called, which calls this
    // method. The wrapper is still in place however, so there's no work that
    // needs to be done, we can just return the existing wrapper.
    //
    // We may want to consider instead returning null so that the caller can
    // decide to handle this situation different, but this is pretty specific to
    // one bit of interaction on Reddit at the moment, so not bothering.
    if (commentBlock.classList.contains(REDDIT_SEEN_CLASS)) {
      const wrapper = this.getWrapperForAdjustedCommentBlock(commentBlock);
      console.log('wrapCommentBlock called on previously seen comment (re-expanding?)');
      if (wrapper === null) {
        console.error('BUG: No existing wrapper on comment:',
                      commentText, commentBlockParent);
      }
      return wrapper;
    }

    const wrapperComponent = document.createElement(this.getCommentWrapperElement());
    wrapperComponent.classList.add(WRAPPER_CLASS);
    wrapperComponent.setAttribute(WRAPPER_COMMENT_TEXT_ATTR, commentText);
    wrapperComponent.setAttribute(WRAPPER_SITE_NAME_ATTR, this.siteName);

    commentBlock.classList.add(REDDIT_SEEN_CLASS);

    // We save the next sibling instead of using replaceChild because the comment
    // must be a child of the webcomponent before the webcomponent is added to the
    // DOM in order for ng-template to work properly.
    const parentNode = commentBlock.parentNode;
    const nextSibling = commentBlock.nextSibling;
    parentNode.removeChild(commentBlock);
    wrapperComponent.appendChild(commentBlock);
    parentNode.insertBefore(wrapperComponent, nextSibling);
    return wrapperComponent;
  }

  // Reset the comments to their original DOM structure. This means removing the
  // webcomponent and attaching the Comment element to its parent.
  unwrapCommentBlock(textNode: HTMLElement): boolean {
    const commentBlock = this.adjustCommentBlock(textNode);
    const wrapperComponent = this.getWrapperForAdjustedCommentBlock(commentBlock);
    if (wrapperComponent === null) {
      return false;
    }
    commentBlock.classList.remove(REDDIT_SEEN_CLASS);
    const parentElement = wrapperComponent.parentElement;
    // TODO: seems like this changes the ordering? can we use replaceChild
    // instead?
    parentElement.removeChild(wrapperComponent);
    parentElement.appendChild(commentBlock);
    return true;
  }

}

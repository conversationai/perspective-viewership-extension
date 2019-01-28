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

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
} from '@angular/core';
import { DottedCommentWrapperComponent } from './dotted_comment_wrapper.component';
import { THEMES } from '../../tune_settings';

const THREADLINE_SELECTOR = '.threadline';
const EXPAND_ICON_SELECTOR = '.icon-expand';

const PLACEHOLDER_CLASS = '--tune-reddit-placeholder';
const COLLAPSED_CLASS = '--tune-reddit-collapsed';

/**
 * Component that wraps a Reddit comment in the "dot" UI for tune.
 *
 * This is subclassed as its own component because Reddit comments need some
 * custom CSS handling to account for the thread formatting. Additionally,
 * Reddit comments have custom expand/collapse behavior that needs to be handled.
 */
@Component({
  selector: 'tune-dotted-reddit-comment-wrapper',
  templateUrl: './dotted_comment_wrapper.component.html',
  styleUrls: ['./dotted_comment_wrapper.component.css',
              './reddit_dotted_comment_wrapper.component.css']
})
export class RedditDottedCommentWrapperComponent extends DottedCommentWrapperComponent
    implements OnInit {

  threadParent: HTMLElement;
  threadIdentifyingClass: string;

  collapseButtonObserver: MutationObserver;
  expandButtonObserver: MutationObserver;

  collapseButtonSelector: string;

  customPlaceholderClasses = [PLACEHOLDER_CLASS];
  customHorizontalUIWrapperClass = '--tune-reddit-horizontalUIWrapper';

  // Whether setupSelectors() has been successfully called.
  selectorsInitialized = false;

  // Since we have disabled ngZone, we must do change detection manually, so we
  // inject ChangeDetectorRef.
  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected elementRef: ElementRef) {
    super(changeDetectorRef);
  }

  ngOnInit() {
    // This allows CSS defined for this component to apply to this element.
    // This is a hack that takes advantage of Angular's attribute specific CSS
    // encapsulation. We should look into alternatives.
    const commentElement = this.commentWrapper.nativeElement.querySelector('.Comment');
    for (let i = 0; i < Object.keys(THEMES).length; i++) {
      commentElement.setAttribute('_ngcontent-c' + i, '');
    }

    const currentlyCollapsed =
      this.elementRef.nativeElement.querySelector(EXPAND_ICON_SELECTOR) !== null;

    this.findThreadParent();

    if (currentlyCollapsed) {
      this.setupExpandButton();
    } else {
      if (!this.setupSelectors()) {
        console.error('setupSelectors failed, stopping.');
        return;
      }
      this.setupCollapseButtons();
    }

    this.setupCollapseButtonObserver();
    this.setupExpandButtonObserver();
  }

  /**
   * Finds the DOM element for the full reddit thread so we can observe
   * elements outside this one for changes (such as threadlines appearing).
   */
  findThreadParent() {
    // Looking at the 4th ancestor node is messy, but reddit keeps changing its selectors so we need to just
    // step up the DOM.
    this.threadParent = this.elementRef.nativeElement.parentElement.parentElement.parentElement.parentElement;
  }

  setupSelectors(): boolean {
    // DOM hacking notes: The thread collapse element (the "thread line") is not
    // part of the comment element but actually consists of several different
    // DOM elements, some of which are sibling elements, and others which are
    // part of previous comment elements. To find all the "pieces" of the thread
    // collapse element button, we have to first look at the collapse button which
    // is a sibling, and then query for the other collapse buttons using the class
    // of the sibling.
    const previousSibling = this.elementRef.nativeElement.previousSibling;
    if (previousSibling === null || previousSibling.lastElementChild === null) {
      // Note: This happens if a comment is initially collapsed / "hidden by default"
      // due to low upvotes. In this case we should not be calling setupSelectors()
      // until the comment is expanded for the first time and the threadlines
      // are present in the DOM.
      console.error('Cannot find threadline DOM elements. Could the comment be collapsed?',
                    this.elementRef.nativeElement);
      return false;
    }
    const siblingCollapseButton =
      previousSibling.lastElementChild.querySelector(THREADLINE_SELECTOR).parentElement;
    this.threadIdentifyingClass = siblingCollapseButton.classList[0];
    this.collapseButtonSelector =
      '.' + this.threadIdentifyingClass + '.' + siblingCollapseButton.classList[1];

    this.selectorsInitialized = true;
    return true;
  }

  setupCollapseButtons() {
    const collapseButtons = this.threadParent.querySelectorAll(this.collapseButtonSelector);
    collapseButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handleCommentThreadCollapsed();
      });
    });
  }

  setupExpandButton() {
    const expandButton = this.elementRef.nativeElement.querySelector(EXPAND_ICON_SELECTOR).parentElement;
    expandButton.addEventListener('click', () => {
      this.handleCommentThreadExpanded();
    });
  }

  // We setup a MutationObserver for the collapse buttons, since they are not
  // present in the DOM when the thread is collapsed, and get added after a
  // brief delay when the thread is expanded.
  setupCollapseButtonObserver() {
    this.collapseButtonObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(addedNode => {
          if (!(addedNode instanceof HTMLElement)) {
            return;
          }
          if (addedNode.querySelector(this.collapseButtonSelector) !== null) {
            const collapseButton = addedNode.querySelector(this.collapseButtonSelector);
            collapseButton.addEventListener('click', () => {
              this.handleCommentThreadCollapsed();
            });
          }

          // If the comment is initially collapsed, then we can't setup the
          // collapse selectors related to the threadlines until they appear in
          // the DOM.
          if (!this.selectorsInitialized
              && addedNode.querySelector(THREADLINE_SELECTOR) !== null
              && this.elementRef.nativeElement.previousSibling.contains(addedNode)) {
            if (!this.setupSelectors()) {
              console.error('Setup selectors failed after first expand.');
            }
          }
        });
      });
    });
    this.collapseButtonObserver.observe(
      this.threadParent, {subtree: true, childList: true});
  }

  // We setup a MutationObserver for the expand button in the comment, since it
  // is not present in the DOM when the thread is expanded, and is added after a
  // brief delay when the thread is collapsed.
  setupExpandButtonObserver() {
    this.expandButtonObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(addedNode => {
          if (!(addedNode instanceof HTMLElement)) {
            return;
          }
          if (addedNode.querySelector(EXPAND_ICON_SELECTOR) !== null) {
            const expandButton = addedNode.querySelector(EXPAND_ICON_SELECTOR).parentElement;
            expandButton.addEventListener('click', () => {
              this.handleCommentThreadExpanded();
            });
          }
        });
      });
    });
    this.expandButtonObserver.observe(
      this.elementRef.nativeElement, {subtree: true, childList: true});
  }

  handleCommentThreadCollapsed() {
    this.customPlaceholderClasses = [PLACEHOLDER_CLASS, COLLAPSED_CLASS];
    if (!this.changeDetectorRef['destroyed']) {
      this.changeDetectorRef.detectChanges();
    }
    console.log('Collapsed!');
  }

  handleCommentThreadExpanded() {
    this.customPlaceholderClasses = [PLACEHOLDER_CLASS];
    if (!this.changeDetectorRef['destroyed']) {
      this.changeDetectorRef.detectChanges();
    }
    console.log('Expanded!');
  }
}

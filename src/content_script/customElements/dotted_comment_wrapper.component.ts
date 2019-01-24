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
  Input,
  NgZone,
  OnInit,
  ViewChild
} from '@angular/core';
import { TUNE_STATE } from '../site_tuner';
import { colorGradient } from '../../scores';
import { ChromeMessageEnum } from '../../messages';

const BUTTON_TEXT_SHOW = 'Show';
const BUTTON_TEXT_HIDE = 'Hide';

// There's a weird bug that happens on twitter where the scrollHeight is
// incorrectly greater than the clientHeight by 5 px, which causes janky
// animation when expanding a collapsed comment.
const SCROLL_HEIGHT_BUG_DIFF_PX = 5;

/**
 * Component wrapper with the "dot" UI for tune.
 */
@Component({
  selector: 'tune-dotted-comment-wrapper',
  templateUrl: './dotted_comment_wrapper.component.html',
  styleUrls: ['./dotted_comment_wrapper.component.css']
})
export class DottedCommentWrapperComponent {
  @Input() filterMessage = '';
  @Input() feedbackQuestion = '';
  @Input() maxScore = 0;

  // These variables are for including in submitted feedback.
  @Input() maxAttribute = '';
  // NOTE: This is free-form comment text from the internet! Be mindful of
  // security issues in how this data is handled.
  @Input() commentText = '';
  @Input() siteName = '';

  @Input() buttonText = BUTTON_TEXT_SHOW;

  @ViewChild('commentWrapper') commentWrapper: ElementRef;

  // Customizable classes that are platform specific, override in subclass.
  customHorizontalUIWrapperClass = '';
  customPlaceholderClasses: string[] = [];
  customCommentWrapperClass = '';

  // Note: this is the raw value of the state of the comment (shown or
  // filtered). There's a `tuneState` @Input attribute defined below that wraps
  // this value with getters/setters to handle transitions (i.e. handling
  // expand/collapse transitions).
  rawTuneState = TUNE_STATE.show;

  // True if the comment has been revealed by the user via the "Show" button.
  commentVisible = false;

  // True if the user sent feedback about the comment.
  feedbackSent = false;

  // True if the grey background state should be aplied.
  hasHoverState = false;

  // Flag for the presence of the weird Twitter scroll height bug.
  hasScrollHeightBug = false;

  // Whether the comment should have CSS styles applied that make it invisible
  // to screenreaders. This field is necessary because we are using scrollHeight
  // for animation. If we just bind the CSS styles based on whether the comment
  // is hidden, then our animations won't work.
  hideCommentForA11y = false;

  // For data binding.
  readonly TUNE_STATE = TUNE_STATE;

  // Since we have disabled ngZone, we must do change detection manually, so we
  // inject ChangeDetectorRef.
  constructor(protected changeDetectorRef: ChangeDetectorRef) {
  }

  // Note: DO NOT RENAME WITHOUT UPDATING THE CSS.
  // This gets renamed as tune-state in the webcomponent transformation via
  // angular elements and so setting this property effectively acts as a
  // custom attribute, which is important for the CSS. Also note that this CSS
  // attribute hack will not work with regular data binding in an Angular
  // project; accomplishing the same thing in that context requires building a
  // custom Directive with the selector '[tune-state]'.
  @Input()
  set tuneState(newState: string) {
    if (newState === this.rawTuneState) {
      return;
    }
    console.log('tuneState change:', this.rawTuneState, ' --> ', newState);
    if (newState === TUNE_STATE.filter) {  // Hide comment.
      this.collapseWrappedComment();
    } else if (newState === TUNE_STATE.show) {  // Show comment
      this.expandWrappedComment();
    } else {
      console.error('BUG??', newState, this);
      return;
    }
    this.rawTuneState = newState;
  }

  get tuneState(): string {
    return this.rawTuneState;
  }

  // Note: this theme expands and collapses the comment with a height transition
  // so that the comment's verticle space changes smoothly. Transitions on
  // height must be explicit, they can't be done with 'auto' values. But we also
  // don't want to keep track of the height of the wrapped element because it
  // can change (e.g. when the user expands replies, or expands a long comment).
  // So we use this hack: we explicitly set the height when needed for the
  // transition, and then unset it afterwards. This is based on the technique
  // described here:
  // https://css-tricks.com/using-css-transitions-auto-dimensions/
  collapseWrappedComment(): void {
    const comment = this.commentWrapper.nativeElement;
    this.hasScrollHeightBug = comment.scrollHeight - comment.clientHeight === SCROLL_HEIGHT_BUG_DIFF_PX;

    // Set explicit height so transitions work.
    comment.style.height = comment.scrollHeight + 'px';
    console.log('collapse 1: setting initial height to:',
                comment.scrollHeight, comment.style.height);

    // Collapse comment once the previous change has taken effect.
    requestAnimationFrame(() => {
      // requestAnimationFrame won't run on background tabs that aren't visible,
      // so it's possible that multiple collapse/expand calls happen but this
      // callback doesn't get completed until the user switches back to the tab.
      // So, we check that we should still filter the comment before setitng
      // height to 0.
      if (this.rawTuneState === TUNE_STATE.filter && !this.commentVisible) {
        comment.style.height = '0';
        console.log('collapse 2: setting height to 0 now', comment.style.height);
      } else {
        comment.style.height = null;
        console.log('collapse 2: whoops, no longer filter state. unsetting height.', comment.style.height);
      }
    });
  }

  expandWrappedComment(): void {
    const comment = this.commentWrapper.nativeElement;
    this.unhideCommentFromA11y(comment);

    const targetHeight =
      (comment.scrollHeight - (this.hasScrollHeightBug ? SCROLL_HEIGHT_BUG_DIFF_PX : 0)) + 'px';
    // Start transition.
    console.log('expand 1: initial height should be 0 already:',
                comment.style.height, '; setting to height:', targetHeight);
    comment.style.height = targetHeight;
    // Once transition is complete, undo the explicit height setting so later
    // height changes don't break the layout (expanding full comment text,
    // viewing replies, writing a reply, etc.).
    const undoExplicitHeight = () => {
      comment.removeEventListener('transitionend', undoExplicitHeight);
      // Unlike the requestAnimationFrame issue above, transitionend events do
      // happen in background tabs. However, we still need to recheck the state
      // because if the user is changing visibility quickly, the transitionend
      // callback may only happen after the user has collapsed the wrapper
      // again, in which case we shouldn't null the height.
      if (this.rawTuneState === TUNE_STATE.show || this.commentVisible) {
        comment.style.height = null;
        console.log('expand 2: undoing explicit height:', comment.style.height,
                    '; actual height now:', comment.scrollHeight, comment.clientHeight, comment.offsetHeight);
      } else {
        comment.style.height = 0;
        console.log('expand 2: whoops, no longer show state. setting height to 0?', comment.style.height,
                    '; actual height now:', comment.scrollHeight, comment.clientHeight, comment.offsetHeight);
      }
    };
    comment.addEventListener('transitionend', undoExplicitHeight);
  }

  commentStyleTransitionEnd() {
    // Apply CSS classes that hide the comment from screenreaders after the
    // hide comment transition completes.
    if (this.rawTuneState === TUNE_STATE.filter && !this.commentVisible) {
      this.hideCommentForA11y = true;
      this.changeDetectorRef.detectChanges();
    }
  }

  // To hide a comment from the screenreader, it needs to have display: none set
  // as a property. However, we have to undo this setting before doing expand
  // animations, or the scrollheight won't be correct.
  unhideCommentFromA11y(comment: HTMLElement) {
    this.hideCommentForA11y = false;
    comment.style.height = '0px';
    this.changeDetectorRef.detectChanges();
  }

  mouseEnterCallback() {
    this.hasHoverState = true;
    this.changeDetectorRef.detectChanges();
  }

  mouseLeaveCallback() {
    if (!this.commentVisible) {
      this.hasHoverState = false;
    }
    this.changeDetectorRef.detectChanges();
  }

  // If the comment is hidden, treat the entire horizontal wrapper like
  // the "show" button. Don't do this for the "hide" case because we don't
  // want clicking on the feedback buttons to collapse the comment. Note that
  // this case is only handled for click events, not keyboard events, to prevent
  // double events from getting fired by the a11y framework and the keypress.
  // When the user is using the keyboard to interact with tune, the target size
  // isn't an issue, so they can just use the "show" button.
  horizontalWrapperClicked(event: Event) {
    if (!this.commentVisible) {
      this.showButtonClicked(event);
    }
  }

  showButtonClicked(event: Event) {
    if (this.commentVisible) {
      this.buttonText = BUTTON_TEXT_SHOW;
      this.commentVisible = false;
      this.collapseWrappedComment();
    } else {
      this.buttonText = BUTTON_TEXT_HIDE;
      this.commentVisible = true;
      this.expandWrappedComment();

      // TODO: After expanding a comment, we should shift focus to the comment
      // body for a11y.
    }
    this.changeDetectorRef.detectChanges();
    // Stop propagation so that the click event doesn't go to the horizontal
    // wrapper.
    event.stopPropagation();
  }

  // TODO: refactor so this can be shared by other themes.
  sendFeedback(isAttribute: boolean) {
    console.log('feedback button clicked:', isAttribute);
    chrome.runtime.sendMessage({
      action: ChromeMessageEnum.SUBMIT_FEEDBACK,
      text: this.commentText,
      attribute: this.maxAttribute,
      score: isAttribute ? 1 : 0,
      site: this.siteName,
    }, (success) => console.log('sending feedback success:', success) );
    this.feedbackSent = true;
    this.changeDetectorRef.detectChanges();

    // TODO: Figure out how to focus on the "thanks for your feedback" message
    // here, for a11y. Just calling .focus() doesn't seem to work.
  }

  getColor(score: number): string {
    return colorGradient(score);
  }

  getA11yDescription(): string {
    return this.commentVisible ? 'Tune hidden comment expanded by user'
                               : 'Comment hidden by tune: ' + this.filterMessage;
  }
}

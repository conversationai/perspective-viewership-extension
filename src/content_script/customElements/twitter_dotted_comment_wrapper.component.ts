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

/**
 * This allows CSS defined in the stylesheet for this component to apply to
 * the specified element.
 *
 * This is a hack that takes advantage of Angular's attribute specific CSS
 * encapsulation.
 */
function addAngularCSSAttributes(element: HTMLElement) {
  for (let i = 0; i < Object.keys(THEMES).length; i++) {
    element.setAttribute('_ngcontent-c' + i, '');
  }
}

/**
 * Component that wraps a tweet in the "dot" UI for tune.
 *
 * This is subclassed as its own component because tweets need some
 * custom CSS handling to account for the thread formatting.
 */
@Component({
  selector: 'tune-dotted-twitter-comment-wrapper',
  templateUrl: './dotted_comment_wrapper.component.html',
  styleUrls: ['./dotted_comment_wrapper.component.css',
              './twitter_dotted_comment_wrapper.component.css']
})
export class TwitterDottedCommentWrapperComponent extends DottedCommentWrapperComponent
    implements OnInit {
  customPlaceholderClasses = ['--tune-twitter-placeholder'];
  customHorizontalUIWrapperClass = '--tune-twitter-horizontalUIWrapper';

  // Since we have disabled ngZone, we must do change detection manually, so we
  // inject ChangeDetectorRef.
  constructor(protected changeDetectorRef: ChangeDetectorRef,
              protected elementRef: ElementRef) {
    super(changeDetectorRef);
  }

  ngOnInit() {
    const commentElement = this.commentWrapper.nativeElement.querySelector('.tweet');
    addAngularCSSAttributes(commentElement);

    // We need to be able to change the CSS style of the :before and :after
    // pseudo elements of the ThreadedConversation-tweet ancestor element, which
    // misbehave when the comment is hidden.
    const threadedConversationTweetElement =
      this.commentWrapper.nativeElement.closest('.ThreadedConversation-tweet');
    if (threadedConversationTweetElement !== null) {
      addAngularCSSAttributes(threadedConversationTweetElement);
    }
  }
}

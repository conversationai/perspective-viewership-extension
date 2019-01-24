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

import { NgModule, Injector } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { DottedCommentWrapperComponent } from './dotted_comment_wrapper.component';
import { DebugCommentWrapperComponent } from './debug_comment_wrapper.component';
import { RedditDottedCommentWrapperComponent } from './reddit_dotted_comment_wrapper.component';
import { TwitterDottedCommentWrapperComponent } from './twitter_dotted_comment_wrapper.component';
import { createCustomElement } from '@angular/elements';

@NgModule({
  imports: [BrowserModule],
  declarations: [
    DottedCommentWrapperComponent,
    DebugCommentWrapperComponent,
    RedditDottedCommentWrapperComponent,
    TwitterDottedCommentWrapperComponent
  ],
  entryComponents: [
    DottedCommentWrapperComponent,
    DebugCommentWrapperComponent,
    RedditDottedCommentWrapperComponent,
    TwitterDottedCommentWrapperComponent
  ],
})
export class CustomElementsModule {
  constructor(private injector: Injector) {
    const dottedElement = createCustomElement(
      DottedCommentWrapperComponent, { injector });
    customElements.define('tune-dotted-comment-wrapper', dottedElement);
    const redditDottedElement = createCustomElement(
      RedditDottedCommentWrapperComponent, { injector });
    customElements.define('tune-dotted-reddit-comment-wrapper', redditDottedElement);
    const twitterDottedElement = createCustomElement(
      TwitterDottedCommentWrapperComponent, { injector });
    customElements.define('tune-dotted-twitter-comment-wrapper', twitterDottedElement);
    const debugElement = createCustomElement(
      DebugCommentWrapperComponent, { injector });
    customElements.define('tune-debug-comment-wrapper', debugElement);
  }

  ngDoBootstrap() {}
}

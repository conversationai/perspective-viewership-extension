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

import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TUNE_STATE } from '../site_tuner';
import { getIsElementVisible, sendClickEvent, waitForTimeout } from '../../test_util';

import { DottedCommentWrapperComponent } from './dotted_comment_wrapper.component';
import { RedditDottedCommentWrapperComponent } from './reddit_dotted_comment_wrapper.component';

// Mock out chrome.
import * as chrome from 'sinon-chrome';
window.chrome = chrome;
// Chrome stub.
const chromeStub = <typeof chrome.SinonChrome> <any> window.chrome;

function getTestTemplate(tuneState: string): string {
  return `
      <div class="s136il31-0 cMWqxb" id="t1_dznkp1g" tabindex="-1">
        <div class="fxv3b9-1 jDSCcP">
          <div *ngIf="!collapsed" class="fxv3b9-2 czhQfm">
            <div class="t1_dznkp1g fxv3b9-0 gFJxlZ" (click)="setCollapsed(true)">
              <i class="threadline"></i>
            </div>
          </div>
        </div>
        <tune-dotted-reddit-comment-wrapper
            [filterMessage]="filterMessage"
            [feedbackQuestion]="feedbackQuestion"
            [maxScore]="maxScore"
            [maxAttribute]="maxAttribute"
            [commentText]="commentText"
            [siteName]="siteName"
            [buttonText]="buttonText"
            tune-state='` + tuneState + `'>
          <div class="Comment t1_dznkp1g top-level s1w069pd-5 kifezV">

            <!-- Collapsed UI. In the real webpage reddit switches this for us, but here we must do it manually. -->
            <button *ngIf="collapsed" class="t1_dznkp1g s1w069pd-0 grAFJQ" (click)="setCollapsed(false)">
              <i class="icon icon-expand qjrkk1-0 JnYFK"></i>
            </button>
            <div *ngIf="collapsed" class="s1w069pd-4 iRRYlm">
              <div class="s1w069pd-3 oyLLU">
                <div><a class="s1461iz-1 ffqGHT"
                      href="/user/crayhack">crayhack</a>
                </div>
                <span class="h5svje-0 cFQOcm">10 points</span><span class="h5svje-0 cFQOcm"> · </span>
                <a class="s1xnagc2-13 eHkfHQ"
                   href="/r/dogs/comments/8mhdil/monthly_brag_brag_about_your_dogs_may/dznkp1g/"
                   id="CommentTopMeta--Created--t1_dznkp1g"
                   rel="nofollow" target="_blank"><span>1 month ago</span>
                </a>
                <span class="s1xnagc2-18 ilIEbt">(0 children)</span>
              </div>
            </div>

            <!-- Not collapsed UI. In the read webpage reddit switched this for us, but here we must do it manually. -->
            <div *ngIf="!collapsed" class="s1w069pd-2 gJXXmR">
              <button class="cYUyoUM3wmgRXEHv1LlZv" aria-label="upvote" aria-pressed="false" data-click-id="upvote">
                <div class="_3wVayy5JvIMI67DheMYra2 dplx91-0 gnyPAq">
                  <i class="icon icon-upvote _2Jxk822qXs4DaXwsN7yyHA _39UOLMgvssWenwbRxz_iEn"></i>
                </div>
              </button>
              <button class="cYUyoUM3wmgRXEHv1LlZv" aria-label="downvote" aria-pressed="false" data-click-id="downvote">
                <div class="jR747Vd1NbfaLusf5bHre s1y8gf4b-0 fcyhGn">
                  <i class="icon icon-downvote ZyxIIl4FP5gHGrJDzNpUC _2GCoZTwJW7199HSwNZwlHk"></i>
                </div>
              </button>
            </div>
            <div *ngIf="!collapsed" class="s1w069pd-4 gEmDjl">
              <div class="s1w069pd-3 cQIztF">
                <div class="wx076j-0 hPglCh"><a class="s1461iz-1 ffqGHT" href="/user/crayhack">crayhack</a>
                  <div class="s1xnagc2-19 TYTqn" id="UserInfoTooltip--t1_dznkp1g">
                  </div>
                </div>
                <div class="s1xnagc2-0 iIQofP s1l57pgn-3 edWxeT s1l57pgn-0 krxZdf"><span>Calvin: Lord of Sheep</span>
                </div>
                <span class="h5svje-0 cFQOcm">9 points</span><span class="h5svje-0 cFQOcm"> · </span>
                  <a class="s1xnagc2-13 eHkfHQ"
                     href="/r/dogs/comments/8mhdil/monthly_brag_brag_about_your_dogs_may/dznkp1g/"
                     id="CommentTopMeta--Created--t1_dznkp1g" rel="nofollow" target="_blank">
                    <span>1 month ago</span>
                  </a>
              </div>
              <div>
                <div class="s1w069pd-6 jXbgxc s1hmcfrd-0 gOQskj">
                  <p class="s570a4-10 iEJDri">I am a comment!</p>
                </div>
              <div>
                <div class="s1axw53s-8 kROdPU">
                  <div id="t1_dznkp1g-comment-share-menu">
                    <button class="s1axw53s-9 dWcHfX">share</button></div><button class="s1axw53s-9 dWcHfX">Save</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </tune-dotted-reddit-comment-wrapper>
      </div>
  `;
}

class RedditDottedCommentWrapperTestComponent {}

@Component({
  selector: 'tune-test-reddit-dotted-comment-wrapper-filter',
  template: getTestTemplate('filter'),
})
class RedditDottedCommentWrapperFilteredTestComponent extends
    RedditDottedCommentWrapperTestComponent {
  @ViewChild(RedditDottedCommentWrapperComponent) dottedCommentWrapper:
    RedditDottedCommentWrapperComponent;
  filterMessage = 'Filtered';
  feedbackQuestion = 'Is this toxic?';
  maxScore = '0.5';
  maxAttribute = 'Sunshine';
  commentText = 'I am a comment';
  siteName = 'google.com';
  buttonText = 'Click me!';
  collapsed = false;

  setCollapsed(collapsed: boolean) {
    this.collapsed = collapsed;
  }
}

@Component({
  selector: 'tune-test-reddit-dotted-comment-wrapper-show',
  template: getTestTemplate('show'),
})
class RedditDottedCommentWrapperShowTestComponent extends
    RedditDottedCommentWrapperTestComponent {
  @ViewChild(RedditDottedCommentWrapperComponent) dottedCommentWrapper:
    RedditDottedCommentWrapperComponent;
  commentText = 'I am a comment';
  siteName = 'google.com';
  collapsed = false;

  setCollapsed(collapsed: boolean) {
    this.collapsed = collapsed;
  }
}

async function clickShowOrHideButton(
    fixture: ComponentFixture<RedditDottedCommentWrapperTestComponent>) {
  const showButton =
    fixture.debugElement.query(By.css('.--tune-showbutton')).nativeElement;
  sendClickEvent(showButton);

  await fixture.whenStable();
  fixture.detectChanges();
  // Wait for CSS transitions.
  // TODO: We should find a better way to do this.
  await waitForTimeout(3000);
}

async function waitForMutationObserver() {
  // Flushes Microtasks, which include the pending mutations for the
  // MutationObserver.
  await waitForTimeout(0);
}

async function testCollapse(
    fixture: ComponentFixture<RedditDottedCommentWrapperTestComponent>) {
  // Because we're artificially recreating reddit's logic of removing and
  // inserting DOM elements in this test, it doesn't make sense to test what
  // is and isn't visible. Instead we check that the classes are as we expect
  // which will verify that the proper callbacks are happening in the code.
  let placeholderElement =
    fixture.debugElement.query(By.css('.--tune-placeholder')).nativeElement;
  expect(placeholderElement.classList).not.toContain(
    '--tune-reddit-collapsed');

  const collapseThreadButton =
    fixture.debugElement.query(
      By.css('.threadline')).nativeElement.parentElement;
  sendClickEvent(collapseThreadButton);
  fixture.detectChanges();

  placeholderElement =
    fixture.debugElement.query(By.css('.--tune-placeholder')).nativeElement;
  expect(placeholderElement.classList).toContain('--tune-reddit-collapsed');
}

async function testExpand(
    fixture: ComponentFixture<RedditDottedCommentWrapperTestComponent>) {
  // Because we're artificially recreating reddit's logic of removing and
  // inserting DOM elements in this test, it doesn't make sense to test what
  // is and isn't visible. Instead we check that the classes are as we expect
  // which will verify that the proper callbacks are happening in the code.
  const expandThreadButton =
    fixture.debugElement.query(
      By.css('button .icon-expand')).nativeElement.parentElement;
  sendClickEvent(expandThreadButton);
  fixture.detectChanges();

  const placeholderElement =
    fixture.debugElement.query(By.css('.--tune-placeholder')).nativeElement;
  expect(placeholderElement.classList).not.toContain(
    '--tune-reddit-collapsed');
}

function assertFilterUIVisibility(
    fixture: ComponentFixture<RedditDottedCommentWrapperTestComponent>,
    expectedVisibility: boolean) {
  const filterUI =
    fixture.debugElement.query(By.css('.--tune-horizontalUIWrapper')).nativeElement;
  expect(getIsElementVisible(filterUI)).toBe(expectedVisibility);
}

describe('RedditDottedCommentWrapperComponentTest', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        DottedCommentWrapperComponent,
        RedditDottedCommentWrapperComponent,
        RedditDottedCommentWrapperFilteredTestComponent,
        RedditDottedCommentWrapperShowTestComponent
      ]
    }).compileComponents();
  }));

  it('state=filter; Collapse and expand thread when comment is revealed',
      async() => {
    const fixture = TestBed.createComponent(
      RedditDottedCommentWrapperFilteredTestComponent);
    fixture.detectChanges();

    assertFilterUIVisibility(fixture, true);

    await clickShowOrHideButton(fixture);
    await testCollapse(fixture);
    await waitForMutationObserver();
    await testExpand(fixture);
  });

  it('state=filter; Collapse when comment is hidden and expand when '
      + 'comment is revealed', async() => {
    const fixture = TestBed.createComponent(
      RedditDottedCommentWrapperFilteredTestComponent);
    fixture.detectChanges();

    assertFilterUIVisibility(fixture, true);

    await testCollapse(fixture);
    await waitForMutationObserver();
    await clickShowOrHideButton(fixture);
    await testExpand(fixture);
  });

  it('state=show; Collapse and expand thread.', async() => {
    const fixture = TestBed.createComponent(
      RedditDottedCommentWrapperShowTestComponent);
    fixture.detectChanges();

    assertFilterUIVisibility(fixture, false);

    await testCollapse(fixture);
    await waitForMutationObserver();
    await testExpand(fixture);
  });
});

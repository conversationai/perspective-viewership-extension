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
import { getIsElementVisible, getNormalizedInnerText, sendClickEvent,
         waitForTimeout } from '../../test_util';
import { colorGradient } from '../../scores';

import { DottedCommentWrapperComponent } from './dotted_comment_wrapper.component';

// Mock out chrome.
import * as chrome from 'sinon-chrome';
window.chrome = chrome;
// Chrome stub.
const chromeStub = <typeof chrome.SinonChrome> <any> window.chrome;

@Component({
  selector: 'tune-test-dotted-comment-wrapper',
  template: `
        <tune-dotted-comment-wrapper
            [filterMessage]="filterMessage"
            [feedbackQuestion]="feedbackQuestion"
            [maxScore]="maxScore"
            [maxAttribute]="maxAttribute"
            [commentText]="commentText"
            [siteName]="siteName"
            [buttonText]="buttonText"
            tune-state='filter'
        >
          <div>I am a comment!</div>
        </tune-dotted-comment-wrapper>
  `,
})
class DottedCommentWrapperTestComponent {
  @ViewChild(DottedCommentWrapperComponent) dottedCommentWrapper:
    DottedCommentWrapperComponent;
  filterMessage = 'Filtered';
  feedbackQuestion = 'Is this toxic?';
  maxScore = '0.5';
  maxAttribute = 'Sunshine';
  commentText = 'I am a comment';
  siteName = 'google.com';
  buttonText = 'Click me!';
}

@Component({
  selector: 'tune-test-dotted-comment-wrapper-replies',
  template: `
        <tune-dotted-comment-wrapper
            [filterMessage]="filterMessage"
            [feedbackQuestion]="feedbackQuestion"
            [maxScore]="maxScore"
            [maxAttribute]="maxAttribute"
            [commentText]="commentText"
            [siteName]="siteName"
            [buttonText]="buttonText"
            tune-state='filter'
        >
          <div id="comment" style="width: 100px; height: 50px;">I am a comment!</div>
          <button id="showRepliesButton" (click)="showReplies = !showReplies" style="height: 20px">
            Click me to reveal lots of replies
          </button>
          <div *ngIf="showReplies">
            <div *ngFor="let reply of replies" class="reply" style="width: 100px; height: 100px;">
              {{reply}}
            </div>
          </div>
        </tune-dotted-comment-wrapper>
  `,
})
class DottedCommentWrapperWithRepliesTestComponent {
  @ViewChild(DottedCommentWrapperComponent) dottedCommentWrapper:
    DottedCommentWrapperComponent;
  filterMessage = 'Filtered';
  feedbackQuestion = 'Is this toxic?';
  maxScore = '0.5';
  maxAttribute = 'Sunshine';
  commentText = 'I am a comment';
  siteName = 'google.com';
  buttonText = 'Click me!';

  replies = [
    'Hello world!',
    'I am a reply!',
    'The quick brown fox jumped over the lazy dog.'
  ];
  showReplies = false;
}

function sendMouseEnterEvent(item: HTMLElement): void {
  item.dispatchEvent(new Event('mouseenter'));
}

function sendMouseLeaveEvent(item: HTMLElement): void {
  item.dispatchEvent(new Event('mouseleave'));
}

async function setHoverState(
    hover: boolean,
    fixture: ComponentFixture<DottedCommentWrapperTestComponent>): Promise<void> {
  const placeholderElement =
    fixture.debugElement.query(By.css('.--tune-placeholder')).nativeElement;
  if (hover) {
    sendMouseEnterEvent(placeholderElement);
  } else {
    sendMouseLeaveEvent(placeholderElement);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  await waitForTimeout(1500);
}

function verifyOriginalCommentVisible(
    fixture: ComponentFixture<DottedCommentWrapperTestComponent>) {
  const originalCommentWrapper = fixture.debugElement.query(
    By.css('.--tune-hiddenCommentWrapper')).nativeElement;
  expect(getIsElementVisible(originalCommentWrapper)).toBe(true);
  expect(getNormalizedInnerText(originalCommentWrapper)).toContain(
    'I am a comment!');
}

function verifyOriginalCommentHidden(
    fixture: ComponentFixture<DottedCommentWrapperTestComponent>) {
  const originalCommentWrapper = fixture.debugElement.query(
    By.css('.--tune-hiddenCommentWrapper')).nativeElement;
  expect(getIsElementVisible(originalCommentWrapper)).toBe(false);
}

function verifyFilterDetailsVisible(
  fixture: ComponentFixture<DottedCommentWrapperTestComponent>) {
  const detailWrapper = fixture.debugElement.query(
    By.css('.--tune-detailWrapper')).nativeElement;
  expect(getIsElementVisible(detailWrapper)).toBe(true);
  expect(getNormalizedInnerText(detailWrapper)).toContain('Filtered');
  expect(getNormalizedInnerText(detailWrapper)).not.toContain(
    'Is this toxic?');
}

function verifyFilterDetailsHidden(
  fixture: ComponentFixture<DottedCommentWrapperTestComponent>) {
  const detailWrapper = fixture.debugElement.query(
    By.css('.--tune-detailWrapper')).nativeElement;
  expect(getIsElementVisible(detailWrapper)).toBe(false);
}

async function clickShowOrHideButton(
    fixture: ComponentFixture<DottedCommentWrapperTestComponent>) {
  const showButton =
    fixture.debugElement.query(By.css('.--tune-showbutton')).nativeElement;
  sendClickEvent(showButton);

  await fixture.whenStable();
  fixture.detectChanges();
  // Wait for CSS transitions.
  // TODO: We should find a better way to do this.
  await waitForTimeout(3000);
}

jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000; // Increase timeout

describe('DottedCommentWrapperComponentTest', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        DottedCommentWrapperComponent,
        DottedCommentWrapperTestComponent,
        DottedCommentWrapperWithRepliesTestComponent
      ]
    }).compileComponents();
  }));

  it('renders hidden comment correctly', () => {
    const fixture = TestBed.createComponent(DottedCommentWrapperTestComponent);
    fixture.detectChanges();
    const testComponent = fixture.debugElement.componentInstance;

    const tuneCircle =
      fixture.debugElement.query(By.css('.--tune-circle')).nativeElement;
    expect(getIsElementVisible(tuneCircle)).toBe(true);
    expect(window.getComputedStyle(tuneCircle).backgroundColor).toEqual(
      colorGradient(0.5));

    verifyOriginalCommentHidden(fixture);

    verifyFilterDetailsHidden(fixture);
  });

  it('renders filter message for hidden comment on hover', async() => {
    const fixture = TestBed.createComponent(DottedCommentWrapperTestComponent);
    fixture.detectChanges();

    verifyFilterDetailsHidden(fixture);

    await setHoverState(true, fixture);

    verifyFilterDetailsVisible(fixture);

    await setHoverState(false, fixture);

    verifyFilterDetailsHidden(fixture);
  });

  it('Showing comment changes text from filter reason to feedback question',
     async() => {
    const fixture = TestBed.createComponent(DottedCommentWrapperTestComponent);
    fixture.detectChanges();
    const testComponent = fixture.debugElement.componentInstance;

    let textWrapper = fixture.debugElement.query(
      By.css('.--tune-textWrapper')).nativeElement;
    expect(getNormalizedInnerText(textWrapper)).toContain('Filtered');
    expect(getNormalizedInnerText(textWrapper)).not.toContain('Is this toxic?');

    let tuneFeedbackYesButton =
      fixture.debugElement.query(By.css('#--tune-feedbackYes')).nativeElement;
    let tuneFeedbackNoButton =
      fixture.debugElement.query(By.css('#--tune-feedbackNo')).nativeElement;
    expect(getIsElementVisible(tuneFeedbackYesButton)).toBe(false);
    expect(getIsElementVisible(tuneFeedbackNoButton)).toBe(false);

    await clickShowOrHideButton(fixture);

    textWrapper = fixture.debugElement.query(
      By.css('.--tune-textWrapper')).nativeElement;
    expect(getNormalizedInnerText(textWrapper)).toContain('Is this toxic?');
    expect(getNormalizedInnerText(textWrapper)).not.toContain('Filtered');
    tuneFeedbackYesButton =
      fixture.debugElement.query(By.css('#--tune-feedbackYes')).nativeElement;
    tuneFeedbackNoButton =
      fixture.debugElement.query(By.css('#--tune-feedbackNo')).nativeElement;
    expect(getIsElementVisible(tuneFeedbackYesButton)).toBe(true);
    expect(getIsElementVisible(tuneFeedbackNoButton)).toBe(true);
  });

  it('Show and hide buttons work', async() => {
    const fixture = TestBed.createComponent(DottedCommentWrapperTestComponent);
    fixture.detectChanges();
    const testComponent = fixture.debugElement.componentInstance;

    verifyOriginalCommentHidden(fixture);

    await clickShowOrHideButton(fixture);
    verifyOriginalCommentVisible(fixture);

    await clickShowOrHideButton(fixture);
    verifyOriginalCommentHidden(fixture);
  });

  it('Send feedback for a toxic comment', async() => {
    const fixture = TestBed.createComponent(DottedCommentWrapperTestComponent);
    fixture.detectChanges();
    const testComponent = fixture.debugElement.componentInstance;

    await clickShowOrHideButton(fixture);

    const tuneFeedbackYesButton =
      fixture.debugElement.query(By.css('#--tune-feedbackYes')).nativeElement;
    sendClickEvent(tuneFeedbackYesButton);
    const expectedFeedback = {
      action: 'SUBMIT_FEEDBACK',
      text: 'I am a comment',
      attribute: 'Sunshine',
      score: 1,
      site: 'google.com',
    };
    expect(chrome.runtime.sendMessage.calledWith(expectedFeedback))
      .toBeTruthy();
  });

  it('Send feedback for a non toxic comment', async() => {
    const fixture = TestBed.createComponent(DottedCommentWrapperTestComponent);
    fixture.detectChanges();
    const testComponent = fixture.debugElement.componentInstance;

    await clickShowOrHideButton(fixture);

    const tuneFeedbackNoButton =
      fixture.debugElement.query(By.css('#--tune-feedbackNo')).nativeElement;
    sendClickEvent(tuneFeedbackNoButton);
    const expectedFeedback = {
      action: 'SUBMIT_FEEDBACK',
      text: 'I am a comment',
      attribute: 'Sunshine',
      score: 0,
      site: 'google.com',
    };
    expect(chrome.runtime.sendMessage.calledWith(expectedFeedback))
      .toBeTruthy();
  });

  it('Wrapper height adjusts for dynamic height content', async() => {
    const showRepliesButtonHeight = 20;
    const commentHeight = 50;
    const replyHeight = 100;

    const fixture = TestBed.createComponent(
      DottedCommentWrapperWithRepliesTestComponent);
    fixture.detectChanges();

    verifyOriginalCommentHidden(fixture);
    await clickShowOrHideButton(fixture);
    verifyOriginalCommentVisible(fixture);

    let originalCommentWrapper = fixture.debugElement.query(
      By.css('.--tune-hiddenCommentWrapper')).nativeElement;
    expect(originalCommentWrapper.offsetHeight).toEqual(
      commentHeight + showRepliesButtonHeight);

    const showRepliesButton =
      fixture.debugElement.query(By.css('#showRepliesButton')).nativeElement;
    sendClickEvent(showRepliesButton);
    fixture.detectChanges();

    originalCommentWrapper = fixture.debugElement.query(
      By.css('.--tune-hiddenCommentWrapper')).nativeElement;
    const replies = fixture.debugElement.queryAll(By.css('.reply'));
    expect(originalCommentWrapper.offsetHeight).toEqual(
      replies.length * replyHeight + commentHeight + showRepliesButtonHeight);

    sendClickEvent(showRepliesButton);
    fixture.detectChanges();

    originalCommentWrapper = fixture.debugElement.query(
      By.css('.--tune-hiddenCommentWrapper')).nativeElement;
    expect(originalCommentWrapper.offsetHeight).toEqual(
      commentHeight + showRepliesButtonHeight);
  });
});

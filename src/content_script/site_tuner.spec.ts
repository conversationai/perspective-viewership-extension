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

import { async } from '@angular/core/testing';
import { EnabledAttributes } from '../scores';
import { THEMES, DEFAULT_ATTRIBUTES } from '../tune_settings';
import { SiteTuner, WRAPPER_SCORES_ATTR, WRAPPER_COMMENT_TEXT_ATTR,
         WRAPPER_SITE_NAME_ATTR, TUNE_SEEN_ATTR, COMMENT_CHILDREN_CONTAINER_CLASS,
         getTextWithSelector } from './site_tuner';
import { AttributeScores } from '../scores';

// Mock out chrome.
import * as chrome from 'sinon-chrome';
window.chrome = chrome;
// Chrome stub.
// Note: The any cast is required since the SinonChrome typing is incomplete
// and is missing the field "accessibilityFeatures".
// TODO: Maybe send them a PR to fix this?
const chromeStub = <typeof chrome.SinonChrome> <any> window.chrome;

const COMMENT_CLASS = 'commentClass';
const COMMENT_TEXT_CLASS = 'textClass';

class SiteTunerImpl extends SiteTuner {
  siteName = 'test';
  commentBlockSelector = '.' + COMMENT_CLASS;
  getTextFromCommentBlock(commentBlock: HTMLElement): string|null {
    return getTextWithSelector(commentBlock, '.' + COMMENT_TEXT_CLASS);
  }
}

const COMMENTS_CONTAINER_CLASS = 'commentsContainerClass';

function makeNewComment(text: string): HTMLElement {
  const comment = document.createElement('div');
  comment.classList.add(COMMENT_CLASS);
  const commentText = document.createElement('p');
  commentText.classList.add(COMMENT_TEXT_CLASS);
  commentText.appendChild(document.createTextNode(text));
  comment.appendChild(commentText);
  return comment;
}

function addComment(text: string) {
  const comment = makeNewComment(text);
  const parentElement = document.querySelector('.' + COMMENTS_CONTAINER_CLASS);
  parentElement.appendChild(comment);
  return comment;
}

describe('SiteTuner tests', () => {
  beforeEach(() => {
    // Add 3 comments to the DOM.
    const commentsContainer = document.createElement('div');
    commentsContainer.classList.add(COMMENTS_CONTAINER_CLASS);
    for (let i = 0; i < 3; i++) {
      commentsContainer.appendChild(makeNewComment('Comment number ' + i));
    }
    document.body.appendChild(commentsContainer);
  });

  afterEach(() => {
    document.body.removeChild(
      document.querySelector('.' + COMMENTS_CONTAINER_CLASS));
  });

  it('Tuner handles existing comments on launch', () => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    spyOn(siteTuner, 'handleAddedComment');
    siteTuner.launchTuner();
    expect(siteTuner.handleAddedComment).toHaveBeenCalledTimes(3);
  });

  xit('Tuner handles added comments', (done) => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();
    const commentsContainer =
      document.querySelector('.' + COMMENTS_CONTAINER_CLASS) as HTMLElement;
    spyOn(siteTuner, 'handleAddedComment');
    addComment('Another comment');
    addComment('And another one!');
    // Using a setTimeout of 0 will cause this test to wait for the
    // MutationObserver before running the setTimeout because MutationObserver
    // callbacks are Microtasks and setTimeout callbacks are Tasks, and
    // Microtasks get scheduled before Tasks after the current task (the test)
    // finishes. See https://stackoverflow.com/questions/45189537/how-to-test-mutationobserver
    //
    // The problem is that this then breaks other tests, because
    // jasmine thinks the test is already done and the setTimeout command gets
    // executed in the middle of another test, which are not necessarily using
    // spies.
    //
    // If we use jasmine done() to prevent the setTimeout callback from
    // executing during another test, then the setTimeout hack doesn't work
    // anymore, probably because jasmine hacks the event loop to prevent other
    // tests from running until done() is called.
    //
    // TODO: Figure out how to make this work, or remove this test altogether.
    setTimeout(() => {
      expect(siteTuner.handleAddedComment).toHaveBeenCalledTimes(2);
      done();
    });
  });

  it('Test handleAddedNode correctly handles comment', () => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();
    const testComment = addComment('Foo bar');

    spyOn(siteTuner, 'handleAddedComment');
    siteTuner.handleAddedNode(testComment);
    expect(siteTuner.handleAddedComment).toHaveBeenCalledTimes(1);
  });

  it('Test handleAddedNode ignores elements that are not comments', () => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();
    const testNotAComment = addComment('Foo bar');
    testNotAComment.classList.remove(COMMENT_CLASS);

    spyOn(siteTuner, 'handleAddedComment');
    siteTuner.handleAddedNode(testNotAComment);
    expect(siteTuner.handleAddedComment).toHaveBeenCalledTimes(0);
  });

  it('Test handleRemovedNode correctly handles comment', () => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();
    const testComment = addComment('Foo bar');

    spyOn(siteTuner, 'handleRemovedComment');
    siteTuner.handleRemovedNode(testComment);
    expect(siteTuner.handleRemovedComment).toHaveBeenCalledTimes(1);
  });

  it('Test handleRemovedNode ignores elements that are not comments', () => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();
    const testNotAComment = addComment('Foo bar');
    testNotAComment.classList.remove(COMMENT_CLASS);

    spyOn(siteTuner, 'handleRemovedComment');
    siteTuner.handleRemovedNode(testNotAComment);
    expect(siteTuner.handleRemovedComment).toHaveBeenCalledTimes(0);
  });

  it('Test handleAddedComment scores comment', async() => {
    const testScores: AttributeScores = {
      identityAttack: 0.1,
      insult: 0.2,
      profanity: 0.3,
      threat: 0.4,
      sexuallyExplicit: 0.5,
      toxicity: 0.6,
      severeToxicity: 0.7,
      likelyToReject: 0.8
    };
    chromeStub.runtime.sendMessage.yields(testScores);

    const siteTuner = new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();

    const testComment = addComment('Hello world!');
    siteTuner.handleAddedComment(testComment).then(() => {
      const wrapper = siteTuner.getWrapperForAdjustedCommentBlock(testComment);
      expect(wrapper).not.toEqual(null);
      expect(wrapper.getAttribute(WRAPPER_SCORES_ATTR)).toEqual(JSON.stringify(testScores));
    });
  });

  it('Tests wrapCommentBlock sets correct attributes', () => {
    const siteTuner = new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();

    const commentText = 'Hello world!';
    const testComment = addComment(commentText);
    const commentWrapper =
      siteTuner.wrapCommentBlock(testComment, commentText);

    expect(commentWrapper.getAttribute(WRAPPER_COMMENT_TEXT_ATTR))
      .toEqual(commentText);
    expect(commentWrapper.getAttribute(WRAPPER_SITE_NAME_ATTR)).toEqual('test');
  });

  it('Test wrapCommentBlock wraps comment children', () => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();

    const commentText = 'Hello world!';
    const testComment = addComment(commentText);
    const commentWrapper =
      siteTuner.wrapCommentBlock(testComment, commentText);

    expect(commentWrapper.matches('tune-dotted-comment-wrapper')).toBe(true);
    expect(commentWrapper.parentElement).toEqual(testComment);
    expect(commentWrapper.querySelector('.' + COMMENT_TEXT_CLASS).textContent)
      .toContain(commentText);
  });

  it('Test unwrapCommentBlock', () => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();

    const commentText = 'Hello world!';
    const testComment = addComment(commentText);
    const originalTestCommentClone = testComment.cloneNode(true);
    expect(testComment).toEqual(originalTestCommentClone as any);

    siteTuner.wrapCommentBlock(testComment, commentText);
    expect(testComment).not.toEqual(originalTestCommentClone as any);

    expect(siteTuner.unwrapCommentBlock(testComment)).toBe(true);
    expect(testComment).toEqual(originalTestCommentClone as any);
  });

  it('Test unwrapCommentBlock on not-yet-wrapped block', () => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();

    const commentText = 'Hello world!';
    const testComment = addComment(commentText);
    expect(siteTuner.unwrapCommentBlock(testComment)).toBe(false);
  });

  it('Test handleRemovedComment', () => {
    const siteTuner =
      new SiteTunerImpl(0.5, DEFAULT_ATTRIBUTES, THEMES.dotted, false);
    siteTuner.launchTuner();

    const commentText = 'Hello world!';
    const testComment = addComment(commentText);
    const originalTestCommentClone = testComment.cloneNode(true);
    expect(testComment).toEqual(originalTestCommentClone as any);

    // Mark the comment as seen and alter its DOM.
    testComment.setAttribute(TUNE_SEEN_ATTR, '');
    siteTuner.wrapCommentBlock(testComment, commentText);

    expect(testComment).not.toEqual(originalTestCommentClone as any);

    siteTuner.handleRemovedComment(testComment);

    expect(testComment).toEqual(originalTestCommentClone as any);
  });
});

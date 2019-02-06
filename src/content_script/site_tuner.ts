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

// Library module that defines SiteTuner interface and shared DOM hacking logic.
// (This is defined separately here, and not in content_script.ts, to avoid
// circular dependency issues.)

import { CommentVisibilityDecision, AttributeScores, AttributeScore, EnabledAttributes,
         getCommentVisibility, getHideReasonDescription, getFeedbackQuestion } from '../scores';
import { EnabledWebsites, ThemeType, THEMES } from '../tune_settings';
import { ChromeMessageEnum } from '../messages';

// This is a marker for DOM nodes that we've seen already. This is so we don't
// rerun the MutationObserver logic on nodes when we modify the DOM to show/hide
// comments.
export const TUNE_SEEN_ATTR = 'tune-seen';

// Webcomponent attribute for the comment's visibility state.
export const WRAPPER_TUNE_STATE_ATTR = 'tune-state';

export const TUNE_STATE = {
  filter: 'filter',
  show: 'show'
};

// Webcomponent attributes for a comment's highest attribute score, filter
// message, and feedback question displayed. These correspond to the camelcase
// input values defined in our web component classes.
export const WRAPPER_SITE_NAME_ATTR = 'site-name';
export const WRAPPER_COMMENT_TEXT_ATTR = 'comment-text';
export const WRAPPER_SCORES_ATTR = 'tune-scores';
export const WRAPPER_MAX_ATTRIBUTE_NAME_ATTR = 'max-attribute';
export const WRAPPER_MAX_ATTRIBUTE_SCORE_ATTR = 'max-score';
export const WRAPPER_FILTER_MESSAGE_ATTR = 'filter-message';
export const WRAPPER_FEEDBACK_QUESTION_ATTR = 'feedback-question';

// Container of child nodes of original comment block.
export const COMMENT_CHILDREN_CONTAINER_CLASS = 'comment-children-contianer';

export const WRAPPER_CLASS = '--tune-wrapper';

const HANDLE_COMMENT_BATCH_SIZE = 5;
const HANDLE_COMMENT_BATCH_DELAY_MS = 100;

export function scoreComment(commentText: string): Promise<AttributeScores> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({action: ChromeMessageEnum.SCORE_TEXT, text: commentText}, (scores) => {
      resolve(scores);
    });
  });
}

// Moves all child nodes from source to dest, including text/comment nodes.
function moveAllChildNodes(source: Element, dest: Element): void {
  while (source.firstChild) {
    dest.appendChild(source.firstChild);
  }
}

// Utility that calls a function on all items in batches, inserting a delay of
// 'timeout' in between each batch. We use this to handle scoring comments and
// modifying their DOM elements because if many comments are present, the DOM is
// not updated until all those comments are scored. Breaking the job into
// batches means that the initial comments can be handled more quickly, before
// the rest of the comments are scored.
function batchActionWithTimeout<T>(items: Array<T>, fn: ((arg: T) => void),
                                   batchSize: number, timeout: number)
: void {
  const batch = items.slice(0, batchSize);
  for (const item of batch) {
    fn(item);
  }
  const rest = items.slice(batchSize);
  if (rest.length) {
    setTimeout(() => batchActionWithTimeout(rest, fn, batchSize, timeout),
               timeout);
  }
}

// Wraps JSON.parse to return undefined on parse errors. We don't return null,
// since that's a valid JSON value.
export function safeParse(json: string): any|undefined {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('JSON parse error:', error);
    return undefined;
  }
}

// Helper function for implementing getTextFromCommentBlock using a selector on
// the comment block.
export function getTextWithSelector(
  commentBlock: HTMLElement, textSelector: string)
: string|null {
  const textNode = commentBlock.querySelector(textSelector);
  if (!(textNode instanceof HTMLElement)) {
    return null;
  }
  // NOTE: This is free-form comment text from the internet! Be mindful of
  // security issues in how this data is handled.
  return textNode.innerText;
}

export const SEEN_SELECTOR = '[' + TUNE_SEEN_ATTR + ']';
export const UNSEEN_SELECTOR = ':not(' + SEEN_SELECTOR + ')';

// SiteTuner handles the DOM hackery for a specific site. It finds comment DOM
// elements on a page, extracts and scores the text, and mutates the DOM to hide
// elements depending on the user's Tune settings.
export abstract class SiteTuner {
  abstract readonly siteName: string;

  // This selector identifies the primary comment element operated on by the
  // rest of this code. The selector should trigger for newly appearing comments
  // that need to be handled. These elements have name and type `commentBlock:
  // HTMLElement` is this code.
  abstract readonly commentBlockSelector: string;

  // If we should call handleRemovedComment when elements matching
  // commentBlockSelector are removed. Needed if the site reuses DOM elements in
  // some tricky way (e.g. YouTube, when navigating to a new video).
  //
  // Warning! This can make code complicated if the commentBlockSelector doesn't
  // exactly identify the object that needs to be wrapped (e.g., if
  // adjustCommentBlock changes the block to refer to a parent element). This is
  // because we may move comment blocks when wrapping the comment, which calls
  // handleRemovedComment. TODO: untangle this stuff.
  protected shouldHandleRemoveMutations = false;

  private tuneEnabled = true;
  private observer: MutationObserver = null;

  // Function to go from elements returned by commentBlockSelector to the text
  // comment.
  abstract getTextFromCommentBlock(commentBlock: HTMLElement): string|null;

  // Changes the DOM to use as the comment block. This is only needed if the
  // comment blocks matched by commentBlockSelector is not the same as the DOM
  // element that should be wrapped.
  //
  // One might use this, for example, if the actual comment block (which
  // includes the username, avatar, metadata, etc.) is not feasible to be
  // selected with commentBlockSelector (e.g. on Reddit, we select the text
  // block instead of the comment block).
  protected adjustCommentBlock(commentBlock: HTMLElement): HTMLElement {
    return commentBlock;
  }

  // Returns our injected comment wrapper component for the comment block.
  // Override if the wrapper doesn't reside within the commentBlock.
  //
  // Note: this is called on the result returned by adjustCommentBlock.
  //
  // Public for testing.
  public getWrapperForAdjustedCommentBlock(commentBlock: HTMLElement): Element|null {
    return commentBlock.querySelector('.' + WRAPPER_CLASS);
  }

  // Should be used for any mutation observer handling specific to subclasses.
  protected handleCommentChanged(mutation: MutationRecord): void {
  }

  // Gets the webcomponent name based on the theme. Can be overridden in
  // subclasses with more specific webcomponent implementations.
  protected getCommentWrapperElement(): string {
    if (this.theme === THEMES.dotted) {
      return 'tune-dotted-comment-wrapper';
    } else {
      return 'tune-debug-comment-wrapper';
    }
  }

  constructor(protected threshold: number,
              protected enabledAttributes: EnabledAttributes,
              protected theme: ThemeType,
              protected subtypesEnabled: boolean) {
    // Note: we create this on initialization but it doesn't start working until
    // we call 'observe' later on.
    this.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        this.handleCommentChanged(mutation);

        // TODO: handling added nodes in batch using batchActionWithTimeout
        // causes weird issues with YouTube.
        mutation.addedNodes.forEach(addedNode => {
          this.handleAddedNode(addedNode);
        });
        if (this.shouldHandleRemoveMutations) {
          mutation.removedNodes.forEach(removedNode => {
            this.handleRemovedNode(removedNode);
          });
        }
      });
    });
  }

  // This method kicks off logic for observing the page, detecting
  // comments, scoring them, and choosing whether to hide them.
  public launchTuner(): void {
    this.tuneEnabled = true;
    this.initializeSelectors();
    console.log('launchTuner: handling any comments already present...');
    this.handleExistingComments();
    console.log('launchTuner: launching mutation observer...');
    this.handleNewComments();
  }

  public disableTuner(): void {
    this.observer.disconnect();
    this.tuneEnabled = false;
    if (this.commentBlockSelector === null) {
      return;
    }
    document.body.querySelectorAll(
      this.commentBlockSelector + SEEN_SELECTOR)
      .forEach(commentBlock => this.handleRemovedComment(commentBlock));
  }

  // Performs any initialization that needs to be done for the selectors to use
  // when querying for comments on the page. Override in subclasses for
  // website-specific behavior.
  protected initializeSelectors(): void {}

  private handleExistingComments(): void {
    if (this.commentBlockSelector === null) {
      return;
    }
    const items = [];
    document.body.querySelectorAll(this.commentBlockSelector + UNSEEN_SELECTOR)
      .forEach(item => items.push(item));
    batchActionWithTimeout(items, item => this.handleAddedComment(item),
                           HANDLE_COMMENT_BATCH_SIZE,
                           HANDLE_COMMENT_BATCH_DELAY_MS);
  }

  private handleNewComments(): void {
    this.observer.observe(document.body, {subtree: true, childList: true});
  }

  // Public for tests.
  public handleAddedNode(addedNode: Node) {
    // Try to initialize the selectors in case we failed to during initial page
    // load.
    //
    // This is needed because the redesigned Reddit dynamically loads posts w/
    // comments without a full page reload. So going to a top-level subreddit
    // page causes the script to load, but there are no comments to initialize
    // the selector. If the user then navigates to a page with comments, we need
    // to try to initialize the selectors again.
    this.initializeSelectors();
    if (!(addedNode instanceof HTMLElement) || this.commentBlockSelector === null) {
      return;
    }
    // New comment blocks may be directly added to the DOM, or they may be
    // nested within other elements, so we need to call both `matches` and
    // `querySelectorAll` to handle both cases. (For example, YouTube reply
    // comment blocks are loaded directly into the DOM as the added node when
    // the "View replies" button is clicked.)
    if (addedNode.matches(this.commentBlockSelector + UNSEEN_SELECTOR)) {
      this.handleAddedComment(addedNode);
    }
    addedNode.querySelectorAll(this.commentBlockSelector + UNSEEN_SELECTOR).forEach(
      commentBlock => this.handleAddedComment(commentBlock));
  }

  // Public for tests.
  public handleRemovedNode(removedNode: Node) {
    if (!(removedNode instanceof HTMLElement) || this.commentBlockSelector === null) {
      return;
    }
    if (removedNode.matches(this.commentBlockSelector)) {
      this.handleRemovedComment(removedNode);
    }
    removedNode.querySelectorAll(this.commentBlockSelector).forEach(
      commentBlock => this.handleRemovedComment(commentBlock));
  }

  // This method is used as an onChange handler for the threshold and
  // enabledAttributes settings.
  public onFilterSettingsChange(threshold: number, enabledAttributes: EnabledAttributes,
                                theme: ThemeType, subtypesEnabled: boolean)
  : void {
    console.log('onSettingsChange:', threshold, enabledAttributes, theme, subtypesEnabled);
    this.threshold = threshold;
    this.enabledAttributes = enabledAttributes;
    this.subtypesEnabled = subtypesEnabled;
    if (theme !== this.theme) {
      this.theme = theme;
      this.handleThemeChange();
    }
    this.setAllCommentsVisibility();
  }

  public onEnabledSettingsChange(globalEnabled: boolean, enabledWebsites: EnabledWebsites)
  : void {
    console.log('onEnabledSitesChange:', globalEnabled, enabledWebsites);
    const shouldBeEnabled = globalEnabled && enabledWebsites[this.siteName];
    if (this.tuneEnabled && !shouldBeEnabled) {
      console.log('disabling Tune...');
      this.disableTuner();
    } else if (!this.tuneEnabled && shouldBeEnabled) {
      console.log('launching Tune...');
      this.launchTuner();
    }
  }

  // Override in subclasses to indicate if certain comment blocks should be
  // skipped.
  protected canWrapCommentBlock(commentBlock: HTMLElement): boolean {
    return true;
  }

  // Override in subclasses if DOM manipulation differs from the normal pattern.
  // Public for test visibility so we can use this with jasmine spyOn.
  // TODO: This is not great practice, we should restore this to being
  // protected once tests are better.
  // Returns a Promise to make testing simpler.
  public handleAddedComment(commentBlock: Node): Promise<void> {
    if (!(commentBlock instanceof HTMLElement)) {
      return Promise.resolve();
    }
    // NOTE: This is free-form comment text from the internet! Be mindful of
    // security issues in how this data is handled.
    const text = this.getTextFromCommentBlock(commentBlock);
    if (text === null) {
      return Promise.resolve();
    }

    if (!this.canWrapCommentBlock(commentBlock)) {
      console.log('Skipping comment block', commentBlock);
      return Promise.resolve();
    }

    console.log('handleAddedComment: ', text.substr(0, 30));
    const wrapperComponent = this.wrapCommentBlock(commentBlock, text);
    if (wrapperComponent === null) {
      console.error('wrapCommentBlock failed on block:', commentBlock);
      return Promise.resolve();
    }

    commentBlock.setAttribute(TUNE_SEEN_ATTR, '');

    // Note: this is special handling for Reddit. When re-expanding collapsed
    // comments, the comment block is re-added within the existing wrapper
    // component. That component still has scores, so no need to rescore in this
    // case.
    let scoringPromise;
    if (wrapperComponent.hasAttribute(WRAPPER_SCORES_ATTR)) {
      scoringPromise = Promise.resolve();
      console.log('wrapper already had scores, skipping scoring:', wrapperComponent);
    } else {
      scoringPromise = scoreComment(text).then(scores => {
        wrapperComponent.setAttribute(WRAPPER_SCORES_ATTR, JSON.stringify(scores));
      });
    }
    return scoringPromise.then(() => this.setCommentVisibility(wrapperComponent));
  }

  // When nodes are removed, we want to remove any customization we did to the
  // DOM because some websites will reuse their DOM elements after they are
  // removed.
  //
  // Public for tests.
  public handleRemovedComment(commentBlock: Node): void {
    if (!(commentBlock instanceof HTMLElement)) {
      return;
    }
    if (!commentBlock.hasAttribute(TUNE_SEEN_ATTR)) {
      return;
    }
    if (!this.unwrapCommentBlock(commentBlock)) {
      console.error('handleRemovedComment: comment not initialized yet?', commentBlock);
      return;
    }
    console.log('handleRemovedComment:', commentBlock);

    commentBlock.removeAttribute(TUNE_SEEN_ATTR);
  }

  // TODO: maybe we should move this logic into the wrapper components?
  private setCommentVisibility(wrapperComponent: Element) {
    const scores = safeParse(wrapperComponent.getAttribute(WRAPPER_SCORES_ATTR));
    if (scores === undefined) {
      console.error('BUG: invalid scores? skipping comment:', scores, wrapperComponent);
    }

    const commentVisibility: CommentVisibilityDecision = getCommentVisibility(
      scores, this.threshold, this.enabledAttributes, this.subtypesEnabled);

    if (commentVisibility.kind === 'showComment') {
      wrapperComponent.setAttribute(WRAPPER_TUNE_STATE_ATTR, TUNE_STATE.show);
    } else {
      wrapperComponent.setAttribute(WRAPPER_TUNE_STATE_ATTR, TUNE_STATE.filter);
      if (commentVisibility.kind === 'hideCommentDueToScores') {
        wrapperComponent.setAttribute(WRAPPER_MAX_ATTRIBUTE_NAME_ATTR, commentVisibility.attribute);
      }
    }

    if (this.theme === THEMES.dotted) {
      wrapperComponent.setAttribute(WRAPPER_FILTER_MESSAGE_ATTR,
                                    getHideReasonDescription(commentVisibility));
      wrapperComponent.setAttribute(WRAPPER_FEEDBACK_QUESTION_ATTR,
                                    getFeedbackQuestion(commentVisibility, this.subtypesEnabled));
      if (commentVisibility.kind === 'hideCommentDueToScores') {
        wrapperComponent.setAttribute(WRAPPER_MAX_ATTRIBUTE_SCORE_ATTR,
                                      String(commentVisibility.scaledScore));
      }
    }
  }

  // Moves all contents of comment under the webcomponent, and makes the
  // webcomponent a child of the original comment element.
  //
  // Override in subclasses if this manipulation needs to be different.
  // Note that if you do this, you will also have to override handleThemeChange.
  //
  // Public for tests.
  public wrapCommentBlock(commentBlock: HTMLElement, commentText: string): Element {
    commentBlock = this.adjustCommentBlock(commentBlock);

    // Move all comment contents under a new wrapper element.
    const wrapperComponent = document.createElement(this.getCommentWrapperElement());
    wrapperComponent.classList.add(WRAPPER_CLASS);
    // NOTE: This is free-form comment text from the internet! Be mindful of
    // security issues in how this data is handled.
    //
    // Here, we include the full comment text as an attribute on our wrapper
    // component. Quotes are automatically escaped by Angular, and <script> and
    // other tags are innocuous being stored as strings, so this is not a
    // security issue. But we need to be mindful if we change the way this data
    // is handled.
    wrapperComponent.setAttribute(WRAPPER_COMMENT_TEXT_ATTR, commentText);
    wrapperComponent.setAttribute(WRAPPER_SITE_NAME_ATTR, this.siteName);

    // We wrap all the original comment's children elements in a new container
    // so that it's easy to identify and undo our DOM hackery later.
    const commentChildrenContainer = document.createElement('div');
    commentChildrenContainer.classList.add(COMMENT_CHILDREN_CONTAINER_CLASS);
    moveAllChildNodes(commentBlock, commentChildrenContainer);
    wrapperComponent.appendChild(commentChildrenContainer);

    commentBlock.appendChild(wrapperComponent);
    return wrapperComponent;
  }

  // Returns false if the comment hasn't been fully initialized and couldn't be
  // reset. This should only if the function was called before wrapCommentBlock
  // completed.
  //
  // Public for tests.
  public unwrapCommentBlock(commentBlock: HTMLElement): boolean {
    commentBlock = this.adjustCommentBlock(commentBlock);
    const commentWrapper = this.getWrapperForAdjustedCommentBlock(commentBlock);
    if (commentWrapper === null) {
      return false;
    }

    const childrenContainer = commentWrapper.querySelector(
      '.' + COMMENT_CHILDREN_CONTAINER_CLASS);
    moveAllChildNodes(childrenContainer, commentBlock);
    commentBlock.removeChild(commentWrapper);
    return true;
  }

  private handleThemeChange(): void {
    // This is essentially handleRemovedComment and then handleAddedComment, but
    // without the unnecessary rescoring step.
    if (this.commentBlockSelector === null) {
      return;
    }
    document.body.querySelectorAll(this.commentBlockSelector + SEEN_SELECTOR)
      .forEach(commentBlock => {
        if (!(commentBlock instanceof HTMLElement)) {
          return;
        }
        const text = this.getTextFromCommentBlock(commentBlock);
        if (text === null) {
          return;
        }
        // Save scores.
        const scores = this.getWrapperForAdjustedCommentBlock(
          this.adjustCommentBlock(commentBlock)).getAttribute(WRAPPER_SCORES_ATTR);
        if (!this.unwrapCommentBlock(commentBlock)) {
          console.error('comment not initialized yet, not modifying theme:', commentBlock);
          return;
        }

        const wrapperComponent = this.wrapCommentBlock(commentBlock, text);
        if (wrapperComponent === null) {
          console.error('wrapCommentBlock unexpectedly failed on block:', commentBlock);
          return;
        }
        wrapperComponent.setAttribute(WRAPPER_SCORES_ATTR, scores);
        this.setCommentVisibility(wrapperComponent);
      });
  }

  // Iterates over all comments on the page and decide whether they should be
  // visible or not based on the current values of threshold and
  // enabledAttributes.
  private setAllCommentsVisibility(): void {
    console.log('setAllCommentsVisibility:',
                this.threshold, this.enabledAttributes, this.subtypesEnabled);
    document.body
      .querySelectorAll('.' + WRAPPER_CLASS + '[' + WRAPPER_SCORES_ATTR + ']')
      .forEach(wrapper => this.setCommentVisibility(wrapper));
  }
}

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

import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import * as bodymovin from 'bodymovin';
import { SubtypeSettingsComponent } from './subtype_settings.component';
import { WebsiteSettingsComponent } from './website_settings.component';

// TODO: wrap these into a service to avoid importing multiple times.
import { hasAuthToken, getAuthToken } from '../auth';

const PAGES = {
  auth: 'auth',
  intro: 'intro',
  subtypeSettings: 'subtypeSettings',
  moreInfo: 'moreInfo',
  websiteSettings: 'websiteSettings'
};

@Component({
  selector: 'tune-setup-flow',
  templateUrl: './setup_flow.component.html',
  styleUrls: ['./setup_flow.component.css']
})
export class SetupFlowComponent implements AfterViewInit {
  @ViewChild('introPageAnimationPlaceholder') introPageAnimationPlaceholder: ElementRef;

  @ViewChild(SubtypeSettingsComponent) subtypeSettingsPage: SubtypeSettingsComponent;
  @ViewChild(WebsiteSettingsComponent) websiteSettingsPage: WebsiteSettingsComponent;

  // Initialized in constructor, depending on whether the user has already
  // authenticated.
  currentPage = null;
  animatingNextPage = null;
  learnMoreOpen = false;
  private introPageAnimation = null;
  readonly pages = PAGES;

  @Output() setupComplete = new EventEmitter<void>();

  constructor() {
    hasAuthToken().then(hasToken => {
      console.log('hasAuthToken?:', hasToken);
      if (hasToken) {
        this.currentPage = PAGES.intro;
        if (this.introPageAnimation) {
          console.log('constructor: animation already exists - starting it...');
          this.introPageAnimation.play();
        }
      } else {
        this.currentPage = PAGES.auth;
      }
    });
  }

  ngAfterViewInit() {
    this.introPageAnimation = bodymovin.loadAnimation({
      container: this.introPageAnimationPlaceholder.nativeElement,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      path: 'intro-animation.json'
    });
    if (this.currentPage === PAGES.intro) {
      console.log('ngAfterViewInit: on intro page already: starting animation...');
      this.introPageAnimation.play();
    }
  }

  signIn(): void {
    // Note: I don't think the code after getAuthToken typically executes, since
    // the popup usually closes.
    getAuthToken(true /* interactive */).then(_unused_token => {
      console.log('getAuthToken was successful! onto intro page.');
      this.navigateToIntro();
    }).catch(error => {
      // TODO: What should we do here? I think this only happens if the user
      // refused to authenticate. https://github.com/Jigsaw-Code/tune/issues/129
      console.error('getAuthToken failed!', error);
      this.navigateToIntro();
    });
  }

  navigateToIntro(): void {
    this.introPageAnimation.play();
    this.navigateToPage(PAGES.intro);
  }

  handleGetStartedClick(): void {
    this.introPageAnimation.destroy();
    this.navigateToPage(PAGES.websiteSettings);
  }

  // TODO: Simplify this if possible.
  navigateToPage(page: string) {
    if (this.animatingNextPage !== null) {
      // We're currently animating, don't navigate.
      return;
    }

    if (this.currentPage === PAGES.intro
        && page === PAGES.websiteSettings) {
      this.currentPage = page;
      this.animatingNextPage = page;
      this.websiteSettingsPage.animateIn().then(() => {
        this.animatingNextPage = null;
      });
    }
  }

  notifySetupComplete() {
    if (this.animatingNextPage !== null) {
      // We're currently animating, don't navigate.
      return;
    }
    this.websiteSettingsPage.animateOut().then(() => {
      this.setupComplete.emit();
    });
  }

  disableIntroPageAnimation(): void {
    if (this.introPageAnimation) {
      this.introPageAnimation.destroy();
    }
  }

  getPageHidden(page: string) {
    return this.currentPage !== page && this.animatingNextPage !== page;
  }
}

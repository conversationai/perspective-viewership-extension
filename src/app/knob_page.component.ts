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

import { Component, AfterViewInit, ElementRef, EventEmitter, HostListener,
         Input, OnChanges, Output, SimpleChanges, ViewChild, ViewChildren } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { MatTabGroup } from '@angular/material/tabs';
import { ChromeMessageService } from './chrome_message.service';
import { SettingsPage } from './settings_page.component';
import { TuneSettingsManagerService } from './tune_settings_manager.service';
import { LOW_THRESHOLD, MEDIUM_THRESHOLD, LOUD_THRESHOLD, BLARING_THRESHOLD,
        colorGradient } from '../scores';
import { ChromeMessageEnum, GetCurrentWebsiteResponse } from '../messages';
import { EnabledWebsites, DEFAULT_WEBSITES, WEBSITE_NAME_MAP, WEBSITE_NAMES,
         WebsiteSettingName } from '../tune_settings';
import { GoogleAnalyticsService, Page, EventAction,
         EventCategory, OutgoingLinkName } from './google_analytics.service';
import * as throttle from 'lodash/throttle';

const THRESHOLD_CHANGE_THROTTLE = 200;
const DIAL_CONTAINER_HEIGHT_PX = 265;
// Note: this click target size covers the full extent of the dial container, so
// the user can click anywhere in the container and the dial rotates to the
// closest point. We could just remove the distance check completely, but
// leaving for now.
const DIAL_CLICK_TARGET_PX = 200;
const DIAL_TAIL_TARGET_PX = 50;
const DIAL_RADIUS_PX = 87.5;

// Must match the width for 'knobDescription' defined in CSS.
const KNOB_DESCRIPTION_WIDTH = 250;

// Must match the width for 'knobSubDescriptionWordChoice' defined in CSS.
const TEXT_CHOICE_WIDTH = 152;

const ARROW_ICON = 'tune-arrow';
const ARROW_ICON_LOCATION = 'ic_arrow.svg';

// How much the dial position/threshold changes on increment/decrement input
// events.
const INPUT_DELTA_AMOUNT = 0.10;

const OPENING_TRANSITION_TIME_MS = 2300;

// The error message returned in chrome.runtime.lastError when a connection
// could not be established when sending a message. One way this can happen is
// if there is no content script with a message handler for the message that was
// requested.
const NO_CONTENT_SCRIPT_ERROR_MESSAGE =
  'Could not establish connection. Receiving end does not exist.';

interface Point {
  x: number;
  y: number;
}

// Array of pairs ordered by increasing threshold. Each pair has icons for when
// Tune is enabled and disabled.
const TUNE_ICONS = [
  {enabled: 'ic_tune_quiet.png', disabled: 'ic_tune_quiet_off.png'},
  {enabled: 'ic_tune_low.png', disabled: 'ic_tune_low_off.png'},
  {enabled: 'ic_tune_medium.png', disabled: 'ic_tune_medium_off.png'},
  {enabled: 'ic_tune_loud.png', disabled: 'ic_tune_loud_off.png'},
  {enabled: 'ic_tune_blaring.png', disabled: 'ic_tune_blaring_off.png'},
];

const YOUTUBE_ICON_LOCATION = 'ic_youtube.svg';
const TWITTER_ICON_LOCATION = 'ic_twitter.svg';
const FACEBOOK_ICON_LOCATION = 'ic_facebook.svg';
const REDDIT_ICON_LOCATION = 'ic_reddit.svg';

type MouseEventType = 'drag' | 'click';

// A "radial" drag is a drag along the knob radius/perimeter. A "directional"
// drag is an up-down/left-right drag.
type DragType = 'radialDrag' | 'directionalDrag';

function getDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

function getDistance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

// Use polar coordinates to find the point on the circle with the given angle.
function getClosestDialPoint(angleRadians: number) {
  // Our dial starts at 3pi / 2 radians.
  const theta = angleRadians - Math.PI / 2;
  return {
    x: DIAL_RADIUS_PX * -Math.cos(theta), // Use negative because our dial goes in reverse.
    y: DIAL_RADIUS_PX * Math.sin(theta)
  };
}

// Using the border between the 3rd and 4th quadrants as 0 degrees, gets the
// clockwise angle of the point.
function getAngleRadians(p: Point): number {
  return Math.PI + Math.atan2(p.x, p.y);
}

function getElementCenter(element: Element): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + (rect.right - rect.left) / 2,
    y: rect.top + (rect.bottom - rect.top) / 2,
  };
}

export interface OpenSettingsEvent {
  // The tab on the settings page to navigate to.
  tab?: SettingsPage;
}

@Component({
  selector: 'tune-knob-page',
  templateUrl: './knob_page.component.html',
  styleUrls: ['./knob_page.component.css']
})

export class KnobPageComponent implements AfterViewInit, OnChanges {
  // TODO: This default causes some minor glitching. Because it takes some time
  // for the true state to be determined, the popup is always initialized
  // assuming that Tune is enabled. If it's actually disabled, then there's a
  // small glitch where the popup background is purple and then turns black
  // (same issue with the extension icon).
  @Input() tuneDisabled = false;
  @Input() interactionDisabled = false;

  @Input() navigationTabs: MatTabGroup;

  @Output() settingsButtonClicked = new EventEmitter<OpenSettingsEvent>();

  currentWebsite: WebsiteSettingName|null = null;
  enabledWebsites: EnabledWebsites = DEFAULT_WEBSITES;
  readonly websiteNameMap = WEBSITE_NAME_MAP;
  readonly settingsPage = SettingsPage;

  // Value from [0.0, 1.0] corresponding to the current dial position/threshold
  // setting.
  dialPosition: number;

  // Throttled version of setThreshold to avoid excessive updates when dragging
  // knob.
  updateSettingsThreshold: (threshold: number) => void;

  // Whether the settings page is currently visible.
  @Input() settingsVisible = false;

  knobDragType: DragType;
  knobDragStartMousePosition: MouseEvent;
  knobDragStartDialPosition: number;

  dialCenter: Point;

  applyAnimateInAnimationClass = false;

  waitingForAnimateIn = false;

  iconPath = '';

  // Min/max degree positions of the dial tail.
  readonly rotMin = 25;
  readonly rotMax = 335;
  readonly svgMin = 1176;
  readonly svgMax = 694;
  readonly overallWidth = 340;
  readonly knobSubDescriptionOptions = ['quiet', 'low', 'medium', 'loud', 'blaring'];

  // Note: this value isn't used by the knob page template; it's used by the
  // top-level app component since the entire background should change, not just
  // the background of the knob page component.
  bgChoice = '';
  // Top-level description, which shows "Hide/Show it all" at the dial
  // endpoints, and "keep it X" otherwise.
  knobDescriptionIndex = 0;
  // Index into 'knobSubDescriptionOptions'.
  knobSubDescriptionIndex = 0;
  svgProgressValue = 200;

  @ViewChild('dial') dial: ElementRef;
  @ViewChild('tail') dialTail: ElementRef;
  @ViewChild('bg') bg: ElementRef;
  @ViewChild('dragZone') dragZone: ElementRef;
  @ViewChild('circle') circle: ElementRef;
  @ViewChild('dialContainer') dialContainer: ElementRef;
  // Used for top-level description, including special "Hide it all" and "Show
  // it all" options at endpoints of the dial.
  @ViewChild('knobDescriptionCarousel') knobDescriptionCarousel: ElementRef;
  // When we aren't at the endpoints, we the knob description is "Keep it X".
  // This element is used to control which option is displayed.
  // TODO: maybe we should translate the sub-carousel along y instead of x?
  @ViewChild('knobSubDescriptionCarousel') knobSubDescriptionCarousel: ElementRef;

  constructor(private sanitizer: DomSanitizer,
              private matIconRegistry: MatIconRegistry,
              private tuneSettingsManagerService: TuneSettingsManagerService,
              private chromeMessageService: ChromeMessageService,
              private googleAnalyticsService: GoogleAnalyticsService) {
    this.updateSettingsThreshold = throttle(threshold => {
      this.tuneSettingsManagerService.setThreshold(threshold);
    }, THRESHOLD_CHANGE_THROTTLE);

    // Note: The bypassSecurity function is required to register svg files with
    // the icon registry. Alternate options are not currently available. This is
    // safe because it is pointing to a static file that is packaged with the
    // extension.
    matIconRegistry
      .addSvgIcon(ARROW_ICON, sanitizer.bypassSecurityTrustResourceUrl(ARROW_ICON_LOCATION))
      .addSvgIcon('youtube', sanitizer.bypassSecurityTrustResourceUrl(YOUTUBE_ICON_LOCATION))
      .addSvgIcon('twitter', sanitizer.bypassSecurityTrustResourceUrl(TWITTER_ICON_LOCATION))
      .addSvgIcon('facebook', sanitizer.bypassSecurityTrustResourceUrl(FACEBOOK_ICON_LOCATION))
      .addSvgIcon('reddit', sanitizer.bypassSecurityTrustResourceUrl(REDDIT_ICON_LOCATION));

    tuneSettingsManagerService.websites.subscribe((websites: EnabledWebsites) => {
      this.enabledWebsites = websites;
    });

    chromeMessageService.sendMessage({action: ChromeMessageEnum.GET_CURRENT_WEBSITE}).then(
      (response: GetCurrentWebsiteResponse) => {
        console.log('Current website', response.siteName);
        this.currentWebsite = response.siteName;
      }).catch((error) => {
        this.currentWebsite = null;
        // If there is no content script for the webpage, then the response
        // will be an error indicating that a connection could not be made.
        if (error.message === NO_CONTENT_SCRIPT_ERROR_MESSAGE) {
          console.log('Unsupported website');
        } else {
          console.error('Error fetching current website', error);
        }
      });
  }

  ngAfterViewInit() {
    this.calculateDialCenter();
    this.tuneSettingsManagerService.threshold.subscribe((threshold: number) => {
      console.log('initializing threshold:', threshold);
      if (this.applyAnimateInAnimationClass) {
        this.resetToZero().then(() => {
          this.setDialPosition(
            threshold, true /* animated */, false /* logEvent*/);
        });
      } else {
        // Wrap this in a Promise.resolve because any changes to state made here
        // that are referenced in data binding (several state variables are
        // updated when changing the dial position) can result in an
        // ExpressionChangedAfterItHasBeenCheckedError. For some reason this
        // error only seems to be happening in tests, possibly due to something
        // lifecycle-related that's specific to the test enviroment? Wrapping it
        // in a Promise.resolve forces the next change detection cycle and
        // prevents this error.
        // TODO: Find out if there is a way to fix the bug in the tests without
        // this workaround.
        Promise.resolve().then(() => {
          this.setDialPosition(
            threshold, false /* animated */, false /* logEvent*/);
        });
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tuneDisabled'] !== undefined) {
      // Update icon for different disable/enabled state.
      this.setIcon();
    }
  }

  resetToZero(): Promise<void> {
    this.dial.nativeElement.style.transition = 'none';
    this.circle.nativeElement.style.transition = 'none';

    // Turn off transitions for the carousel when setting to zero. For some
    // reason this doesn't work when using a flag and ngClass to update the CSS
    // class, probably because the transform is applied before change detection
    // gets called and updates the template.
    // TODO: We should rethink the way that we handle animations/transitions in
    // this component, because right now it's a mixture of manually setting
    // things and using CSS properties, and it's out of sync with the typical
    // Angular change detection cycle. We should look into Angular animations as
    // an alternative.
    const knobDescriptionCarouselTransition =
      window.getComputedStyle(this.knobDescriptionCarousel.nativeElement).transition;
    const knobSubDescriptionCarouselTransition =
      window.getComputedStyle(this.knobDescriptionCarousel.nativeElement).transition;

    this.knobDescriptionCarousel.nativeElement.style.transition = 'none';
    this.knobSubDescriptionCarousel.nativeElement.style.transition = 'none';
    this.setDialPosition(0, false /* animated */, false /* logEvent */);
    return new Promise((resolve, reject) => {
      // Without this setTimeout, the knob will immediately jump to the
      // threshold instead of animating from zero.
      // TODO: Investigate this further, and simplify this if possible.
      setTimeout(() => {
        // Reset the transition values of the carousel from before we reset to zero.
        this.knobDescriptionCarousel.nativeElement.style.transition =
          knobDescriptionCarouselTransition;
        this.knobSubDescriptionCarousel.nativeElement.style.transition =
          knobSubDescriptionCarouselTransition;
        resolve();
      }, 100);
    });
  }

  // Updates the state before animating in, which allows us to hide UI elements.
  // This is necessary to avoid a "flicker" in the animation that is caused by a
  // race between change detection in the parent component that makes this
  // component visible, and the call to animateInt(), which applies the styling
  // that hides everything.
  setPreAnimationState() {
    this.waitingForAnimateIn = true;
  }

  animateIn(): void {
    this.applyAnimateInAnimationClass = true;
    this.waitingForAnimateIn = false;
    setTimeout(() => {
      this.applyAnimateInAnimationClass = false;
    }, OPENING_TRANSITION_TIME_MS);
  }

  calculateDialCenter() {
    this.dialCenter = getElementCenter(this.dial.nativeElement);
  }

  handleDialMouseEvent(event: MouseEvent, eventType: MouseEventType): void {
    const dialRelativePoint = {x: event.x - this.dialCenter.x,
                               y: this.dialCenter.y - event.y};
    const angleRadians = getAngleRadians(dialRelativePoint);

    let animated: boolean;
    // For clicks, we only adjust the dial position if the click is close enough
    // to the dial perimeter. We don't do this check for drags to avoid sudden
    // interruptions in the middle of a drag.
    switch (eventType) {
      case 'click':
        const closestCirclePoint = getClosestDialPoint(angleRadians);
        const distanceFromDialEdge = getDistance(closestCirclePoint, dialRelativePoint);
        if (distanceFromDialEdge > DIAL_CLICK_TARGET_PX) {
          return;
        }
        animated = true;
        break;
      case 'drag':
        animated = false;
        break;
      default:
        throw new Error('BUG: unhandled eventType: ' + eventType);
    }

    const threshold =
      this.getThresholdFromKnobRotationDegrees(getDegrees(angleRadians));
    const logEvent = eventType === 'click';
    this.setDialPosition(threshold, animated, logEvent);
  }

  onDialClick(event: MouseEvent): void {
    if (this.shouldIgnoreKnobInteractionEvents()) {
      return;
    }
    console.log('handling dial click');
    this.handleDialMouseEvent(event, 'click');
  }

  closeToDialTail(event: MouseEvent): boolean {
    const tailCenter = getElementCenter(this.dialTail.nativeElement);
    return getDistance(tailCenter, event) < DIAL_TAIL_TARGET_PX;
  }

  shouldUseDisabledUIStyle(): boolean {
    return this.tuneDisabled
      || !this.enabledWebsites[this.currentWebsite];
  }

  shouldIgnoreKnobInteractionEvents(): boolean {
    return this.interactionDisabled
      || this.settingsVisible
      || this.currentWebsite === null
      || !this.enabledWebsites[this.currentWebsite];
  }

  onKnobDragStart(event: MouseEvent): void {
    if (this.shouldIgnoreKnobInteractionEvents()) {
      return;
    }
    this.knobDragType = this.closeToDialTail(event) ? 'radialDrag' : 'directionalDrag';
    console.log('handling drag:', this.knobDragType);
    this.knobDragStartMousePosition = event;
    this.knobDragStartDialPosition = this.dialPosition;
  }

  onKnobDragEnd(event: MouseEvent): void {
    this.googleAnalyticsService.emitEvent(
      EventCategory.DIAL,
      EventAction.DIAL_MOVE,
      null /* eventLabel */,
      this.dialPosition);
  }

  // Handles left-right and up-down mouse dragging.
  handleDirectionalDrag(event: MouseEvent): void {
    const dragDeltaX = event.x - this.knobDragStartMousePosition.x;
    // Flip delta Y because dragging up should increase the dial value (and vice
    // versa).
    const dragDeltaY = (event.y - this.knobDragStartMousePosition.y) * -1;
    const maxDelta = (Math.abs(dragDeltaX) > Math.abs(dragDeltaY)) ? dragDeltaX : dragDeltaY;
    // This controls how much the dial moves for a given drag distance. If 1,
    // the user needs to drag the entire window length to traverse the entire
    // dial range. 2 means teh user only needs to drag half the window length to
    // change from 0->1 or vice versa.
    const changeMultiplier = 2;
    const positionChange = maxDelta / this.overallWidth * changeMultiplier;
    this.setDialPosition(
      this.knobDragStartDialPosition + positionChange,
      false /* animated */,
      false /* logEvent */
    );
  }

  onKnobDrag(event: MouseEvent): void {
    if (this.shouldIgnoreKnobInteractionEvents()) {
      return;
    }
    // We get this on the final drag event with x and y = 0, oddly.
    if (event.x === 0 && event.y === 0) {
      return;
    }
    switch (this.knobDragType) {
      case 'radialDrag':
        this.handleDialMouseEvent(event, 'drag');
        break;
      case 'directionalDrag':
        this.handleDirectionalDrag(event);
        break;
      default:
        throw new Error('BUG: unhandled drag type: ' + this.knobDragType);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.shouldIgnoreKnobInteractionEvents()) {
      return;
    }
    // If a tab has focus, the arrow keys are reserved for keyboard navigation
    // for accessibility purposes, so we don't move the dial.
    if (this.navTabsHaveFocus()) {
      return;
    }

    console.log('handling keydown:', event);
    switch (event.code) {
      case 'ArrowLeft':
      case 'ArrowDown':
        this.decrementDialPosition();
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        this.incrementDialPosition();
        break;
      default:
        break;
    }
  }

  @HostListener('window:wheel', ['$event'])
  onScroll(event: WheelEvent): void {
    if (this.shouldIgnoreKnobInteractionEvents()) {
      return;
    }
    console.log('handling scroll:', event);
    const [left, right] = [event.deltaX < 0, event.deltaX > 0];
    const [down, up] = [event.deltaY > 0, event.deltaY < 0];
    // If anyone happens to have a fancy mouse with z-axis scrolling, this will
    // also work for them :-).
    const [in_, out] = [event.deltaZ < 0, event.deltaZ > 0];
    if (left || down || in_) {
      this.decrementDialPosition();
    } else if (right || up || out) {
      this.incrementDialPosition();
    }
  }

  // TODO: Not animating makes these a little abrupt, but animating makes them
  // feel too sluggish. Maybe have adjustable animation speed?
  decrementDialPosition(): void {
    this.setDialPosition(
      this.dialPosition - INPUT_DELTA_AMOUNT,
      false /* animated */,
      true /* logEvent */);
  }

  incrementDialPosition(): void {
    this.setDialPosition(
      this.dialPosition + INPUT_DELTA_AMOUNT,
      false /* animated */,
      true /* logEvent */);
  }

  setDialPosition(value: number, animated: boolean, logEvent: boolean): void {
    value = Math.min(Math.max(value, 0.0), 1.0);

    if (logEvent) {
      this.googleAnalyticsService.emitEvent(
        EventCategory.DIAL,
        EventAction.DIAL_MOVE,
        null /* eventLabel */,
        value);
    }

    this.updateSettingsThreshold(value);
    this.dialPosition = value;

    if (animated) {
      this.turnOnTransitions();
    }

    this.setTextDescription(value);
    this.setKnobRotation(value);
    this.setProgressSVG(value);
    this.setBackgroundColor(value);
    this.setIcon();
  }

  setIcon() {
    if (this.dialPosition === undefined || this.tuneDisabled === undefined) {
      // This can happen due to setIcon being called after tuneDisabled changes
      // but before the dial position is initialized.
      return;
    }
    const iconIndex = Math.min(Math.floor(this.dialPosition * TUNE_ICONS.length),
                               TUNE_ICONS.length - 1);
    const iconPair = TUNE_ICONS[iconIndex];
    const iconPath = this.tuneDisabled ? iconPair.disabled : iconPair.enabled;
    if (iconPath !== this.iconPath) {
      chrome.browserAction.setIcon({path: iconPath});
      this.iconPath = iconPath;
    }
  }

  // Note: we don't always use these long transitions because when dragging,
  // scrolling, or using arrow keys, the long transition makes the UI feel like
  // it's lagging (e.g., the dial posiiton trails behind the user's mouse
  // pointer).
  //
  // This causes issues with the background color transition. The background
  // color change happens via the top-level app.component template, and we can't
  // easily change the transition style from this contained component.
  // Currently, we hack around this by always using a compromise 0.5s transition
  // value.
  turnOnTransitions(): void {
    this.dial.nativeElement.style.transition = 'transform 1s ease-in-out';
    this.circle.nativeElement.style.transition = 'all 1s ease-in-out';
  }

  transitionEnd(e: Event): void {
    this.dial.nativeElement.style.transition = 'transform .2s linear';
    this.circle.nativeElement.style.transition = 'all .2s linear';
  }

  setTextDescription(threshold: number): void {
    // The text description elements are already laid out on the page. Changing
    // the visible description involves calculating the translation needed to
    // make the correct element visible through the "window" masks.

    // Set the position of the top-level carousel.
    if (threshold === 0.0) {
      this.knobDescriptionIndex = 0;  // hide it all
    } else if (threshold === 1.0) {
      this.knobDescriptionIndex = 2;  // show it all
    } else {
      this.knobDescriptionIndex = 1;  // keep it X
    }
    this.knobDescriptionCarousel.nativeElement.style.transform = 'translate('
      + String(this.knobDescriptionIndex * -1 * KNOB_DESCRIPTION_WIDTH) + 'px, 0)';

    // Set the position of the secondary carousel for the "keep it" choice.
    if (threshold >= BLARING_THRESHOLD) {
      this.knobSubDescriptionIndex = 4;
    } else if (threshold >= LOUD_THRESHOLD) {
      this.knobSubDescriptionIndex = 3;
    } else if (threshold >= MEDIUM_THRESHOLD) {
      this.knobSubDescriptionIndex = 2;
    } else if (threshold >= LOW_THRESHOLD) {
      this.knobSubDescriptionIndex = 1;
    } else {
      this.knobSubDescriptionIndex = 0;
    }
    this.knobSubDescriptionCarousel.nativeElement.style.transform = 'translate('
      + String(this.knobSubDescriptionIndex * -1 * TEXT_CHOICE_WIDTH) + 'px, 0)';
  }

  setKnobRotation(threshold: number): void {
    this.dial.nativeElement.style.transform =
      'rotate(' + this.getRotationDegreesFromThreshold(threshold) + 'deg)';
  }

  getRotationDegreesFromThreshold(threshold: number): number {
    return threshold * (this.rotMax - this.rotMin) + this.rotMin;
  }

  getThresholdFromKnobRotationDegrees(rotationDeg: number): number {
    return (rotationDeg - this.rotMin) / (this.rotMax - this.rotMin);
  }

  setProgressSVG(threshold: number): void {
    this.svgProgressValue = threshold * (this.svgMax - this.svgMin) + this.svgMin;
  }

  setBackgroundColor(threshold: number): void {
    this.bgChoice = colorGradient(threshold);
  }

  openSettings(tab?: SettingsPage): void {
    const openSettingsEvent: OpenSettingsEvent = {};
    if (tab) {
      openSettingsEvent.tab = tab;
    }
    this.settingsButtonClicked.emit(openSettingsEvent);
  }

  openDisabledPageLink(url: OutgoingLinkName) {
    chrome.tabs.create({url: url, active: false});
    this.googleAnalyticsService.emitEvent(
      EventCategory.DISABLED_PAGE_OUTGOING_LINK, EventAction.CLICK, url);
  }

  round(value: number): number {
    return Math.round(value);
  }

  getKnobA11yAnnouncement(): string {
    let message = 'Dial position: ' + this.round(this.dialPosition * 100) + ' percent.';
    switch (this.knobDescriptionIndex) {
      case 0:
        message += 'Hide it all';
        break;
      case 1:
        message += 'Keep it ' + this.knobSubDescriptionOptions[this.knobSubDescriptionIndex];
        break;
      case 2:
        message += 'Show it all';
        break;
      default:
        break;
    }
    return message;
  }

  /** Queries the MatTabGroup to see if any of the tabs have focus. */
  navTabsHaveFocus(): boolean {
    // Technically the more *correct* thing to do here would be to pass the
    // ElementRef directly from the parent rather than access the _elementRef
    // property, but that would require adding a duplicate ViewChild on the
    // parent, which seemed unnecessary.
    //
    // This overall solution is a hack, since calling querySelector is outside
    // the Angular pattern. We should look into alternative solutions.
    return this.navigationTabs._elementRef.nativeElement.querySelector(
      '.mat-tab-label.cdk-keyboard-focused') !== null;
  }

  onHideAllClicked() {
    this.googleAnalyticsService.emitEvent(
      EventCategory.HIDE_ALL, EventAction.CLICK);

  }

  onShowAllClicked() {
    this.googleAnalyticsService.emitEvent(
      EventCategory.SHOW_ALL, EventAction.CLICK);
  }

  onSettingsButtonClicked() {
    this.googleAnalyticsService.emitEvent(
      EventCategory.SETTINGS_BUTTON, EventAction.CLICK);

  }
}

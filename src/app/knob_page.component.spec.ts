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
import { TestBed, ComponentFixture, async } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';

import { KnobPageComponent } from './knob_page.component';

import { ChromeMessageService } from './chrome_message.service';
import { TuneSettingsManagerService } from './tune_settings_manager.service';
import { GoogleAnalyticsService } from './google_analytics.service';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';
import { WEBSITE_NAMES, DEFAULT_WEBSITES } from '../tune_settings';

import * as chrome from 'sinon-chrome';
window.chrome = chrome as any;

@Component({
  selector: 'tune-knob-page-test-component',
  template: `
        <mat-tab-group #tabGroup></mat-tab-group>
        <tune-knob-page [interactionDisabled]="false"
                        [navigationTabs]="tabGroup">
        </tune-knob-page>
  `,
})
class KnobPageTestComponent {
  @ViewChild(KnobPageComponent) knobPage: KnobPageComponent;
}

describe('KnobPageComponent', () => {
  let fixture: ComponentFixture<KnobPageTestComponent>;
  let knobPage: KnobPageComponent;
  let settingsSavedThreshold: number|null = null;

  beforeEach(async(() => {
    const googleAnalyticsServiceMock = {
      appendGaTrackingCode: (hostElement) => {
        console.log('mock appendGaTrackingCode');
      },
      emitEvent: (eventCategory: string, eventAction: string,
                eventLabel: string|null = null,
                eventValue: number|null = null) => {
        console.log(
          'mock emitEvent', eventCategory, eventAction, eventLabel, eventValue);
      }
    };
    // TODO: Using a mock here because the chrome local storage API isn't
    // available. Maybe we should use a spy instead?
    const settingsManagerServiceMock = {
      threshold: of(0.5),
      websites: of(DEFAULT_WEBSITES),
      setThreshold: (x) => {
        console.log('mock setThreshold:', x);
        settingsSavedThreshold = x;
      },
    };

    const chromeMessageServiceMock = {
      sendMessage: (chromeMessage) => {
        console.log('mock sendMessage', chromeMessage);
        return Promise.resolve({siteName: WEBSITE_NAMES.youtube});
      }
    };
    TestBed.configureTestingModule({
      declarations: [
        KnobPageComponent,
        KnobPageTestComponent,
      ],
      imports: [
        NoopAnimationsModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        HttpClientTestingModule,  // Needed for MatIconModule.
      ],
      providers: [
        {
          provide: GoogleAnalyticsService,
          useValue: googleAnalyticsServiceMock
        },
        {
          provide: TuneSettingsManagerService,
          useValue: settingsManagerServiceMock
        },
        {
          provide: ChromeMessageService,
          useValue: chromeMessageServiceMock
        }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(KnobPageTestComponent);
    fixture.detectChanges();
    knobPage = fixture.componentInstance.knobPage;
  }));

  it('should increase dial position on up/right', () => {
    const initialPosition = knobPage.dialPosition;

    window.dispatchEvent(new KeyboardEvent('keydown', {'code': 'ArrowUp'}));
    const positionAfterArrowUp = knobPage.dialPosition;
    expect(positionAfterArrowUp).toBeGreaterThan(initialPosition);

    window.dispatchEvent(new KeyboardEvent('keydown', {'code': 'ArrowRight'}));
    expect(knobPage.dialPosition).toBeGreaterThan(positionAfterArrowUp);
  });

  it('should decrease dial position on down/left', () => {
    const initialPosition = knobPage.dialPosition;

    window.dispatchEvent(new KeyboardEvent('keydown', {'code': 'ArrowDown'}));
    const positionAfterArrowDown = knobPage.dialPosition;
    expect(positionAfterArrowDown).toBeLessThan(initialPosition);

    window.dispatchEvent(new KeyboardEvent('keydown', {'code': 'ArrowLeft'}));
    expect(knobPage.dialPosition).toBeLessThan(positionAfterArrowDown);
  });

  it('should change dial position on scroll', () => {
    const initialPosition = knobPage.dialPosition;

    window.dispatchEvent(new WheelEvent('wheel', {'deltaY': 10}));
    expect(knobPage.dialPosition).toBeLessThan(initialPosition);

    // Note that the amount of scroll doesn't matter (since this varies
    // depending on the user's browser/OS settings - we treat each scroll
    // event as a single increment.
    window.dispatchEvent(new WheelEvent('wheel', {'deltaY': -20}));
    expect(knobPage.dialPosition).toEqual(initialPosition);
  });

  it('should change dial position on mouse click', () => {
    // TODO: the click handler is on the dialContainer element. Can we put all
    // the handlers on the dial?
    const dial = knobPage.dialContainer.nativeElement;

    // Click on the left and right sides of the dial.
    dial.dispatchEvent(new MouseEvent(
      'click',
      {'clientX': knobPage.dialCenter.x - 50, 'clientY': knobPage.dialCenter.y}));
    expect(knobPage.dialPosition).toBeLessThan(0.5);

    dial.dispatchEvent(new MouseEvent(
      'click',
      {'clientX': knobPage.dialCenter.x + 50, 'clientY': knobPage.dialCenter.y}));
    expect(knobPage.dialPosition).toBeGreaterThan(0.5);
  });

  it('should change dial position on directional mouse drag', () => {
    // TODO: drag handlers are on the dragZone element. Can we put all the
    // handlers on the dial?
    const dragZone = knobPage.dragZone.nativeElement;

    // Mostly-rightwards horizontal drag.
    const initialPosition = knobPage.dialPosition;
    dragZone.dispatchEvent(new MouseEvent('dragstart', {'clientX': 1, 'clientY': 1}));
    dragZone.dispatchEvent(new MouseEvent('drag', {'clientX': 10, 'clientY': 3}));
    const positionAfterRightDrag = knobPage.dialPosition;
    expect(positionAfterRightDrag).toBeGreaterThan(initialPosition);

    // Mostly-downwards drag.
    dragZone.dispatchEvent(new MouseEvent('dragstart', {'clientX': 1, 'clientY': 1}));
    dragZone.dispatchEvent(new MouseEvent('drag', {'clientX': 3, 'clientY': 23}));
    const positionAfterDownwardsDrag = knobPage.dialPosition;
    expect(positionAfterDownwardsDrag).toBeLessThan(positionAfterRightDrag);
  });

  // TODO: radial drag around the circle is untested. a little tricky..

  it('should save threshold to settings manager', () => {
    knobPage.setDialPosition(0.33, false, false);
    expect(knobPage.dialPosition).toEqual(0.33);
    expect(settingsSavedThreshold).toEqual(0.33);
  });

  it('should show special descriptions for dial endpoints', () => {
    const descriptionCarousel = fixture.nativeElement.querySelector('.knobDescriptionChoice > .carousel');

    knobPage.setDialPosition(0.0, false, false);
    fixture.detectChanges();
    expect(knobPage.knobDescriptionIndex).toBe(0);

    for (const child of descriptionCarousel.children) {
      if (child.innerText === 'Hide it all') {
        expect(child.getAttribute('aria-hidden')).toBe('false');
      } else {
        expect(child.getAttribute('aria-hidden')).toBe('true');
      }
    }

    knobPage.setDialPosition(1.0, false, false);
    fixture.detectChanges();
    expect(knobPage.knobDescriptionIndex).toBe(2);
    for (const child of descriptionCarousel.children) {
      if (child.innerText === 'Show it all') {
        expect(child.getAttribute('aria-hidden')).toBe('false');
      } else {
        expect(child.getAttribute('aria-hidden')).toBe('true');
      }
    }
  });

  it('should update "Keep it X" text description', () => {
    const wordCarousel = fixture.nativeElement.querySelector('.knobSubDescriptionChoice > .carousel');

    knobPage.setDialPosition(0.10, false, false);
    fixture.detectChanges();
    expect(knobPage.knobSubDescriptionIndex).toBe(0);
    for (const child of wordCarousel.children) {
      if (child.innerText === 'quiet') {
        expect(child.getAttribute('aria-hidden')).toBe('false');
      } else {
        expect(child.getAttribute('aria-hidden')).toBe('true');
      }
    }

    knobPage.setDialPosition(0.90, false, false);
    fixture.detectChanges();
    expect(knobPage.knobSubDescriptionIndex).toBe(4);
    for (const child of wordCarousel.children) {
      if (child.innerText === 'blaring') {
        expect(child.getAttribute('aria-hidden')).toBe('false');
      } else {
        expect(child.getAttribute('aria-hidden')).toBe('true');
      }
    }
  });

  it('Clicking settings button emits event', (done: () => void) => {
    knobPage.settingsButtonClicked.subscribe(() => {
      done();
    });
    const settingsButton = fixture.debugElement.query(
      By.css('.settingsButtonContainer > button')).nativeElement;
    settingsButton.click();
    fixture.detectChanges();
  });
});

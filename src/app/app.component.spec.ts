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

import { TestBed, async } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AboutPageComponent } from './about_page.component';
import { AppComponent } from './app.component';
import { AttributeInfoComponent } from './attribute_info.component';
import { FeedbackPageComponent } from './feedback_page.component';
import { HeaderComponent } from './header.component';
import { KnobPageComponent } from './knob_page.component';
import { SettingsPageComponent } from './settings_page.component';
import { SetupFlowComponent } from './setup_flow.component';
import { SubtypeSettingsComponent } from './subtype_settings.component';
import { ThemePageComponent } from './theme_page.component';
import { ThemeTileComponent } from './theme_tile.component';
import { WebsiteSettingsComponent } from './website_settings.component';

import { HandleCustomStylePipe } from './handle_custom_style.pipe';
import { GoogleAnalyticsService } from './google_analytics.service';
import { TuneSettingsManagerService } from './tune_settings_manager.service';
import { ChromeMessageService } from './chrome_message.service';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatListModule } from '@angular/material/list';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';

// Mock out chrome.
import * as chrome from 'sinon-chrome';
// Note: The any cast is required since the SinonChrome typing is incomplete
// and is missing the field "accessibilityFeatures".
// TODO: Maybe send them a PR to fix this?
window.chrome = chrome as any;

describe('AppComponent', () => {
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
    TestBed.configureTestingModule({
      declarations: [
        AboutPageComponent,
        AppComponent,
        AttributeInfoComponent,
        FeedbackPageComponent,
        HandleCustomStylePipe,
        HeaderComponent,
        KnobPageComponent,
        SettingsPageComponent,
        SetupFlowComponent,
        SubtypeSettingsComponent,
        ThemePageComponent,
        ThemeTileComponent,
        WebsiteSettingsComponent
      ],
      imports: [
        NoopAnimationsModule,
        FormsModule,
        HttpClientTestingModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatGridListModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatRadioModule,
        MatSliderModule,
        MatSlideToggleModule,
        MatTabsModule
      ],
      providers: [
        ChromeMessageService,
        {
          provide: GoogleAnalyticsService,
          useValue: googleAnalyticsServiceMock
        },
        TuneSettingsManagerService
      ]
    }).compileComponents();
  }));

  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));

  it(`should have as title 'app'`, async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('app');
  }));

  // Note: Writing any tests with AppComponent that use fixture.detectChanges()
  // triggers bug https://github.com/angular/material2/issues/12197 which causes
  // a test failure. Once this bug is fixed, we should reenable this test and
  // add more tests for app navigation.
  xit('Should navigate to settings page', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.debugElement.componentInstance;
    expect(app.knobComponent.settingsVisible).toBe(false);
    const settingsButton = fixture.nativeElement.querySelector('.settingsButtonContainer > button');
    settingsButton.click();
    fixture.detectChanges();
    expect(app.knobComponent.settingsVisible).toBe(true);
  }));
});

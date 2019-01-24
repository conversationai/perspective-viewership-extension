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

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';

import { AboutPageComponent } from './about_page.component';
import { AppComponent } from './app.component';
import { AttributeInfoComponent } from './attribute_info.component';
import { FeedbackPageComponent } from './feedback_page.component';
import { GoogleAnalyticsService } from './google_analytics.service';
import { HeaderComponent } from './header.component';
import { KnobPageComponent } from './knob_page.component';
import { SettingsPageComponent } from './settings_page.component';
import { SetupFlowComponent } from './setup_flow.component';
import { SubtypeSettingsComponent } from './subtype_settings.component';
import { ThemePageComponent } from './theme_page.component';
import { ThemeTileComponent } from './theme_tile.component';
import { WebsiteSettingsComponent } from './website_settings.component';

import { HandleCustomStylePipe } from './handle_custom_style.pipe';
import { TuneSettingsManagerService } from './tune_settings_manager.service';
import { ChromeMessageService } from './chrome_message.service';

@NgModule({
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
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
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
    GoogleAnalyticsService,
    TuneSettingsManagerService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

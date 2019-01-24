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

import { Component } from '@angular/core';
import { ThemeType, DEFAULT_THEME } from '../tune_settings';
import { TuneSettingsManagerService } from './tune_settings_manager.service';

export interface Theme {
  name: ThemeType;
  imageUrl: string;
}

@Component({
  selector: 'tune-theme-page',
  templateUrl: './theme_page.component.html',
  styleUrls: ['./theme_page.component.css']
})
export class ThemePageComponent {
  public themes: Theme[] = [
    {name: 'Dotted', imageUrl: 'theme-dotted.svg'},
    {name: 'Debug', imageUrl: ''}
  ];

  private selectedThemeName = DEFAULT_THEME;

  constructor(private tuneSettingsManagerService: TuneSettingsManagerService) {
    this.tuneSettingsManagerService.theme.subscribe(
      (theme: ThemeType) => {
        this.selectedThemeName = theme;
      });
  }

  setSelectedTheme(theme: Theme) {
    this.selectedThemeName = theme.name;
    this.tuneSettingsManagerService.setTheme(this.selectedThemeName);
  }

  isSelectedTheme(theme: Theme): boolean {
    return theme.name === this.selectedThemeName;
  }
}

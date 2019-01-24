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

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnInit,
  ViewChild
} from '@angular/core';
import { TUNE_STATE } from '../site_tuner';
import { AttributeScores, ATTRIBUTE_NAMES } from '../../scores';
import { colorGradient } from '../../scores';

/**
 * Component wrapper with a debug theme for tune that shows all the attributes
 * and their scores.
 */
@Component({
  selector: 'tune-debug-comment-wrapper',
  templateUrl: './debug_comment_wrapper.component.html',
  styleUrls: ['./debug_comment_wrapper.component.css']
})
export class DebugCommentWrapperComponent {
  // Component attributes have to be passed as a string.
  @Input() tuneScores: string;
  @Input() maxAttribute: string;
  @ViewChild('commentWrapper') commentWrapper: ElementRef;

  readonly attributeScoreTypeKeys = ATTRIBUTE_NAMES;

  // Customizable classes that are platform specific, override in subclass.
  customHorizontalUIWrapperClass = '';
  customPlaceholderClass = '';

  // Since we have disabled ngZone, we must do change detection manually, so we
  // inject ChangeDetectorRef.
  constructor(protected changeDetectorRef: ChangeDetectorRef) {
  }

  getParsedAttributes(): AttributeScores {
    return JSON.parse(this.tuneScores);
  }

  twoDecimals(x: number): number {
    return Math.round(x * 100) / 100;
  }

  getColorForScore(score: number): string {
    return colorGradient(score);
  }
}

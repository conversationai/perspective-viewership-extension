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

// Attribute and score types, and functions on attribute scores.
//
// TODO: it would be nice to use fancier type system features here for
// better checks and less duplication. For example, not enumerating names of
// attributes as arrays as well as in types, and ensuring that the various
// mappings are exact (cover all attributes, and don't contain extra fields).

// Attributes exposed to users in Tune settings.
import * as tinygradient from 'tinygradient';
import * as assert from 'assert';

export type SettingAttributeName = 'identityAttack' | 'insult' | 'profanity' | 'threat' | 'sexuallyExplicit';
export const SETTING_ATTRIBUTE_NAMES: Array<SettingAttributeName> = ['identityAttack', 'insult', 'profanity', 'threat', 'sexuallyExplicit'];

// All attributes.
export type AttributeName = SettingAttributeName | 'toxicity' | 'severeToxicity' | 'likelyToReject';
export const ATTRIBUTE_NAMES: Array<AttributeName> =
  (SETTING_ATTRIBUTE_NAMES as Array<AttributeName>).concat(['toxicity', 'severeToxicity', 'likelyToReject']);

// Perspective API Attribute names.
export type ApiAttributeName =
  'TOXICITY' | 'SEVERE_TOXICITY'
  | 'IDENTITY_ATTACK' | 'INSULT' | 'PROFANITY' | 'THREAT' | 'SEXUALLY_EXPLICIT'
  | 'LIKELY_TO_REJECT';
export const API_ATTRIBUTE_NAMES: Array<ApiAttributeName> = [
  'TOXICITY',
  'SEVERE_TOXICITY',
  'IDENTITY_ATTACK',
  'INSULT',
  'PROFANITY',
  'THREAT',
  'SEXUALLY_EXPLICIT',
  'LIKELY_TO_REJECT'
];

// A single attribute score.
export interface AttributeScore {
  attribute: AttributeName;
  score: number;
}

// Scores for all attributes for a comment.
export type AttributeScores = {
  [key in AttributeName]: number;
};

// User's settings of which attributes are enabled.
export type EnabledAttributes = {
  [key in SettingAttributeName]: boolean;
};

// Mapping used to convert API attribute names to Tune Attribute type.
type ApiToAttributeName = {
  [key in ApiAttributeName]: AttributeName;
};

type AttributeToApiName = {
  [key in AttributeName]: ApiAttributeName;
};

// TODO: can we just have 1 copy?
const API_TO_ATTRIBUTE_NAME_MAP: ApiToAttributeName = {
  'IDENTITY_ATTACK': 'identityAttack',
  'INSULT': 'insult',
  'PROFANITY': 'profanity',
  'THREAT': 'threat',
  'SEXUALLY_EXPLICIT': 'sexuallyExplicit',
  'TOXICITY': 'toxicity',
  'SEVERE_TOXICITY': 'severeToxicity',
  'LIKELY_TO_REJECT': 'likelyToReject',
};

const ATTRIBUTE_TO_API_NAME_MAP: AttributeToApiName = {
  'identityAttack': 'IDENTITY_ATTACK',
  'insult': 'INSULT',
  'profanity': 'PROFANITY',
  'threat': 'THREAT',
  'sexuallyExplicit': 'SEXUALLY_EXPLICIT',
  'toxicity': 'TOXICITY',
  'severeToxicity': 'SEVERE_TOXICITY',
  'likelyToReject': 'LIKELY_TO_REJECT',
};

// Converts API Attribute name to field name used in AttributeScores type.
export function convertApiAttributeName(apiAttribute: ApiAttributeName): AttributeName {
  const fieldName = API_TO_ATTRIBUTE_NAME_MAP[apiAttribute];
  if (fieldName === undefined) {
    throw new Error('Unknown API attribute name:' + apiAttribute);
  }
  return fieldName;
}

// Convert AttributeName to API attribute name.
export function convertAttributeToApiName(attribute: AttributeName): ApiAttributeName {
  return ATTRIBUTE_TO_API_NAME_MAP[attribute];
}

// Mapping from AttributeName to strings (e.g., for displaying to the user).
type AttributeToString = {
  [key in AttributeName]: string;
};

// Converts AttributeScoreType to human-friendly names for display.
export const ATTRIBUTE_NAME_MAP: AttributeToString = {
  'identityAttack': 'Attack on identity',
  'insult': 'Insult',
  'profanity': 'Profanity',
  'threat': 'Threat',
  'sexuallyExplicit': 'Sexually explicit',
  'toxicity': 'Toxic',
  'severeToxicity': 'Toxic',
  // TODO: We need to decide if we want to show this to users or not.
  // Leaving in for now to aid in debugging.
  'likelyToReject': 'Low quality',
};

// TODO: refactor all this code once we're more confident in the logic
// we want here.

// 0 to 0.15: quiet
// 0.15 to 0.38: low
// 0.38 to 0.62: mediun
// 0.62 to 0.85: loud
// 0.85 to 1.0: blaring
export const LOW_THRESHOLD = 0.15;
export const MEDIUM_THRESHOLD = 0.38;
export const LOUD_THRESHOLD = 0.62;
export const BLARING_THRESHOLD = 0.85;

// TODO: Typings for tinygradient seem to be broken?
// Fix and then remove any cast.
const gradient = tinygradient([
  {color: '#512DA8', pos: 0},
  {color: '#6B2999', pos: LOW_THRESHOLD},
  {color: '#86268A', pos: MEDIUM_THRESHOLD},
  {color: '#AF2075', pos: LOUD_THRESHOLD},
  {color: '#C31D6A', pos: BLARING_THRESHOLD},
  {color: '#D81B60', pos: 1}
] as any);

// Returns the color gradient value at the specified threshold.
// Dark purple-ish to bright pink-ish.
export function colorGradient(threshold: number): string {
  return gradient.rgbAt(threshold).toRgbString();
}

// When we don't know the scores (typically due to unsupported language), we
// hide the comments when the threshold is below this level.
const HIDE_COMMENTS_WITH_MISSING_SCORES_THRESHOLD = 0.3;

// When threshold is low, we hide everything.
const HIDE_EVERYTHING_THRESHOLD = 0.01;

// When threshold is high, we show everything.
const SHOW_EVERYTHING_THRESHOLD = 0.99;

function allAttributesEnabled(enabledAttributes: EnabledAttributes): boolean {
  for (const attr in enabledAttributes) {
    if (!enabledAttributes[attr]) {
      return false;
    }
  }
  return true;
}

function noAttributesEnabled(enabledAttributes: EnabledAttributes): boolean {
  for (const attr in enabledAttributes) {
    if (enabledAttributes[attr]) {
      return false;
    }
  }
  return true;
}

function shouldConsiderAttribute(attribute: AttributeName, enabledAttributes: EnabledAttributes)
: boolean {
  // Attribute was explicitly enabled.
  if (enabledAttributes[attribute]) {
    return true;
  }
  // Consider severe toxicity unless all attributes are disabled.
  if (attribute === 'severeToxicity' && (!noAttributesEnabled(enabledAttributes))) {
    return true;
  }
  return false;
}

function getSevereToxicityScore(scores: AttributeScores): AttributeScore|null {
  if (scores.severeToxicity === null) {
    return null;
  }
  return {attribute: 'severeToxicity', score: scores.severeToxicity};

}

function getToxicityScore(scores: AttributeScores): AttributeScore|null {
  if (scores.toxicity === null) {
    return null;
  }
  return {attribute: 'toxicity', score: scores.toxicity};
}

function maxEnabledAttributeScore(
  scores: AttributeScores,
  enabledAttributes: EnabledAttributes,
  subtypesEnabled: boolean)
: AttributeScore|null {
  if (!subtypesEnabled) {
    return { attribute: 'toxicity', score: scores.toxicity };
  }

  let currentMax: AttributeScore|null = null;
  for (const attributeKey of Object.keys(scores)) {
    const attribute = attributeKey as AttributeName;
    const attributeScore = scores[attribute];
    if (shouldConsiderAttribute(attribute, enabledAttributes)
        && (currentMax === null || attributeScore > currentMax.score)) {
      currentMax = { attribute: attribute, score: attributeScore };
    }
  }
  return currentMax;
}

// Note: This doesn't clip, so if x is outside the [fromA, fromB] range, the
// output will be outside the [toA, toB] range.
export function linscale(
  x: number,
  [fromA, fromB]: [number, number],
  [toA, toB]: [number, number])
: number {
  const fracAlongOrigScale = (x - fromA) / (fromB - fromA);
  const valueAlongNewScale = fracAlongOrigScale * (toB - toA) + toA;
  return valueAlongNewScale;
}

function shouldHideCommentDueToSevereToxicity(
  severeToxicityScore: number, maxAttributeScore: AttributeScore|null, threshold: number)
: HideCommentDueToScores|null {
  const boundedThreshold = Math.max(threshold, BLARING_THRESHOLD);
  if (severeToxicityScore < boundedThreshold) {
    return null;
  }

  const status: HideCommentDueToScores = {
    kind: 'hideCommentDueToScores',
    attribute: 'severeToxicity',
    scaledScore: severeToxicityScore,
  };

  if (maxAttributeScore !== null && maxAttributeScore.score >= LOUD_THRESHOLD) {
    // If there's a high subtype attribute score, we use that as the attribute
    // for display purposes.
    status.attribute = maxAttributeScore.attribute;
  }

  return status;
}

// We map the ML probability score range (0.4, 1.0) to the Tune dial range
// between low and blaring. The goal is to map the "useful signal" to the dial
// setting. Once scores go below ~0.4, we no longer have any confidence that the
// comment classifies as any of the enabled attributes.
export function scaleEnabledAttributeScore(score: number) {
  return linscale(score,
                  [0.4, 1.0] /* from */,
                  [LOW_THRESHOLD, BLARING_THRESHOLD] /* to */);
}

function shouldHideCommentDueToAttributeScore(
  attributeScore: AttributeScore|null, threshold: number)
: HideCommentDueToScores|null {
  if (attributeScore === null || threshold > BLARING_THRESHOLD) {
    return null;
  }
  const boundedThreshold = Math.max(threshold, LOW_THRESHOLD);
  const scaledScore = scaleEnabledAttributeScore(attributeScore.score);
  if (scaledScore < boundedThreshold) {
    return null;
  }
  return {
    kind: 'hideCommentDueToScores',
    attribute: attributeScore.attribute,
    scaledScore: scaledScore,
  }
}

function shouldHideCommentDueToLowQuality(
  scores: AttributeScores, maxAttributeScore: AttributeScore|null, threshold: number)
: HideCommentDueToScores|null {
  if (threshold > LOW_THRESHOLD) {
    return null;
  }
  // Hack: Likely to reject is very sensitive, so we scale it down a bit.
  const scaledLikelyToReject = scores.likelyToReject * 0.6;
  // Show comments that have *either* low likelytoReject score (i.e. similar to
  // NYT-accepted comment), *or* low toxicity score (i.e. positive friendly
  // stuff). To hide a comment, both criteria need to fail.
  if (scores.toxicity < threshold || scaledLikelyToReject < threshold) {
    return null;
  }
  const decision: HideCommentDueToScores = {
    kind: 'hideCommentDueToScores',
    attribute: 'toxicity',
    scaledScore: scores.toxicity,
  };
  if (maxAttributeScore !== null) {
    decision.attribute = maxAttributeScore.attribute;
  }
  return decision;
}

// Response type for whether a comment should be hidden.
export type CommentVisibilityDecision =
  ShowComment
  | HideCommentDueToScores
  | HideCommentDueToUnsupportedLanguage;

export interface ShowComment {
  kind: 'showComment';
}

export interface HideCommentDueToScores {
  kind: 'hideCommentDueToScores';
  attribute: AttributeName|null;
  scaledScore: number;  // scaled score.
}

export interface HideCommentDueToUnsupportedLanguage {
  kind: 'hideCommentDueToUnsupportedLanguage';
}

export const SHOW_COMMENT: ShowComment = { kind: 'showComment' };
export const HIDE_COMMENT_DUE_TO_UNSUPPORTED_LANGUAGE: HideCommentDueToUnsupportedLanguage = {
  kind: 'hideCommentDueToUnsupportedLanguage'
};

// Returned by getCommentVisibility when the comment should be hidden because
// the user chose an extremely low threshold. This is a hack: since some
// comments may have extremely low scores, the user may be confused that not all
// comments are hidden when they set the threshold to what appears to be 0, but
// isn't quite 0.
//
// TODO: is this hack still needed?
const HIDE_EVERYTHING_ATTRIBUTE_SCORE: HideCommentDueToScores =
  { kind: 'hideCommentDueToScores',
    attribute: null,
    scaledScore: 0,
  };

// Determines whether a comment with the given `scores` should be hidden for the
// given `threshold` and `enabledAttributes`.
export function getCommentVisibility(
  scores: AttributeScores,
  threshold: number,
  enabledAttributes: EnabledAttributes,
  subtypesEnabled: boolean)
: CommentVisibilityDecision {
  // TODO: enable strict null checking. should make this unnecessary.
  if (scores === null || scores === undefined) {
    console.error('Error: called with null/undefined scores:', scores);
    return SHOW_COMMENT;
  }

  if (threshold >= SHOW_EVERYTHING_THRESHOLD) {
    return SHOW_COMMENT;
  }

  const missingScores = Object.keys(scores).length === 0;
  if (missingScores) {
    if (threshold < HIDE_COMMENTS_WITH_MISSING_SCORES_THRESHOLD) {
      return HIDE_COMMENT_DUE_TO_UNSUPPORTED_LANGUAGE;
    } else {
      return SHOW_COMMENT;
    }
  }

  const maxAttributeScore = maxEnabledAttributeScore(scores, enabledAttributes, subtypesEnabled);

  const severeToxicityHideReason = shouldHideCommentDueToSevereToxicity(
    scores.severeToxicity, maxAttributeScore, threshold);
  if (severeToxicityHideReason !== null) { return severeToxicityHideReason; }

  const attributeScoreHideReason = shouldHideCommentDueToAttributeScore(
    maxAttributeScore, threshold);
  if (attributeScoreHideReason !== null) { return attributeScoreHideReason; }

  const lowQualityHideReason = shouldHideCommentDueToLowQuality(
    scores, maxAttributeScore, threshold);
  if (lowQualityHideReason !== null) { return lowQualityHideReason; }

  if (threshold <= HIDE_EVERYTHING_THRESHOLD) {
    return HIDE_EVERYTHING_ATTRIBUTE_SCORE;
  }

  return SHOW_COMMENT;
}

// Note: these include trailing spaces so we can concatenate directly with
// attribute name.
const ATTRIBUTE_PREFIX_MAP: AttributeToString = {
  'identityAttack': 'an',
  'insult': 'an',
  'profanity': '',
  'threat': 'a',
  'sexuallyExplicit': '',
  'toxicity': '',
  'severeToxicity': '',
  'likelyToReject': '',
};

function attributeWithPrefix(attribute: string): string {
  const prefix = ATTRIBUTE_PREFIX_MAP[attribute];
  const friendlyAttribute = ATTRIBUTE_NAME_MAP[attribute].toLowerCase();
  if (prefix) {
    return prefix + ' ' + friendlyAttribute;
  } else {
    return friendlyAttribute;
  }
}

function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
}

// Returns text description of the CommentVisibilityDescription to be displayed
// to the user.
export function getHideReasonDescription(commentVisibility: CommentVisibilityDecision): string {
  if (commentVisibility.kind === 'showComment') {
    return '';
  } else if (commentVisibility.kind === 'hideCommentDueToUnsupportedLanguage') {
    return "Tune doesn't current support this language.";
  } else {
    assert(commentVisibility.kind === 'hideCommentDueToScores');
    if (commentVisibility.scaledScore >= BLARING_THRESHOLD) {
      return 'Blaring';
    } else if (commentVisibility.scaledScore >= LOUD_THRESHOLD) {
      return 'Loud';
    } else if (commentVisibility.scaledScore >= MEDIUM_THRESHOLD) {
      return 'Medium';
    } else if (commentVisibility.scaledScore >= LOW_THRESHOLD) {
      return 'Low';
    } else {
      return 'Quiet';
    }
  }
}

export function getFeedbackQuestion(commentVisibility: CommentVisibilityDecision,
                                    subtypesEnabled: boolean)
: string {
  if (commentVisibility.kind === 'showComment') {
    return '';
  }
  if (subtypesEnabled && commentVisibility.kind === 'hideCommentDueToScores') {
    if (commentVisibility.scaledScore >= LOUD_THRESHOLD) {
      return 'Is this ' + attributeWithPrefix(commentVisibility.attribute) + '?';
    }
  }
  return 'Should this be hidden?';
}

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

import { API_ATTRIBUTE_NAMES, ApiAttributeName, AttributeName,
         AttributeScores, convertApiAttributeName, convertAttributeToApiName } from '../scores';
import { postRequest } from '../auth';

const PERSPECTIVE_BASE = 'https://commentanalyzer.googleapis.com/v1alpha1';
const ANALYZE_COMMENT = `${PERSPECTIVE_BASE}/comments:analyze`;
const SUGGEST_COMMENT_SCORE = `${PERSPECTIVE_BASE}/comments:suggestscore`;

export function scoreText(text: string): Promise<AttributeScores> {
  // console.log('scoreText:', text.substring(0, 40));
  const request = {
    comment: {
      text: text
    },
    requestedAttributes: {},
    doNotStore: true,
  };
  for (const attr of API_ATTRIBUTE_NAMES) {
    request.requestedAttributes[attr] = {};
  }
  return postRequest(ANALYZE_COMMENT, request).then(response => {
    const scores: Partial<AttributeScores> = {};
    if (response !== null && response['attributeScores']) {
      for (const attrKey of Object.keys(response['attributeScores'])) {
        const attr = attrKey as ApiAttributeName;
        scores[convertApiAttributeName(attr)] =
          response['attributeScores'][attr].summaryScore.value;
      }
    }
    return scores as AttributeScores;
  });
}

export function suggestCommentScore(
  text: string, tuneAttribute: string, score: number, communityId: string, sessionId: string)
: Promise<void> {
  const apiAttribute = convertAttributeToApiName(tuneAttribute as AttributeName);
  if (!text || !apiAttribute || !communityId || !sessionId) {
    console.log('Error: missing some value. text:', text,
                '; attribute:', apiAttribute, ';, communityId:', communityId,
                ';, sessionId:', sessionId);
    return Promise.reject(null);
  }
  const request = {
    comment: { text: text },
    attributeScores: {},
    communityId: communityId,
    sessionId: sessionId,
  };
  console.log('submitting feedback:', request);
  request.attributeScores[apiAttribute] = {
    summaryScore: { value: score }
  };
  return postRequest(SUGGEST_COMMENT_SCORE, request).then(response => {
    console.log('feedback complete:', response);
    // TODO: we could change postRequest to throw an error with the
    // response details instead of just returning null.
    if (response === null) {
      throw new Error('suggestCommentScore failed');
    }
  });
}

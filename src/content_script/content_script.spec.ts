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

import { getMainDomainNameUnsafe } from './content_script';

describe('getMainDomainNameUnsafe', () => {
  it('drops a single subdomains', () => {
    expect(getMainDomainNameUnsafe('www.example.com')).toBe('example.com');
  });

  it('works with no subdomains', () => {
    expect(getMainDomainNameUnsafe('example.com')).toBe('example.com');
  });

  it('drops all subdomains', () => {
    expect(getMainDomainNameUnsafe('ww2.www.cdn.whatever.example.com')).toBe('example.com');
  });

  it('raises error if domain name is invalid', () => {
    expect(() => getMainDomainNameUnsafe('fail')).toThrow();
    expect(() => getMainDomainNameUnsafe('')).toThrow();
  });
});

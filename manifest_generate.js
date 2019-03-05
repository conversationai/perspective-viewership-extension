// Copyright 2019 Google LLC
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

// TODO: would be nice to have this be TypeScript.

const fs = require('fs');

const DEV_CREDS_PATH = './manifest_creds_dev.json';
const PROD_CREDS_PATH = './manifest_creds_prod.json';

const MANIFEST_BASE = {
    'manifest_version': 2,
    'description': 'Tune is a Chrome extension that helps people control the volume of the conversation they see.',
    'browser_action': {
        'default_icon': 'popup/ic_tune_quiet.png',
        'default_popup': 'popup/popup.html'
    },
    'icons': {
        '128': 'Tune-chromestore-icon-1x.png'
    },
    'background': {
        'scripts': ['background/background.js'],
        'persistent': false
    },
    'content_scripts': [
        {
          'css': ['content_script/styles.css'],
          'js': [
            'content_script/customElements/runtime.js',
            'content_script/customElements/polyfills.js',
            'content_script/customElements/main.js',
            'content_script/content_script.js'
          ],
          'matches': [
            'https://www.youtube.com/*',
            'https://www.reddit.com/*',
            'https://new.reddit.com/*',
            'https://twitter.com/*',
            'https://www.facebook.com/*',
            'https://disqus.com/embed/*'
          ],
          'all_frames': true,
          'run_at': 'document_idle'
        }
    ],
    'permissions': [ 'identity', 'storage' ],
    'web_accessible_resources': [
        '*.js',
        '*.css',
        '*.ico',
        '*.png',
        '*.html',
        '*.svg'
    ]
};

const DEV_CONFIG = {
  'name': 'Tune (dev)',
  'version': '0.0.0',
  'content_security_policy': "script-src 'self' https://www.google.com https://www.google-analytics.com https://support.google.com https://www.gstatic.com 'unsafe-eval'; object-src 'self'",
};

const PROD_CONFIG = {
  'name': 'Tune (experimental)',
  'version': '0.2.5',
  'version_name': '0.2.5 experimental',
  'content_security_policy': "script-src 'self' https://www.google.com https://www.google-analytics.com https://support.google.com https://www.gstatic.com; object-src 'self'",
};

const PROD_TEST_CONFIG = {
  'name': 'Tune (dist test)',
  'version': '0.0.0',
  'content_security_policy': "script-src 'self' https://www.google.com https://www.google-analytics.com https://support.google.com https://www.gstatic.com; object-src 'self'",
};

function read_json(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function create_dev_manifest() {
  const creds = read_json(DEV_CREDS_PATH);
  let manifest = { ...MANIFEST_BASE, ...DEV_CONFIG, ...creds };
  // For some reason, the dev build has these extra files. We can't merge this
  // nested field via the spread operator ('...'). We could use a more complex
  // merge function, but this bit of custom code is simpler.
  manifest['content_scripts'][0]['js'].push(...[
    'content_script/customElements/styles.js',
    'content_script/customElements/vendor.js',
  ]);
  return manifest;
}

function create_prod_manifest() {
  const creds = read_json(PROD_CREDS_PATH);
  return { ...MANIFEST_BASE, ...PROD_CONFIG, ...creds };
}

// Builds using the 'prod' manifest don't work locally, because the key isn't
// embedded in the manifest (the prod build only works when installed via the
// Chrome store). This 'prod test' manifest uses all the prod build options, but
// it uses the dev credentials with embedded key so that it works when testing
// locally.
function create_prod_test_manifest() {
  const creds = read_json(DEV_CREDS_PATH);
  return { ...MANIFEST_BASE, ...PROD_TEST_CONFIG, ...creds };
}

function main() {
  const args = process.argv.slice(2);
  function args_help() {
    console.error('Should give single argument: "dev", "prod", "prod-test"');
    process.exit(1);
  }
  if (args.length > 1) { args_help(); }
  let manifest;
  switch (args[0]) {
    case 'dev': manifest = create_dev_manifest(); break;
    case 'prod-test': manifest = create_prod_test_manifest(); break;
    case 'prod': manifest = create_prod_manifest(); break;
    default: args_help();
  }
  console.log(JSON.stringify(manifest, null, 1));
}

main();

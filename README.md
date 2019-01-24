# Tune

Tune is a [Chrome Extension](https://chrome.google.com/webstore/category/extensions)
that lets the user choose the 'volume' of the conversation they wish to read. It
uses the [Perspective API](https://perspectiveapi.com/) to score comments, and
lets the user specify what kinds types of comments they would like to see less
of. To help improve the machine learning behind the API, the user can also
provide feedback, and send suggested corrections.

## Development

### Creating new credentials

The extension needs credentials to score comments with Perspective API.

Copy the `manifest_creds_template.json` file to `manifest_creds_dev.json` and
edit it. Replace the `client_id` and `key` fields with the appropriate values.
See the [Chrome documentation](https://developer.chrome.com/apps/app_identity)
for how to set this up. The `client_id` typically looks like
`<cloud-project-number>-<hexadecimal-string>.apps.googleusercontent.com`.

Note that the Google Cloud project associated with the extension will need to
have Perspective API enabled (see the first 2 steps from the [Perspective API
quickstart
guide](https://github.com/conversationai/perspectiveapi/blob/master/quickstart.md)
for how to enable the API for your Cloud project).

### Build

Run `npm install` then `npm run build` to build a development version of the
extension. The build artifacts will be stored in the `dist/` directory.

You can install the extension from Chrome's extensions page
[chrome://extensions/](chrome://extensions/): click on the "Load Unpacked", and
select the directory `dist/`.

Note: to build a working extension, you'll need to have a correctly configured
`manifest_creds_dev.json` file from either the previous step, or a copy of the
official credentials.

#### Build details

There are 4 build targets:
1. The popup (chrome extension UI). This is an Angular project.
1. Background script.
1. Content script (the DOM modifying script injected onto sites).
1. Custom elements script. This is an Angular project script with custom angular
   elements to use in DOM manipulation. It is built with angular devkit as an
   app and then the output js files are injected into the document like the
   content script.

### Unit tests and linting

Run `npm test` to execute the unit tests via
[Karma](https://karma-runner.github.io).

Run `npm lint` to lint.

## Notes

This is not an official Google product; it is example code to illustrate how to
develop a Chrome extension that uses the Perspective API.

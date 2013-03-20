# Hangout Circles

### Description

This Hangout extensions shows to you, who of the participants in a hangout is in your circles. This is a demo to show how to use some of the new API functionalities in a Hangout app.

### Requirements/Installation

  * Edit `hangout-circles.xml` and change `<YOUR PATH>` to where you plan to upload the files.

  * Edit `scripts/circles.js` and change all occurrences of `<YOUR PATH>` to the same path as above.

  * Upload all files to `<YOUR PATH>`

  * Please note that the files need to be publicly accessible.

  * Go to https://code.google.com/apis/console/ and create a new project.

  * Activate the `Google+ Hangouts API` and the `Google+ API` in Services.

  * Go to "Hangouts" and put the full URL to `<YOUR PATH>/hangout-circles.xml` as Application URL

  * Check "This application requires additional OAuth 2.0 scopes." and add `https://www.googleapis.com/auth/plus.login` as scope.

  * Save and you are ready to "Enter a hangout!" :)


### Usage

During the initial authorization flow you can define which circles you want to be visible to the app. Only people in those circles will be highlighted by the app when you are in a hangout together. This "green circle" will only be visible to yourself and not to the other people in the hangout. While the circles are still being loaded some people will appear in the "Not circled" list even though you have them circled. Once the full list has been loaded they will be displayed correctly.


### Licenses

```
Copyright 2013 Gerwin Sturm, FoldedSoft e.U. / foldedsoft.at, scarygami.net/+

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

Included is a variation of the OAuth2 for Chrome Extensions library by Boris Smus
https://github.com/borismus/oauth2-extensions/

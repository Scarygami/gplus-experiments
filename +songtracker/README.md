# +SongTracker

### Description

This Chrome extension writes songs you are listening to on Google Play Music into your Google+ App Activities.

### Requirements/Installation

1) Load the extension as unpacked extension in Chrome.

   Enable "Developer mode" at chrome://chrome/extensions/

   "Load unpacked extension" and point it to extension folder.

2) Copy the ID (long string) that is displayed for the loaded extension
   and user it for `<YOUR_EXTENSION_ID>` in `tracker_background.js`.
   
3) Go to Google API Console https://code.google.com/apis/console/

  Create a new project.

  Activate the Google+ API in Services

  Create a new Client ID for web applications in "API Access"
  
  Add `https://<YOUR_EXTENSION_ID>.chromiumapp.org/cb` as Redirect URI.

4) Copy the Client ID and user it for `<YOUR_CLIENT_ID>` in `tracker_background.js`.


### Usage

You will get a new icon in your browser bar.
Clicking it will show a pop-up which at first will only show "Sign-in with Google"
Clicking the first time will redirect you through the Google OAuth flow where you have to give permission to the extension.
Once connected you can click on "Start tracking".
While playing music on Google Play Music https://play.google.com/music/ the song information will be send to your Google App Activities at https://plus.google.com/apps/activities


### Licenses

```
Copyright 2012-2013 Gerwin Sturm, FoldedSoft e.U. / foldedsoft.at, scarygami.net/+

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

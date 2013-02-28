# +SongTracker

### Description

This Chrome extension writes songs you are listening to on Google Play Music into your Google+ App Activities.

### Requirements/Installation

1) Upload an empty file to your server, URL of this file will be `YOUR_REDIRECT_URI`

2) Go to Google API Console https://code.google.com/apis/console/

  Create a new project.

  Activate the Google+ API in Services

  Create a new Client ID for web applications in "API Access"

  Add `YOUR_REDIRECT_URI` as Redirect URI

2) Edit `tracker_background.js` and set `YOUR_CLIENT_ID`, `YOUR_CLIENT_SECRET` and `YOUR_REDIRECT_URI` accordingly.

3) Edit `manifest.json` and set `YOUR_REDIRECT_URI` there as well (keep the * at the end)

4) Once everything is set-up you can load the extension as unpacked extension in Chrome.
  Enable "Developer mode" at chrome://chrome/extensions/
  "Load unpacked extension" and point it to extension folder.


### Usage

You will get a new icon in your browser bar.
Clicking it will show a pop-up which at first will only show "Connect"
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

Included is a variation of the OAuth2 for Chrome Extensions library by Boris Smus
https://github.com/borismus/oauth2-extensions/

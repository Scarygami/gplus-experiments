# Chrome Mobile Sign-In

### Description

Minimal sample to show how to use the Chrome Identity API in Mobile Chrome Apps

### Setup/Installation

1.  Setup the development tools following the [official instructions here](https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Installation.md) 

2.  Run `cca create YourApp --copy-from=path/to/chrome-mobile-signin/manifest.json`

   This will copy the source code to a new folder `YourApp/www` and prepare everything for porting it to mobile
   
3.  Edit `YourApp/www/manifest.mobile.json` to change the `packageId` to whatever you want.

4.  Create a new project in the [Google Developers Console](https://cloud.google.com/console/project)

5.  Activate the `Google+ API` in "APIs & Auth"

6.  In "Credentials" create a new Client ID for "Installed Application" > "Android"

   For this you will need the `packageId` you defined earlier as well as the SHA-1 fingerprint of your signing certificate (for now the debug keystore will suffice).
   
   See [Google Developers Console Docs](https://developers.google.com/console/help/new/#installedapplications) for details and instructions.
   
7.  Edit `YourApp/www/manifest.json` to add the Client ID you just created.

8.  Run `cca prepare` and then to test the application `cca run android` (connected device) or `cca emulate android` (Android emulator)

   
### Licenses

```
Copyright 2014 Gerwin Sturm, FoldedSoft e.U. / foldedsoft.at

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

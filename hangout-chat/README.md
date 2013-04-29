# Hangout Chat

### Description

Just a proof of concept how to use the [App Engine Channel API](https://developers.google.com/appengine/docs/python/channel/)
to implement a chat service that allows direct communication between a Hangout
and the outside world (useful for HOA).

Since the channel API only works when running directly on App Engine, the
[hangoutiframer](https://hangoutiframer.appspot.com) is used.

This would need to be very much refined for an actual product, so feel free to
turn this into something great :)


### Requirements/Installation

1.  Create a new App Engine application at https://appengine.google.com/

2.  Edit `app.yaml` and replace `YOUR_APP_ID` with the name of your App Engine project

3.  Create a new project in the [Google APIs Console](https://code.google.com/apis/console/)

4.  Activate the `Google+ Hangouts API` and the `Google+ API` in `Services`

5.  Create a new Client ID for web applications in `API Access`

5.  Add `https://YOUR_APP_ID.appspot.com/` as Javascript origin

7.  Edit `main.py` and replace `YOUR_CLIENT_ID` with the Client ID you just created

8.  Deploy the project to App Engine

9.  Go to `Hangouts` and put the following URL as `Application URL` replacing
    `YOUR_APP_ID` with the name of your App Engine project

```
https://hangoutiframer.appspot.com/forward/v0.4?u=https://YOUR_APP_ID.appspot.com/hangout-chat.html
```

10.  Save and you are ready to "Enter a hangout!" :)


### Usage

Inside the Hangout you will see a simple chat system with a text input box to
send new messages. There also is a link on top `External chat channel` which
you can share for people outside of the hangout.

The external chat channel has a sign-in button, and once people are signed in
they can send messages that will appear inside of the hangout as well as for
all other people using the chat channel. And also messages you send from inside
the Hangout will be visible to all people using a chat channel outside.


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

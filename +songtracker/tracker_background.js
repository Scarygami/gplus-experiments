/*
 * Copyright (c) 2012-2013 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

(function (global) {
  "use strict";

  function Songtracker() {
    var current_tab_id, current_window_id, current_title, current_artist, current_image, current_duration, time_stamp, written, google, access_token, tracking, authorized;

    current_tab_id = 0;
    current_window_id = 0;
    current_title = "";
    current_artist = "";
    current_image = "";
    current_duration = 0;
    time_stamp = 0;
    written = false;

    tracking = false;
    authorized = false;

    google = new global.OAuth2("google", {
      clientId: "YOUR_CLIENT_ID",
      clientSecret: "YOUR_CLIENT_SECRET",
      apiScope: "https://www.googleapis.com/auth/plus.login",
      requestVisibleActions: "http://schemas.google.com/ListenActivity",
      redirectUri: "YOUR_REDIRECT_URI"
    });

    this.isAuthorized = function () {
      return authorized;
    };

    this.isTracking = function () {
      return tracking;
    };

    this.authorize = function (cb) {
      google.authorize(function () {
        access_token = google.getAccessToken();
        if (!access_token) {
          authorized = false;
          tracking = false;
        } else {
          authorized = true;
        }
        try { cb(authorized); } catch (e) { global.console.log("Error calling callback"); }
      });
    };

    function createNotification(text, title, image, no_timeout) {
      var notification;
      notification = global.webkitNotifications.createNotification(
        image || global.chrome.extension.getURL("icon48.png"),
        title || "Song added to Google+ history",
        text
      );
      notification.show();
      if (!no_timeout) {
        global.setTimeout(function () { notification.cancel(); }, 5000);
      }
    }

    this.deauthorize = function (cb) {
      var xhr;
      tracking = false;

      access_token = google.getAccessToken();
      if (!access_token) {
        google.clearAccessToken();
        authorized = false;
        try { cb(); } catch (e) { global.console.log("Error calling callback"); }
        return;
      }

      xhr = new global.XMLHttpRequest();

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status >= 200 && xhr.status <= 204) {
            // successfully disconnected
            global.console.log("Disconnected");
          } else {
            createNotification("Please visit plus.google.com/apps to disconnect the application manually.", "Error disconnecting", undefined, true);
          }
        }
        google.clearAccessToken();
        access_token = undefined;
        authorized = false;
        try { cb(); } catch (e) { global.console.log("Error calling callback"); }
      };

      xhr.open("GET", "https://accounts.google.com/o/oauth2/revoke?token=" + access_token, true);
      xhr.send();
    };

    this.startTracking = function (cb) {
      google.authorize(function () {
        access_token = google.getAccessToken();
        authorized = true;
        tracking = true;
        try { cb(); } catch (e) { global.console.log("Error calling callback"); }
      });
    };

    this.stopTracking = function () {
      tracking = false;
    };

    function writeMoment(info) {
      var xhr, message;

      message = JSON.stringify(info);

      xhr = new global.XMLHttpRequest();
      xhr.onreadystatechange = function () {
        var response, text;
        if (xhr.readyState == 4) {
          if (xhr.status >= 200 && xhr.status <= 204) {
            global.console.log("Success: " + xhr.responseText);
            response = JSON.parse(xhr.responseText);
            text = response.target.name;
            if (response.target.byArtist) {
              text += " by " + response.target.byArtist.name;
            }
            createNotification(text, undefined, response.target.image);
          } else {
            createNotification("Error " + xhr.status + ": " + xhr.statusText, "Error adding song to Google+ History");
          }
        }
      };

      xhr.open("POST", "https://www.googleapis.com/plus/v1/people/me/moments/vault?debug=true", true);

      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Authorization", "OAuth " + access_token);

      xhr.send(message);
    }

    global.chrome.extension.onMessage.addListener(
      function (request, sender) {
        var now, write;
        now = (new Date()).getTime();
        if (tracking && authorized) {
          if (sender.tab && request.title) {
            current_tab_id = sender.tab.id;
            current_window_id = sender.tab.windowId;
            if (current_title !== request.title || current_artist !== request.artist) {
              current_title = request.title;
              current_artist = request.artist;
              current_image = request.image;
              current_duration = request.duration;
              time_stamp = now;
              written = false;
            } else {
              if (current_duration === 0) {
                write = (now - time_stamp > 60000);
              } else {
                write = (now - time_stamp > current_duration * 750);
              }
              if (write && !written) {
                written = true;

                // make sure we have a valid token before trying to submit anything
                google.authorize(function () {
                  access_token = google.getAccessToken();
                  authorized = true;
                  writeMoment({
                    "type": "http://schemas.google.com/ListenActivity",
                    "target": {
                      "id": (current_title + " by " + current_artist).replace(/\W/gi, "_"),
                      "type": "http://schema.org/MusicRecording",
                      "name": current_title,
                      "description": current_title + " by " + current_artist,
                      "image": current_image,
                      "byArtist": {
                        "type": "http://schema.org/MusicGroup",
                        "name": current_artist
                      }
                    }
                  });
                });
              }
            }
          } else {
            if (sender.tab) {
              // making sure that other non-playing Google Music Windows don't interfere with tracking
              if (sender.tab.id === current_tab_id && sender.tab.windowId === current_window_id) {
                current_title = "";
                current_artist = "";
                current_image = "";
                time_stamp = now;
                written = false;
              }
            }
          }
        } else {
          current_title = "";
          current_artist = "";
          current_image = "";
          time_stamp = now;
          written = false;
        }
      }
    );
  }

  global.songtracker = new Songtracker();
}(this));


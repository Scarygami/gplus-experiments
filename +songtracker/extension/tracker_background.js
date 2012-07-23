/*
 * Copyright (c) 2012 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
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
      client_id: "<YOUR_CLIENT_ID>",
      client_secret: "<YOUR_CLIENT_SECRET>",
      api_scope: "https://www.googleapis.com/auth/plus.moments.write https://www.googleapis.com/auth/plus.me"
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
        authorized = true;
        try { cb(); } catch (e) { console.log("Error calling callback"); }
      });
    };

    this.deauthorize = function () {
      google.clearAccessToken();
      access_token = "";
      tracking = false;
      authorized = false;
    };

    this.startTracking = function (cb) {
      google.authorize(function () {
        access_token = google.getAccessToken();
        authorized = true;
        tracking = true;
        try { cb(); } catch (e) { console.log("Error calling callback"); }
      });
    };

    this.stopTracking = function () {
      tracking = false;
    };

    function createNotification(text, title, image) {
      var notification;
      notification = global.webkitNotifications.createNotification(
        image || global.chrome.extension.getURL("icon48.png"),
        title || "Song added to Google+ history",
        text
      );
      notification.show();
      global.setTimeout(function () { notification.cancel(); }, 5000);
    }

    function writeMoment(info) {
      var xhr, message;

      message = JSON.stringify(info);

      xhr = new global.XMLHttpRequest();
      xhr.onreadystatechange = function () {
        var response, text;
        if (xhr.readyState == 4) {
          if (xhr.status >= 200 && xhr.status <= 204) {
            console.log("Success: " + xhr.responseText);
            response = JSON.parse(xhr.responseText);
            text = response.target.name;
            /* // this part for the notification when the title is reduced to title only (see below)
            if (response.target.byArtist) {
              text += " by " + response.target.byArtist.name;
            }
            */
            createNotification(text, undefined, response.target.image);
          } else {
            createNotification("Error " + xhr.status + ": " + xhr.statusText, "Error adding song to Google+ History");
          }
        }
      };

      xhr.open("POST", "https://www.googleapis.com/plus/v1moments/people/me/moments/vault?debug=true", true);

      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Authorization", "OAuth " + access_token);

      xhr.send(message);
    }

    global.chrome.extension.onMessage.addListener(
      function (request, sender) {
        var now, url, write;
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
                // wait until 75% of the song has been listened to (current_duration * 1000 * 75/100)
                write = (now - time_stamp > current_duration * 750);
              }
              if (write && !written) {
                written = true;
                // this uses a server-side script to create a shareable URL, use your own if you want
                url = "https://www.foldedsoft.at/plus/history/song.php";
                // Using "<Title> by <Artist>" as title for now because the artist name isn't displayed in the history yet
                // Also do some conversion of the encoded parts because the History API doesn't like %xx parts in the URLs
                url += "?title=" + encodeURIComponent(current_title + " by " + current_artist).replace(/_/gi, "%5f").replace(/%/gi, "_");
                url += "&artist=" + encodeURIComponent(current_artist).replace(/_/gi, "%5f").replace(/%/gi, "_");
                url += "&image=" + encodeURIComponent(current_image).replace(/_/gi, "%5f").replace(/%/gi, "_");

                // make sure we have a valid token before trying to submit anything
                google.authorize(function () {
                  access_token = google.getAccessToken();
                  authorized = true;
                  writeMoment({
                    "type": "http://schemas.google.com/ListenActivity",
                    "target": {
                      "url": url
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
}(window));


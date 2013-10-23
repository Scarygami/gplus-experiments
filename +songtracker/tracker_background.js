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
    var
      current_tab_id = 0,
      current_window_id = 0,
      current_title = "",
      current_artist = "",
      current_image = "",
      current_duration = 0,
      time_stamp = 0,
      written = false,
      tracking = false,
      authorized = false,
      token,
      client_id = "<YOUR_CLIENT_ID>",
      extension_id = "<YOUR_EXTENSION_ID>",
      auth_url,
      that = this;

    auth_url =
      "https://accounts.google.com/o/oauth2/auth" +
      "?client_id=" + client_id +
      "&redirect_uri=https%3A%2F%2F" + extension_id + ".chromiumapp.org%2Fcb" +
      "&response_type=token" +
      "&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fplus.login" +
      "&request_visible_actions=http%3A%2F%2Fschemas.google.com%2FListenActivity" +
      "&cookie_policy=single_host_origin&authuser=0";

    this.isAuthorized = function () {
      return authorized;
    };

    this.isTracking = function () {
      return tracking;
    };

    function parseRedirectUrl(url, state) {
      var i, part, parts, return_state, access_token, expires_in, token;

      i = url.indexOf("#");
      if (i >= 0) {
        parts = url.substring(i + 1).split("&");
        for (i = 0; i < parts.length; i++) {
          part = parts[i].split("=");
          if (part.length === 2) {
            if (part[0] === "state") {
              return_state = part[1];
            }
            if (part[0] === "access_token") {
              access_token = part[1];
            }
            if (part[0] === "expires_in") {
              expires_in = part[1];
            }
          }
        }
        if (!!return_state && !!access_token && !!expires_in) {
          if (state === return_state) {
            token = {
              "access_token": access_token,
              "expiry": (new Date()).getTime() + expires_in * 1000
            };
            global.console.log(token);
            return token;
          }
        }
      }
    }

    this.authorize = function (immediate, cb) {
      var state;

      if (!!token && token.expiry > (new Date()).getTime()) {
        // we still have a valid token, return immediatly
        cb(token);
        return;
      }

      // no valid token available, request a new one
      token = undefined;
      state = Math.random().toString(36);
      global.chrome.identity.launchWebAuthFlow(
        {"url": auth_url + "&state=" + state, "interactive": !immediate},
        function (redirect_url) {
          token = parseRedirectUrl(redirect_url, state);
          if (!token) {
            authorized = false;
            tracking = false;
          } else {
            authorized = true;
          }
          if (!!cb) {
            try { cb(token); } catch (e) { global.console.log("Error calling callback"); }
          }
        }
      );
    };

    function createNotification(text, title, image, no_timeout) {
      var notification;
      notification = global.webkitNotifications.createNotification(
        image || global.chrome.extension.getURL("icon48.png"),
        title || "Song added to Google+ Activity Log",
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

      if (!token) {
        authorized = false;
        if (!!cb) {
          try { cb(); } catch (e) { global.console.log("Error calling callback"); }
        }
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
          token = undefined;
          authorized = false;
          if (!!cb) {
            try { cb(); } catch (e) { global.console.log("Error calling callback"); }
          }
        }
      };

      xhr.open("GET", "https://accounts.google.com/o/oauth2/revoke?token=" + token.access_token, true);
      xhr.send();
    };


    this.startTracking = function (cb) {
      // Check if token is valid and refresh if necessary
      this.authorize(true, function () {
        if (!!token) {
          tracking = true;
          if (!!cb) {
            try { cb(); } catch (e) { global.console.log("Error calling callback"); }
          }
        }
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
            createNotification("Error adding song to Google+ Activity Log. Please try signing in again.", "Error " + xhr.status + ": " + xhr.statusText);
            tracking = false;
            authorized = false;
            token = undefined;
          }
        }
      };

      xhr.open("POST", "https://www.googleapis.com/plus/v1/people/me/moments/vault?debug=true", true);

      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Authorization", "Bearer " + token.access_token);

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

                // Check if access_token is valid and refresh if necessary
                that.authorize(true, function () {
                  if (!!token) {
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
                  }
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


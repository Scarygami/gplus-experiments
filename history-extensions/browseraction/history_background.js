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

  function HistoryApp() {
    var google, access_token, types;

    google = new global.OAuth2("google", {
      client_id: "YOUR_CLIENT_ID",
      client_secret: "YOUR_CLIENT_SECRET",
      api_scope: "https://www.googleapis.com/auth/plus.moments.write https://www.googleapis.com/auth/plus.me"
    });

    types = [];
    types.push({activityType: "http://schemas.google.com/AddActivity", label: "Add"});
    types.push({activityType: "http://schemas.google.com/BuyActivity", label: "Buy"});
    types.push({activityType: "http://schemas.google.com/CheckInActivity", label: "Check In"});
    types.push({activityType: "http://schemas.google.com/CreateActivity", label: "Create"});
    types.push({activityType: "http://schemas.google.com/ListenActivity", label: "Listen"});
    types.push({activityType: "http://schemas.google.com/ViewActivity", label: "View"});

    function createNotification(text, title, image) {
      var notification;
      notification = global.webkitNotifications.createNotification(
        image || global.chrome.extension.getURL("icon48.png"),
        title || "Item added to Google+ history",
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
            global.console.log("Success: " + xhr.responseText);
            response = JSON.parse(xhr.responseText);
            text = response.target.name;
            createNotification(text, undefined, response.target.image);
          } else {
            createNotification("Error " + xhr.status + ": " + xhr.statusText, "Error adding item to Google+ History");
          }
        }
      };

      xhr.open("POST", "https://www.googleapis.com/plus/v1moments/people/me/moments/vault?debug=true", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Authorization", "OAuth " + access_token);
      xhr.send(message);
    }

    this.addItem = function (type, url) {
      google.authorize(function () {
        access_token = google.getAccessToken();
        writeMoment({
          "type": type,
          "target": {
            "url": url
          }
        });
      });
    };

    this.getTypes = function () { return types; };
  }

  global.historyApp = new HistoryApp();
}(window));
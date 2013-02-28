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
  var button_tracking, button_authorize, button_authorize_label, button_tracking_label, background;

  background = global.chrome.extension.getBackgroundPage();
  button_tracking = global.document.getElementById("tracking");
  button_authorize = global.document.getElementById("authorize");
  button_authorize_label = global.document.querySelector("#authorize .label");
  button_tracking_label = global.document.querySelector("#tracking .label");

  if (!background.songtracker) {
    global.document.body.innerHTML = "Songtracker not loaded yet, please try again.";
  } else {
    if (background.songtracker.isAuthorized()) {
      button_authorize_label.innerHTML = "Disconnect";
      button_tracking.style.display = "inline-block";
      if (background.songtracker.isTracking()) {
        button_tracking_label.innerHTML = "Stop tracking";
      } else {
        button_tracking_label.innerHTML = "Start tracking";
      }
    } else {
      button_authorize_label.innerHTML = "Connect";
      button_tracking.style.display = "none";
      button_tracking_label.innerHTML = "Start tracking";
    }

    button_tracking.onclick = function () {
      if (background.songtracker.isTracking()) {
        background.songtracker.stopTracking();
        button_tracking_label.innerHTML = "Start tracking";
      } else {
        background.songtracker.startTracking(function () {
          if (background.songtracker.isTracking()) {
            button_tracking_label.innerHTML = "Stop tracking";
          }
        });
      }
    };

    button_authorize.onclick = function () {
      if (background.songtracker.isAuthorized()) {
        background.songtracker.deauthorize(function () {
          button_tracking_label.innerHTML = "Start tracking";
          button_authorize_label.innerHTML = "Connect";
          button_tracking.style.display = "none";
          button_tracking_label.innerHTML = "Start tracking";
        });
      } else {
        background.songtracker.authorize(function () {
          if (background.songtracker.isAuthorized()) {
            button_authorize_label.innerHTML = "Disconnect";
            button_tracking.style.display = "inline-block";
          }
        });
      }
    };
  }
}(this));
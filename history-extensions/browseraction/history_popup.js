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
  var buttons, background, types, i, l;

  background = global.chrome.extension.getBackgroundPage();
  buttons = global.document.getElementById("buttons");

  function createButton(type) {
    var button;
    button = global.document.createElement("button");
    button.innerHTML = type.label;
    buttons.appendChild(button);
    button.onclick = function () {
      global.chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (tabs && tabs.length > 0) {
          background.historyApp.addItem(type.activityType, tabs[0].url);
          global.close();
        }
      });
    };
  }

  if (!background.historyApp) {
    global.document.body.innerHTML = "HistoryApp not loaded yet, please try again.";
  } else {
    types = background.historyApp.getTypes();
    l = types.length;
    for (i = 0; i < l; i++) {
      createButton(types[i]);
    }
  }
}(window));
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

  var
    postClass = "Tg",
    actionClass = "mv",
    menuClass = "a-w",
    linkClass = "g-M-n",
    csClass = "history_cs";

  function addButton(div) {
    var actionDiv, menu, url, link;
    actionDiv = global.document.querySelector("#" + div.id + " ." + actionClass);
    link = global.document.querySelector("#" + div.id + " ." + linkClass);
    if (actionDiv && link && link.href) {
      div.classList.add(csClass);
      url = link.href;
      menu = global.document.createElement("div");
      menu.innerHTML = "Add to Google+ History";
      menu.classList.add(menuClass);
      actionDiv.appendChild(menu);
      menu.onclick = function () {
        global.chrome.extension.sendMessage({activityType: "http://schemas.google.com/AddActivity", url: url});
      };
    }
  }

  function updateDOM() {
    var divs, i, l;
    divs = global.document.querySelectorAll("." + postClass + ":not(." + csClass + ")");
    if (divs && divs.length > 0) {
      l = divs.length;
      for (i = 0; i < l; i++) {
        addButton(divs[i]);
      }
    }
  }

  global.document.getElementById("contentPane").addEventListener("DOMNodeInserted", updateDOM, false);
  updateDOM();

}(window));
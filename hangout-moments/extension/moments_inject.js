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
    topSelector = ".oa-s-K-v > div",
    classes = "c-D-B a-b a-b-z",
    hoverClass = "a-b-x",
    participantSelector = ".c-g.f-qb-jd-Fa.NG > div";

  global.onload = function () {
    var topDiv, tmpDiv;

    topDiv = global.document.querySelector(topSelector);

    tmpDiv = global.document.createElement("div");
    tmpDiv.id = "moment_screenshot";

    tmpDiv.className = classes;
    tmpDiv.style.width = "36px";
    tmpDiv.style.height = "36px";
    tmpDiv.style.backgroundImage = "url(" + global.chrome.extension.getURL("screenshot.png") + ")";
    tmpDiv.title = "Save Screenshot to Google+ History";

    topDiv.insertBefore(tmpDiv, topDiv.childNodes[0]);

    tmpDiv.onmouseover = function (e) {
      this.classList.add(hoverClass);
      this.style.backgroundImage = "url(" + global.chrome.extension.getURL("screenshot2.png") + ")";
    };
    tmpDiv.onmouseout = function (e) {
      this.classList.remove(hoverClass);
      this.style.backgroundImage = "url(" + global.chrome.extension.getURL("screenshot.png") + ")";
    };

    tmpDiv.onclick = function () {
      var videos, i, l, video, mainVideo, thumbnailsStrip, participantDivs, participants;

      videos = global.document.querySelectorAll("object");
      l = videos.length;
      for (i = 0; i < l; i++) {
        video = videos[i].client;
        if (video.width > 10 && video.height > 10) {
          if (!mainVideo) {
            mainVideo = video;
          } else {
            thumbnailsStrip = video;
          }
        }
        if (mainVideo && thumbnailsStrip) {
          break;
        }
      }

      participantDivs = global.document.querySelectorAll(participantSelector);
      participants = [];
      l = participantDivs.length;
      for (i = 0; i < l; i++) {
        participants[i] = participantDivs[i].innerHTML;
      }

      if (mainVideo && thumbnailsStrip && participants && participants.length > 0) {
        global.chrome.extension.sendMessage(
          {
            mainVideo: {data: mainVideo.toDataURL("image/png"), width: mainVideo.width, height: mainVideo.height},
            thumbnailsStrip: {data: thumbnailsStrip.toDataURL("image/png"), width: thumbnailsStrip.width, height: thumbnailsStrip.height},
            participants: participants
          }
        );
      }
    };
  };

}(this));
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
  function update_tracker() {
    var div, title, artist, image, duration, tmp;
    title = "";
    artist = "";
    image = "";
    duration = 0;
    div = global.document.getElementById("playPause");
    // playPause-button has the class goog-flat-button-checked when it's in playing mode
    // there are probably better ways to check for this...
    if (div && div.className.indexOf("goog-flat-button-checked") >= 0) {
      div = global.document.getElementById("playerSongTitle");
      if (div && div.children.length > 0) {
        title = div.children[0].innerHTML || "No Title";
      } else {
        title = "No Title";
      }
      div = global.document.getElementById("playerArtist");
      if (div && div.children.length > 0) {
        artist = div.children[0].innerHTML || "Unknown Artist";
      } else {
        artist = "Unknown Artist";
      }
      div = global.document.getElementById("playingAlbumArt");
      if (div && div.src) {
        image = div.src || "https://ssl.gstatic.com/music/fe/8f5de174d5c14667cc55352268c16d45/default_album_med.png";
      } else {
        image = "https://ssl.gstatic.com/music/fe/8f5de174d5c14667cc55352268c16d45/default_album_med.png";
      }
      div = global.document.getElementById("duration");
      if (div) {
        tmp = div.innerHTML.split(":");
        if (tmp.length === 1) {
          duration = parseInt(tmp[0], 10);
        } else if (tmp.length === 2) {
          duration = parseInt(tmp[0], 10) * 60 + parseInt(tmp[1], 10);
        } else {
          duration = 0;
        }
      } else {
        duration = 0;
      }
    }
    // send the current data to our background script for processing (or empty data if nothing is playing at the moment)
    global.chrome.extension.sendMessage({title: title, artist: artist, image: image, duration: duration});
  }

  global.setInterval(update_tracker, 1000);
}(window));
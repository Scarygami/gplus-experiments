/*
 * Copyright (c) 2013 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
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

  var gapi = global.gapi, hapi = global.gapi.hangout, document = global.document;

  function CirclesApp() {
    var circles = [], scopes, loadingDiv, circlesDiv, baseUrl;

    scopes = [
      "https://www.googleapis.com/auth/hangout.av",
      "https://www.googleapis.com/auth/hangout.participants",
      "https://www.googleapis.com/auth/plus.login"
    ];

    baseUrl = "<YOUR PATH>";

    loadingDiv = document.getElementById("loading");
    circlesDiv = document.getElementById("circles");

    function onParticipantsChanged() {
      var i, l, participants = gapi.hangout.getParticipants(), inCircles, notInCircles, personLi;
      inCircles = "";
      notInCircles = "";
      l = participants.length;
      for (i = 0; i < l; i++) {
        if (participants[i].id !== hapi.getLocalParticipantId()) {
          personLi = "<li><a href=\"https://plus.google.com/" + participants[i].person.id + "\" target=\"_blank\">" + participants[i].person.displayName + "</a></li>\n"
          if (circles.indexOf(participants[i].person.id) >= 0) {
            inCircles += personLi;
            hapi.av.setAvatar(participants[i].id, baseUrl + "/images/circle.png");
          } else {
            notInCircles += personLi;
          }
        }
      }
      circlesDiv.innerHTML = "<b>Circled</b>:<br><ul>" + inCircles + "</ul>\n<b>Not circled:</b><br><ul>" + notInCircles + "</ul>";
    }

    function loadCircles(pageToken) {
      var request = gapi.client.plus.people.list({"userId": "me", "collection": "visible", "maxResults": 100, "pageToken": pageToken});
      request.execute(function (result) {
        var i, l;
        if (result.items) {
          l = result.items.length;
          for (i = 0; i < l; i++) {
            circles.push(result.items[i].id);
          }
        }
        if (result.nextPageToken) {
          loadingDiv.innerHTML = "Fetching people... " + circles.length + " found.";
          global.setTimeout(function () { loadCircles(result.nextPageToken); }, 100);
        } else {
          loadingDiv.innerHTML = "Finished fetching people... " + circles.length + " found.";
        }
        onParticipantsChanged();
      });
    }

    function handleAuthResult(authResult) {
      if (authResult) {
        gapi.client.load('plus', 'v1', function () {
          loadingDiv.innerHTML = "Fetching people...";
          loadCircles();
        });
      } else {
        loadingDiv.innerHTML = "Can't load circled people: not authorized";
      }
    }

    function onApiReady(event) {
      if (event.isApiReady === true) {
        gapi.auth.authorize({
          client_id: null,
          scope: scopes,
          immediate: true
        }, handleAuthResult);

        gapi.hangout.onParticipantsChanged.add(onParticipantsChanged);
      }
    }

    gapi.hangout.onApiReady.add(onApiReady);
  }

  global.onClientReady = function () {
    global.circlesApp = new CirclesApp();
  };
}(this));
/*
 * (c) 2013 by Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License
 */

(function (global) {
  "use strict";
  var console = global.console, doc = global.document, hapi;

  Date.prototype.formatTime = function () {
    var h, min;

    h = this.getHours().toString();
    min = this.getMinutes().toString();

    return (h[1] ? h : "0" + h[0]) + ":" + (min[1] ? min : "0" + min[0]);
  };

  function HangoutChat(user) {
    var hangoutId, template, mainDiv;

    template = "<div class=\"message\"><div class=\"header\"></div><img class=\"img\"><span class=\"displayName\"></span><span class=\"time\"></span><div class=\"text\"></div></div>";

    function escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function displayMessage(data) {
      var div = doc.createElement("div");
      div.innerHTML = template;
      mainDiv.appendChild(div);
      div.querySelector(".img").src = data.userImage;
      div.querySelector(".displayName").innerHTML = escapeHtml(data.userName);
      div.querySelector(".text").innerHTML = escapeHtml(data.message);
      div.querySelector(".time").innerHTML = (new Date()).formatTime();
      if (data.hangout) {
        div.querySelector(".header").classList.add("green");
      } else {
        div.querySelector(".header").classList.add("red");
      }
      mainDiv.scrollTop = mainDiv.scrollHeight;
    }

    function setupEvents() {
      var inputDiv = doc.getElementById("new_message");
      mainDiv = doc.getElementById("messages");
      inputDiv.onkeypress = function (e) {
        var key, message, text, xhr;
        key = e.keyCode || e.which;
        if (key === 13) {
          text = inputDiv.value;
          if (text !== "") {
            inputDiv.value = "";
            message =  {};
            message.hangoutId = hangoutId;
            message.userId = user.id;
            message.message = text;
            message.hangout = !!hapi;
            xhr = new global.XMLHttpRequest();
            xhr.open("POST", "/send", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify(message));
          }
        }
      };
    }

    function openChannel(token) {
      var channel, socket, tmp;
      channel = new global.goog.appengine.Channel(token);
      socket = channel.open();
      socket.onopen = function () {
        console.log("Channel connected");
        doc.getElementById("chat").style.display = "block";
        setupEvents();
      };
      socket.onmessage = function (message) {
        var data;
        if (message && message.data) {
          data = JSON.parse(message.data);
          displayMessage(data);
        }
      };
      socket.onerror = function (e) {
        console.log("Channel error", e);
      };
      socket.onclose = function () {
        console.log("Channel closed");
      };
    }

    function connectChannel() {
      var xhr, message;
      xhr = new global.XMLHttpRequest();
      xhr.onreadystatechange = function () {
        var resp, tmp;
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resp = JSON.parse(xhr.response);
            if (!!hapi) {
              tmp = doc.getElementById("chatchannel");
              hangoutId = resp.hangoutId;
              tmp.href = "/?hangout=" + hangoutId;
              tmp.style.display = "block";
            }
            openChannel(resp.channel);
          } else {
            console.log("Error connection channel", xhr.status, xhr.statusText);
            doc.getElementById("chat").style.display = "none";
          }
        }
      };

      message = {};
      message.user = user;
      message.hangoutId = hangoutId;
      message.hangout = !!hapi;

      xhr.open("POST", "/connect", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify(message));
    }

    function initialize() {
      var tmp, tmp2, i, l;
      if (hapi) {
        hangoutId = hapi.getHangoutId();
      } else {
        tmp = global.location.search.substring(1).split("&");
        l = tmp.length;
        for (i = 0; i < l; i++) {
          tmp2 = tmp[i].split("=");
          if (tmp2[0] === "hangout") {
            hangoutId = tmp2[1];
            break;
          }
        }
      }

      if (hangoutId) {
        connectChannel();
      } else {
        console.log("No hangout ID found");
      }
    }

    initialize();
  }

  if (global.gapi && global.gapi.hangout) {
    hapi = global.gapi.hangout;
  }

  if (hapi) {
    hapi.onApiReady.add(function (e) {
      if (e.isApiReady) {
        global.hangoutchat = new HangoutChat(hapi.getLocalParticipant().person);
      }
    });
  } else {
    global.onSignInCallback = function (authResult) {
      if (authResult.access_token) {
        global.gapi.client.load("plus", "v1", function () {
          global.gapi.client.plus.people.get({"userId": "me"}).execute(function (result) {
            if (result.error) {
              console.log("There was an error: " + result.error);
              doc.getElementById("chat").style.display = "none";
              doc.getElementById("signin").style.display = "block";
            } else {
              doc.getElementById("signin").style.display = "none";
              global.hangoutchat = new HangoutChat(result);
            }
          });
        });
      } else if (authResult.error) {
        console.log("There was an error: " + authResult.error);
        doc.getElementById("chat").style.display = "none";
        doc.getElementById("signin").style.display = "block";
      }
    };
  }
}(this));
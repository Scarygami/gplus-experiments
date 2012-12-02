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

  Date.prototype.niceDate = function () {
    var y, m, d, h, min, nice;
    y = this.getFullYear().toString();
    m = (this.getMonth() + 1).toString();
    d  = this.getDate().toString();
    h = this.getHours().toString();
    min = this.getMinutes().toString();
    nice = y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]);
    nice += " " + (h[1] ? h : "0" + h[0]) + ":" + (min[1] ? min : "0" + min[0]);
    return nice;
  };

  function HangoutMoments() {
    var google, google2;

    // Need to use two different OAuth Authentications for now because the
    // https://www.googleapis.com/auth/plus.moments.write scope
    // doesn't play along nicely with other scopes...

    // Authentication for Google Drive
    google = new global.OAuth2("google", {
      client_id: "<CLIENT_ID>",
      client_secret: "<CLIENT_SECRET>",
      api_scope: "https://www.googleapis.com/auth/drive.file"
    });

    // Authentication for History API
    google2 = new global.OAuth2("google2", {
      client_id: "<CLIENT_ID>",
      client_secret: "<CLIENT_SECRET>",
      api_scope: "https://www.googleapis.com/auth/plus.moments.write https://www.googleapis.com/auth/plus.me"
    });

    // Create a desktop notification
    function createNotification(text, title, image, timeout) {
      var notification;
      notification = global.webkitNotifications.createNotification(
        image || global.chrome.extension.getURL("icon48.png"),
        title || "Hangout Moments",
        text
      );
      notification.show();
      global.setTimeout(function () {
        try { notification.cancel(); } catch (e) { }
      }, timeout || 3000);
    }

    function createFolder(name, parent, cb) {
      var xhrFolder, metadata;
      createNotification("Creating folder " + name);

      xhrFolder = new global.XMLHttpRequest();
      xhrFolder.onreadystatechange = function () {
        var response;
        if (xhrFolder.readyState === 4) {
          if (xhrFolder.status === 200) {
            response = JSON.parse(xhrFolder.response);
            global.setTimeout(function () { cb(response.id); }, 1);
          } else {
            global.console.log("Error creating folder", xhrFolder.status, xhrFolder.statusText);
            createNotification("Error " + xhrFolder.status + ": " + xhrFolder.statusText, "Hangout Moments - Error");
          }
        }
      };

      xhrFolder.open("POST", "https://www.googleapis.com/drive/v2/files", true);
      xhrFolder.setRequestHeader("Authorization", "OAuth " + google.getAccessToken());
      xhrFolder.setRequestHeader("Content-Type", "application/json");

      metadata = {
        "title": name,
        "mimeType": "application/vnd.google-apps.folder"
      };

      if (parent) {
        metadata.parents = [{
          "kind": "drive#fileLink",
          "id": parent
        }];
      }

      xhrFolder.send(JSON.stringify(metadata));
    }

    // Change permissions for given file/folder to "Anyone with a link"
    function setPublic(fileId, cb) {
      var xhrPerm, permissions;
      createNotification("Setting permission to \"Anyone with a link\" for easy sharing.");

      xhrPerm = new global.XMLHttpRequest();

      xhrPerm.onreadystatechange = function () {
        if (xhrPerm.readyState === 4) {
          if (xhrPerm.status === 200) {
            global.setTimeout(cb, 1);
          } else {
            global.console.log("Error setting permissions", xhrPerm.status, xhrPerm.statusText);
            createNotification("Error " + xhrPerm.status + ": " + xhrPerm.statusText, "Hangout Moments - Error");
          }
        }
      };

      xhrPerm.open("POST", "https://www.googleapis.com/drive/v2/files/" + fileId + "/permissions", true);
      xhrPerm.setRequestHeader("Content-Type", "application/json");
      xhrPerm.setRequestHeader("Authorization", "OAuth " + google.getAccessToken());
      permissions = {
        role: "reader",
        type: "anyone",
        withLink: true
      };
      xhrPerm.send(JSON.stringify(permissions));
    }

    // search for one specific folder which should hold all subfolders for this extensions
    // create one if not found
    function getParentFolder(cb) {
      var xhrFolder;

      createNotification("Finding application folder...");

      xhrFolder = new global.XMLHttpRequest();
      xhrFolder.onreadystatechange = function () {
        var response, i, l, found;
        if (xhrFolder.readyState === 4) {
          if (xhrFolder.status === 200) {
            response = JSON.parse(xhrFolder.response);
            found = -1;
            if (response.items && response.items.length > 0) {
              l = response.items.length;
              for (i = 0; i < l; i++) {
                if (response.items[i].title === "Hangout Moments") {
                  found = i;
                  break;
                }
              }
            }
            if (found < 0) {
              createFolder("Hangout Moments", undefined, cb);
            } else {
              global.setTimeout(function () { cb(response.items[found].id); }, 1);
            }
          } else {
            global.console.log("Error fetching folder", xhrFolder.status, xhrFolder.statusText);
            createNotification("Error " + xhrFolder.status + ": " + xhrFolder.statusText, "Hangout Moments - Error");
          }
        }
      };

      xhrFolder.open("GET", "https://www.googleapis.com/drive/v2/files?q=" + encodeURIComponent("title='Hangout Moments' and mimeType= 'application/vnd.google-apps.folder'"), true);
      xhrFolder.setRequestHeader("Authorization", "OAuth " + google.getAccessToken());

      xhrFolder.send();
    }

    // upload file to Google Drive
    function uploadFile(data, type, encoding, title, folderId, cb) {
      var boundary, delimiter, close_delim, metadata, multipartRequestBody, xhr;

      createNotification("Uploading " + title + " to Google Drive.");

      boundary = "-------314159265358979323846";
      delimiter = "\r\n--" + boundary + "\r\n";
      close_delim = "\r\n--" + boundary + "--";
      metadata = {
        "title": title,
        "mimeType": type,
        "parents": [{
          "kind": "drive#fileLink",
          "id": folderId
        }]
      };

      multipartRequestBody =
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: " + type + "\r\n";

      if (encoding) {
        multipartRequestBody += "Content-Transfer-Encoding: " + encoding + "\r\n";
      }

      multipartRequestBody +=
        "\r\n" +
        data +
        close_delim;

      xhr = new global.XMLHttpRequest();
      xhr.onreadystatechange = function () {
        var response;
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            response = JSON.parse(xhr.response);
            global.setTimeout(function () { cb(response.id); }, 1);
          } else {
            global.console.log("Error creating file", xhr.status, xhr.statusText);
            createNotification("Error " + xhr.status + ": " + xhr.statusText, "Hangout Moments - Error");
          }
        }
      };

      xhr.open("POST", "https://www.googleapis.com/upload/drive/v2/files", true);
      xhr.setRequestHeader("Authorization", "OAuth " + google.getAccessToken());
      xhr.setRequestHeader("Content-Type", 'multipart/mixed; boundary="' +
          boundary + '"');
      xhr.send(multipartRequestBody);
    }

    // Add moment to Google+ History
    function writeMoment(url) {
      createNotification("Adding screenshot to Google+ History.");

      google2.authorize(function () {
        var xhrMoment, moment;

        moment = {
          type: "http://schemas.google.com/AddActivity",
          target: {
            url: url
          }
        };

        xhrMoment = new global.XMLHttpRequest();

        xhrMoment.onreadystatechange = function () {
          if (xhrMoment.readyState === 4) {
            if (xhrMoment.status >= 200 && xhrMoment.status <= 204) {
              createNotification("Screenshot saved to Google Drive and History", undefined, undefined, 5000);
            } else {
              global.console.log("Error writing moment", xhrMoment.status, xhrMoment.statusText);
              createNotification("Error " + xhrMoment.status + ": " + xhrMoment.statusText, "Hangout Moments - Error");
            }
          }
        };

        xhrMoment.open("POST", "https://www.googleapis.com/plus/v1moments/people/me/moments/vault?debug=true", true);

        xhrMoment.setRequestHeader("Content-Type", "application/json");
        xhrMoment.setRequestHeader("Authorization", "OAuth " + google2.getAccessToken());

        xhrMoment.send(JSON.stringify(moment));
      });
    }

    function createHangoutMoment(data, participants) {
      var date = new Date();
      getParentFolder(function (parentId) {
        createFolder("Hangout Moment " + date.niceDate(), parentId, function (folderId) {
          setPublic(folderId, function () {
            uploadFile(data, "image/png", "base64", "image.png", folderId, function () {
              var html, i, l;
              html = "";
              html += "<!DOCTYPE html>\r\n";
              html += "<html itemscope itemtype=\"http://schema.org/Thing\">\r\n";
              html += "  <head>\r\n";
              html += "    <meta charset=\"UTF-8\">\r\n";
              html += "    <title itemprop=\"name\">Hangout Moment " + date.niceDate() + "</title>\r\n";
              html += "  </head>\r\n";
              html += "  <body style=\"text-align: center;\">\r\n";
              html += "    <img itemprop=\"image\" src=\"image.png\" alt=\"Hangout moment\" style=\"max-width: 90%;\"><br>\r\n";
              html += "    <p itemprop=\"description\">\r\n";
              html += "      Date/Time: <b>" + date.niceDate() + "</b><br>\r\n";
              html += "      Participants: ";
              l = participants.length;
              for (i = 0; i < l; i++) {
                if (i > 0) {
                  html += " / ";
                }
                html += "<b>" + participants[i] + "</b>";
              }
              html += "\r\n";
              html += "    </p><br>\r\n";
              html += "  </body>\r\n";
              html += "</html>\r\n";
              uploadFile(html, "text/html", undefined, "index.html", folderId, function () {
                writeMoment("https://www.googledrive.com/host/" + folderId);
              });
            });
          });
        });
      });
    }

    global.chrome.extension.onMessage.addListener(
      function (request, sender) {
        var image1, image2;
        if (sender.tab && request.mainVideo && request.thumbnailsStrip && request.participants) {
          image1 = new global.Image();
          image1.onload = function () {
            image2 = new global.Image();
            image2.onload = function () {
              // stitch together screenshot using the two images
              var canvas, ctx, w, h;
              canvas = global.document.createElement("canvas");
              w = Math.max(image1.width, image2.width) + 10;
              h = image1.height + image2.height + 20;
              canvas.width = w;
              canvas.height = h;
              ctx = canvas.getContext("2d");
              ctx.fillStyle = "rgb(255,255,255)";
              ctx.fillRect(0, 0, w, h);
              ctx.drawImage(image1, (w - image1.width) / 2 + 5, 5);
              ctx.drawImage(image2, (w - image2.width) / 2 + 5, image1.height + 15);

              google.authorize(function () {
                var data = canvas.toDataURL("image/png");
                data = data.substr(22);
                createHangoutMoment(data, request.participants);
              });
            };
            image2.src = request.thumbnailsStrip.data;
          };
          image1.src = request.mainVideo.data;
        }
      }
    );
  }

  global.hangoutMoments = new HangoutMoments();
}(this));
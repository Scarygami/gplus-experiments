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

  var
    // insert your key from the Api Console here
    apiKey = "YOUR_API_KEY",
    
    // Those might change at any point without prior notice...
    nodeClass1 = "aZTfpe",
    nodeClass2 = "w7v13d",
    linkSelector = ".V4U8gd > a",
    textSelector = ".HAtomb.ZOMTsf",

    handledClass = "plusone_handled",
    nodeSelector = "." + nodeClass1 + "." + nodeClass2 + ":not(." + handledClass + ")",

    doc = global.document,
    mainDiv = doc.getElementById("contentPane"),
    observer, users = {}, fetchQueue = [], fetching;


  function apiRequest(url, callback) {
    var xhr = new global.XMLHttpRequest();

    xhr.onreadystatechange = function () {
      var response;
      if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status <= 204) {
          response = JSON.parse(xhr.responseText);
          callback(response);
        } else {
          callback();
        }
      }
    };
    url += ((url.indexOf("?") >= 0) ? "&" : "?") + "key=" + apiKey;
    xhr.open("GET", url, true);
    xhr.send();
  }

  function fetchPosts(id, callback) {
    apiRequest("https://www.googleapis.com/plus/v1/people/" + id + "/activities/public", callback);
  }

  function fetchUser(id, callback) {
    apiRequest("https://www.googleapis.com/plus/v1/people/" + id, callback);
  }

  function fetchNext() {
    var id;
    if (fetchQueue.length > 0) {
      fetching = true;
      id = fetchQueue[0].id;
      fetchUser(id, function (userdata) {
        if (!!userdata) {
          fetchPosts(id, function (postsdata) {
            var i;
            if (!!postsdata) {
              users[id] = userdata;
              users[id].activities = postsdata.items;
              i = 0;
              // handle callbacks for all tasks with this user id
              while (i < fetchQueue.length) {
                if (fetchQueue[i].id === id) {
                  fetchQueue[i].callback(users[id]);
                  fetchQueue.splice(i, 1);
                } else {
                  i++;
                }
              }
              global.setTimeout(fetchNext, 1);
            } else {
              // some error occured, some timeout before next attempt
              // and push erronous task to end of queue
              fetchQueue.push(fetchQueue.shift());
              global.setTimeout(fetchNext, 100);
            }
          });
        } else {
          // some error occured, some timeout before next attempt
          // and push erronous task to end of queue
          fetchQueue.push(fetchQueue.shift());
          global.setTimeout(fetchNext, 100);
        }
      });
    } else {
      fetching = false;
    }
  }

  function getData(id, callback) {
    if (!!users[id]) {
      // we already have data, callback immediately with cached data
      callback(users[id]);
      return;
    }
    // Add new task to queue
    fetchQueue.push({id: id, callback: callback});
    if (!fetching) {
      fetchNext();
    }
  }

  function update_node(node) {
    var a, url, url_parts, p, userId, i, textDiv, text;
    node.classList.add(handledClass);
    a = node.querySelector(linkSelector);
    if (!!a) {
      url = a.href;
      url_parts = url.split("/");
      p = url_parts.indexOf("posts");
      if (p > 0 && p < url_parts.length - 1) {
        userId = url_parts[p - 1];
        getData(userId, function (data) {
          a.innerHTML = "<img src=\"" + data.image.url + "\">";
          if (!!data.activities) {
            for (i = 0; i < data.activities.length; i++) {
              if (data.activities[i].url.indexOf(url_parts[p - 1] + "/posts/" + url_parts[p + 1]) >= 0) {
                textDiv = node.querySelector(textSelector);
                if (!!textDiv) {
                  text = doc.createElement("div");
                  // Might include more of the post content here but only displaying post title for now
                  text.innerHTML = data.activities[i].title;
                  textDiv.appendChild(text);
                }
                break;
              }
            }
          }
        });
      }
    }
  }

  function update(nodes) {
    var i, node;
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];
      if (node.classList.contains(nodeClass1) &&
          node.classList.contains(nodeClass2) &&
          !node.classList.contains(handledClass)) {
        update_node(node);
      }
    }
  }

  // handle nodes that get added dynamically after the script started
  observer = new global.MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (!!mutation.addedNodes && mutation.addedNodes.length > 0) {
        update(mutation.addedNodes);
      }
    });
  });
  observer.observe(mainDiv, {childList: true, subtree: true});

  // handle nodes that were added before the script started
  update(mainDiv.querySelectorAll(nodeSelector));

}(this));
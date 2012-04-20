/** Licensed under the Apache License, Version 2.0 (the "License"); you may not
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

var scopes = ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/hangout.av', 'https://www.googleapis.com/auth/hangout.participants'];

var post_user = "";
var post_id = "";
var activity_id = "";

var comments = [];

var timer = null;


Date.prototype.nice_date = function () {
  "use strict";
  var y, m, d, h, min, sec, now;
  now = new Date();
  y = this.getFullYear().toString();
  m = (this.getMonth() + 1).toString();
  d  = this.getDate().toString();
  h = this.getHours().toString();
  min = this.getMinutes().toString();
  sec = this.getSeconds().toString();
  if (this.getFullYear() === now.getFullYear() && this.getMonth() === now.getMonth() && this.getDate() === now.getDate()) {
    return (h[1] ? h : "0" + h[0]) + ":" + (min[1] ? min : "0" + min[0]);
  } else {
    return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]) + " " + (h[1] ? h : "0" + h[0]) + ":" + (min[1] ? min : "0" + min[0]);
  }
};

function format_comment(item) {
  "use strict";
  var str_comment = "";
  str_comment += "<div class=\"comment\">";
  str_comment += "<img class=\"comment_pic\" src=\"" + item.actor.image.url + "\">\n";
  str_comment += "<div class=\"comment_time\">" + (new Date(item.published)).nice_date() + "</div>";
  str_comment += "<b>" + item.actor.displayName + "</b><br>";

  str_comment += "<div class=\"comment_text\">" + item.object.content + "</div></div>";
  return str_comment;
}

function show_comments() {
  "use strict";
  var request;
  if (activity_id !== "") {
    request = gapi.client.plus.comments.list({"activityId": activity_id, "maxResults": 100, "sortOrder": "descending"});
    request.execute(function (resp) {
      var i, i1, l, l1, str_comments, chk_new, item;
      if (resp.items) {
        if (comments.length === 0) {
          $("#comments").html("");
        }
        str_comments = "";
        l = resp.items.length;
        for (i = 0; i < l; i++) {
          item = resp.items[i];
          chk_new = true;
          l1 = comments.length;
          for (i1 = 0; i1 < l1; i1++) {
            if (comments[i1] === item.id) {
              chk_new = false;
              break;
            }
          }
          if (chk_new) {
            comments.push(item.id);
            str_comments += format_comment(item);
          }
        }
        $("#comments").prepend(str_comments);
        $("#searching").hide();
      } else {
        $("#searching").hide();
        $("#comments").html("No comments found.");
      }
      timer = setTimeout(show_comments, 60000);
    });
  }
}

function search_comments() {
  "use strict";
  $("#searching").show();
  var url, url_parts, l, post_user_new, post_id_new, request;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  url = $.trim($("#post_url").val());
  url_parts = url.split("/");
  l = url_parts.length;
  if (url_parts[l - 2] === "posts" && l >= 3) {
    post_user_new = url_parts[l - 3];
    post_id_new = url_parts[l - 1];
    if (post_user_new !== post_user || post_id_new !== post_id || activity_id === "") {
      activity_id = "";
      comments = [];
      $("#comments").html("");
      request = gapi.client.plus.activities.list({"userId": post_user_new, "collection": "public", "maxResults": 100});
      request.execute(function (resp) {
        var i, l, api_url, api_url_parts;
        if (resp.items) {
          l = resp.items.length;
          for (i = 0; i < l; i++) {
            api_url = resp.items[i].url;
            api_url_parts = api_url.split("/");
            if (api_url_parts.length > 0) {
              if (api_url_parts[api_url_parts.length - 1] === post_id_new) {
                activity_id = resp.items[i].id;
                post_user = post_user_new;
                post_id = post_id_new;
                break;
              }
            }
          }
          if (activity_id === "") {
            $("#comments").html("Post not found.<br>\nPlease check your Post URL");
            $("#searching").hide();
          } else {
            show_comments();
          }
        } else {
          $("#comments").html("No posts found for User ID " + post_user_new + "<br>\nPlease check your Post URL");
          $("#searching").hide();
        }
      });
    } else {
      show_comments();
    }
  } else {
    $("#comments").html("No valid post URL!");
  }
}

function handleAuthResult(authResult) {
  "use strict";
  if (authResult) {
    $("#comments").html("");
    gapi.client.load('plus', 'v1', function () {
      $("#search").show();
      $("#search_comments").click(search_comments);
    });
  } else {
    $("#search").hide();
    $("#comments").html("Not authorized...");
  }
}

function checkAuth() {
  "use strict";
  gapi.auth.authorize({client_id: null, scope: scopes, immediate: true}, handleAuthResult);
}


function onClientReady() {
  "use strict";
  gapi.hangout.onApiReady.add(function (event) {
    if (event.isApiReady) {
      gapi.client.setApiKey(null);
      window.setTimeout(function () { checkAuth(); }, 1);
    }
  });
}

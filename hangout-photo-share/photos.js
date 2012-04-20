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

var
  HOST = "<YOUR PATH>",
  pic_url = "",
  pic_title = "",
  pic_author = "",
  pic_author_id = "",
  pic_info = "",
  author_id = "",
  album_id = "",
  photos = [],
  albums = [],
  current_photo = 0;

function Photo(url, title, author, author_id, info, thumb) {
  "use strict";
  this.url = url;
  this.title = title;
  this.author = author;
  this.author_id = author_id;
  this.info = info;
  this.thumb = thumb;
}

function Album(id, title) {
  "use strict";
  this.id = id;
  this.title = title;
}

Date.prototype.nice_date = function () {
  "use strict";
  var y, m, d, h, min, sec, now;
  now = new Date();
  y = this.getFullYear().toString();
  m = (this.getMonth() + 1).toString();
  d  = this.getDate().toString();
  h = this.getHours().toString();
  min = this.getMinutes().toString();
  return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]) + " " + (h[1] ? h : "0" + h[0]) + ":" + (min[1] ? min : "0" + min[0]);
};

function display_pic() {
  "use strict";
  $("#contents_pic").html("");
  $("#contents_text").html("");
  if (pic_url !== "") {
    $("#contents_pic").html("<img src=\"" + pic_url + "\" class=\"photo\">");
    $("#contents_text").html(pic_title);
    if (pic_author !== "") {
      $("#contents_text").append(" by " + pic_author);
    }
    $("#contents_text").append("<br>");
    $("#contents_text").append(pic_info);
  }
  if (pic_author_id === author_id) {
    if (photos.length > 1) {
      $("#next").show();
      $("#prev").show();
    } else {
      $("#next").hide();
      $("#prev").hide();
    }
  } else {
    $("#next").hide();
    $("#prev").hide();
  }
}

function choose_pic(p, t, a, ai, i) {
  "use strict";
  var new_state = {};
  pic_url = p;
  pic_title = t;
  pic_author = a;
  pic_author_id = ai;
  pic_info = i;
  new_state.pic_url = pic_url;
  new_state.pic_title = pic_title;
  new_state.pic_author = pic_author;
  new_state.pic_author_id = pic_author_id;
  new_state.pic_info = pic_info;
  gapi.hangout.data.submitDelta(new_state, []);
  display_pic();
}

function choose_photo(p) {
  "use strict";
  current_photo = parseInt(p, 10);
  var photo = photos[current_photo];
  choose_pic(photo.url, photo.title, photo.author, photo.author_id, photo.info);
}

function fetch_photos(a_id) {
  "use strict";
  if (a_id !== album_id) {
    photos.length = 0;
    $("#next").hide();
    $("#prev").hide();
    album_id = a_id;
    $("#search_photos").html("<img src=\"" + HOST + "images/spinner.gif\" alt=\"searching\"> Searching for photos...");
    $.get("https://picasaweb.google.com/data/feed/api/user/" + author_id + "/albumid/" + album_id + "?alt=json&access=public&thumbsize=120", function (data) {
      if (data.feed && data.feed.entry && data.feed.entry.length > 0) {
        var p, i, l, url, author, info, title, thumb, tmp, tmp_date;
        $("#search_photos").html("");
        l = data.feed.entry.length;
        for (i = 0; i < l; i++) {
          p = data.feed.entry[i];
          info = "";
          tmp = "";
          if (p.exif$tags && p.exif$tags.exif$time) {
            tmp = p.exif$tags.exif$time.$t;
          } else {
            if (p.gphoto$timestamp) {
              tmp = p.gphoto$timestamp.$t;
            }
          }
          if (tmp !== "") {
            tmp_date = new Date(parseInt(tmp, 10));
            info = tmp_date.nice_date();
          }
          title = p.summary.$t || p.title.$t;
          author = p.media$group.media$credit[0].$t;
          thumb = p.media$group.media$thumbnail[0].url;
          url = thumb.replace("/s120/", "/s1024/");
          photos.push(new Photo(url, title, author, author_id, info, thumb));

          $("#search_photos").append("<img id=\"p" + (photos.length - 1) + "\" class=\"preview\" src=\"" + thumb + "\" alt=\"" + title + "\" title=\"" + title + "\"> ");
        }

        $("#search_photos > img").click(function () {
          choose_photo(this.id.substr(1));
        });
      } else {
        $("#search_photos").html("No photos found. Try picking another album above.");
      }
    }, "jsonp");
  }
}

function fetch_albums() {
  "use strict";
  albums.length = 0;
  $("#albums").html("<img src=\"" + HOST + "images/spinner.gif\" alt=\"searching\"> Searching for albums...");
  $.get("https://picasaweb.google.com/data/feed/api/user/" + author_id + "?alt=json&access=public&thumbsize=100", function (data) {
    if (data.feed && data.feed.entry && data.feed.entry.length > 0) {
      var a, i, l, t;
      $("#albums").html("<table id=\"table_albums\"><tbody><tr><td></td></tr></tbody></table>");
      l = data.feed.entry.length;
      for (i = 0; i < l; i++) {
        a = data.feed.entry[i];
        t = a.title.$t;
        albums.push(new Album("a" + a.gphoto$id.$t, t.toLowerCase()));
        if (parseInt(a.gphoto$numphotos.$t, 10) === 1) {
          t += " / 1 photo";
        } else {
          t += " / " + a.gphoto$numphotos.$t + " photos";
        }
        $("#table_albums > tbody > tr").append("<td id=\"a" + a.gphoto$id.$t + "\"></td>");
        $("#a" + a.gphoto$id.$t).html("<img class=\"preview\" src=\"" + a.media$group.media$thumbnail[0].url + "\" alt=\"" + t + "\" title=\"" + t + "\">");
      }

      $("#table_albums > tbody > tr > td").click(function () {
        fetch_photos(this.id.substr(1));
      });
    } else {
      $("#albums").html("No albums found...");
      $("#search_photos").html("");
    }
  }, "jsonp");
}

function state_change() {
  var state;
  state = gapi.hangout.data.getState();
  if (state.hasOwnProperty("pic_url")) {
    if (state.pic_url !== pic_url) {
      pic_url = state.pic_url;
      pic_title = state.pic_title;
      pic_author = state.pic_author;
      pic_author_id = state.pic_author_id;
      pic_info = state.pic_info;
      display_pic();
    }
  }
}

function initialize() {
  "use strict";
  var p = gapi.hangout.getParticipantById(gapi.hangout.getParticipantId());
  author_id = p.person.id;
  gapi.hangout.data.onStateChanged.add(function (eventObj) {
    window.setTimeout(function () { state_change(); }, 1);
  });

  $("#search_switch").click(function () {
    if ($("#search").is(":visible")) {
      $("#collapse_search").hide();
      $("#expand_search").show();
      $("#search").hide();
      $("#contents").css("padding-left", "20px");
      $("#search_panel").css("width", "20px");
      $("#search_panel").css("min-width", "20px");
      $("#search_panel").css("max-width", "20px");
    } else {
      $("#expand_search").hide();
      $("#collapse_search").show();
      $("#contents").css("padding-left", "405px");
      $("#search_panel").css("width", "400px");
      $("#search_panel").css("min-width", "400px");
      $("#search_panel").css("max-width", "400px");
      $("#search").show();
    }
  });

  $("#prev").click(function () {
    var photo;
    if (photos.length > 0) {
      if (current_photo === 0) {
        current_photo = photos.length - 1;
      } else {
        current_photo -= 1;
      }
      photo = photos[current_photo];
      choose_pic(photo.url, photo.title, photo.author, photo.author_id, photo.info);
    }
  });

  $("#next").click(function () {
    var photo;
    if (photos.length > 0) {
      if (current_photo === photos.length - 1) {
        current_photo = 0;
      } else {
        current_photo += 1;
      }
      photo = photos[current_photo];
      choose_pic(photo.url, photo.title, photo.author, photo.author_id, photo.info);
    }
  });

  $("#filter_text").keyup(function () {
    var i, l, search;
    l = albums.length;
    search =  $.trim($(this).val().toLowerCase());
    for (i = 0; i < l; i++) {
      if (albums[i].title.indexOf(search) >= 0) {
        $("#" + albums[i].id).show();
      } else {
        $("#" + albums[i].id).hide();
      }
    }
  });

  fetch_albums();
  state_change();
}

gapi.hangout.onApiReady.add(function (event) {
  "use strict";
  if (event.isApiReady) {
    window.setTimeout(function () { initialize(); }, 1);
  }
});
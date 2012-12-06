function AllMyPlus(global, base_url, api_key, author, keyword) {
  "use strict";

  var
    activities = [],
    S_VARS = 12,
    S_POSTS = 0, S_LOC = 1, S_PHOTOS = 2, S_GIFS = 3, S_VIDEOS = 4, S_LINKS = 5, S_COMMENTS = 6, S_CPP = 7, S_PLUSONES = 8, S_PPP = 9, S_RESHARES = 10, S_RPP = 11,
    ST_TOTAL = 0, ST_ORIGINAL = 1, ST_RESHARED = 2,
    SA_TOTAL = 0, SA_PUBLIC = 1, SA_EXTENDED = 2, SA_CIRCLES = 3, SA_LIMITED = 4,
    P_RESHARED = 0, P_RESHARES = 1, P_COMMENTS = 2, P_PLUSONES = 3,
    total_stats, hour_stats, day_stats, daily_stats, min_date, max_date,
    max_comments, max_comments_post, max_reshares, max_reshares_post, max_plusones, max_plusones_post,
    day_data, day_view, day_chart, weekday_data, weekday_view, weekday_chart, hour_data, hour_view, hour_chart,
    people = [], sort_function, date_sort_function,
    map, llbounds, chk_locations, dropZone, fileCount = 0, $ = global.$, chk_api_data = false, page_token = "", search_type = 0;

  Date.prototype.yyyymmddhhmmss = function () {
    var y, m, d, h, min, sec;
    y = this.getFullYear().toString();
    m = (this.getMonth() + 1).toString();
    d  = this.getDate().toString();
    h = this.getHours().toString();
    min = this.getMinutes().toString();
    sec = this.getSeconds().toString();
    return y + (m[1] ? m : "0" + m[0]) + (d[1] ? d : "0" + d[0]) + (h[1] ? h : "0" + h[0]) + (min[1] ? min : "0" + min[0]) + (sec[1] ? sec : "0" + sec[0]);
  };

  Date.prototype.nice_date = function () {
    var y, m, d, h, min, sec;
    y = this.getFullYear().toString();
    m = (this.getMonth() + 1).toString();
    d  = this.getDate().toString();
    h = this.getHours().toString();
    min = this.getMinutes().toString();
    sec = this.getSeconds().toString();
    return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]) + " " + (h[1] ? h : "0" + h[0]) + ":" + (min[1] ? min : "0" + min[0]) + ":" + (sec[1] ? sec : "0" + sec[0]);
  };

  Date.prototype.nice_short_date = function () {
    var y, m, d;
    y = this.getFullYear().toString();
    m = (this.getMonth() + 1).toString();
    d  = this.getDate().toString();
    return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]);
  };

  function strip_html(html) {
    var tmp = global.document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText;
  }

  function menu_click(name) {
    $(".menue").removeClass("menue_sel");
    $(".menue").addClass("menue_unsel");
    $("#men_" + name).removeClass("menue_unsel");
    $("#men_" + name).addClass("menue_sel");
    $(".contents").hide();
    $("#d_" + name).show();
    global.location.hash = "#" + name;
  }

  function find_person(id) {
    var i;
    for (i = 0; i < people.length; i++) {
      if (people[i].id === id) {
        return i;
      }
    }
    return -1;
  }

  sort_function = [];

  sort_function[P_RESHARED] = function (a, b) {
    var name1, name2;
    if (a.count[P_RESHARED] != b.count[P_RESHARED]) {
      return (b.count[P_RESHARED] - a.count[P_RESHARED]);
    } else if (a.count[P_COMMENTS] != b.count[P_COMMENTS]) {
      return (b.count[P_COMMENTS] - a.count[P_COMMENTS]);
    } else if (a.count[P_RESHARES] != b.count[P_RESHARES]) {
      return (b.count[P_RESHARES] - a.count[P_RESHARES]);
    } else if (a.count[P_PLUSONES] != b.count[P_PLUSONES]) {
      return (b.count[P_PLUSONES] - a.count[P_PLUSONES]);
    } else {
      if (a.name) {
        name1 = a.name.toUpperCase();
      } else {
        name1 = "";
      }
      if (b.name) {
        name2 = b.name.toUpperCase();
      } else {
        name2 = "";
      }
      if (name1 == name2) {
        return 0;
      } else {
        if (name1 < name2) {
          return -1;
        } else {
          return 1;
        }
      }
    }
  };

  sort_function[P_COMMENTS] = function (a, b) {
    var name1, name2;
    if (a.count[P_COMMENTS] != b.count[P_COMMENTS]) {
      return (b.count[P_COMMENTS] - a.count[P_COMMENTS]);
    } else if (a.count[P_RESHARES] != b.count[P_RESHARES]) {
      return (b.count[P_RESHARES] - a.count[P_RESHARES]);
    } else if (a.count[P_PLUSONES] != b.count[P_PLUSONES]) {
      return (b.count[P_PLUSONES] - a.count[P_PLUSONES]);
    } else if (a.count[P_RESHARED] != b.count[P_RESHARED]) {
      return (b.count[P_RESHARED] - a.count[P_RESHARED]);
    } else {
      if (a.name) {
        name1 = a.name.toUpperCase();
      } else {
        name1 = "";
      }
      if (b.name) {
        name2 = b.name.toUpperCase();
      } else {
        name2 = "";
      }
      if (name1 == name2) {
        return 0;
      } else {
        if (name1 < name2) {
          return -1;
        } else {
          return 1;
        }
      }
    }
  };

  sort_function[P_RESHARES] = function (a, b) {
    var name1, name2;
    if (a.count[P_RESHARES] != b.count[P_RESHARES]) {
      return (b.count[P_RESHARES] - a.count[P_RESHARES]);
    } else if (a.count[P_COMMENTS] != b.count[P_COMMENTS]) {
      return (b.count[P_COMMENTS] - a.count[P_COMMENTS]);
    } else if (a.count[P_PLUSONES] != b.count[P_PLUSONES]) {
      return (b.count[P_PLUSONES] - a.count[P_PLUSONES]);
    } else if (a.count[P_RESHARED] != b.count[P_RESHARED]) {
      return (b.count[P_RESHARED] - a.count[P_RESHARED]);
    } else {
      if (a.name) {
        name1 = a.name.toUpperCase();
      } else {
        name1 = "";
      }
      if (b.name) {
        name2 = b.name.toUpperCase();
      } else {
        name2 = "";
      }
      if (name1 == name2) {
        return 0;
      } else {
        if (name1 < name2) {
          return -1;
        } else {
          return 1;
        }
      }
    }
  };

  sort_function[P_PLUSONES] = function (a, b) {
    var name1, name2;
    if (a.count[P_PLUSONES] != b.count[P_PLUSONES]) {
      return (b.count[P_PLUSONES] - a.count[P_PLUSONES]);
    } else if (a.count[P_COMMENTS] != b.count[P_COMMENTS]) {
      return (b.count[P_COMMENTS] - a.count[P_COMMENTS]);
    } else if (a.count[P_RESHARES] != b.count[P_RESHARES]) {
      return (b.count[P_RESHARES] - a.count[P_RESHARES]);
    } else if (a.count[P_RESHARED] != b.count[P_RESHARED]) {
      return (b.count[P_RESHARED] - a.count[P_RESHARED]);
    } else {
      if (a.name) {
        name1 = a.name.toUpperCase();
      } else {
        name1 = "";
      }
      if (b.name) {
        name2 = b.name.toUpperCase();
      } else {
        name2 = "";
      }
      if (name1 == name2) {
        return 0;
      } else {
        if (name1 < name2) {
          return -1;
        } else {
          return 1;
        }
      }
    }
  };

  date_sort_function = function (a, b) {
    var date1, date2;
    date1 = (new Date(a.published)).getTime();
    date2 = (new Date(b.published)).getTime();
    return date2 - date1;
  };

  function format_person(p, type) {
    var str_contents;
    str_contents = "<table class=\"person\" id=\"c" + type.toString() + "_" + p.id + "\"><tr>";
    str_contents += "<td><a href=\"" + p.url + "\"><img src=\"" + p.pic + "\"></a></td>";
    str_contents += "<td><a href=\"" + p.url + "\">" + p.name + "</a><br></td>";
    str_contents += "<td class=\"count\"></td></tr></table>";
    return str_contents;
  }

  function display_people(div, type) {
    var p, table;
    people.sort(sort_function[type]);
    for (p = 0; p < people.length; p++) {
      if (people[p].count[type] > 0 || people[p].chk_displayed[type]) {
        if (people[p].chk_displayed[type]) {
          table = $("#c" + type.toString() + "_" + people[p].id);
          if (people[p].count[type] === 0) {
            table.hide();
          } else {
            table.show();
          }
        } else {
          table = $(format_person(people[p], type));
          people[p].chk_displayed[type] = true;
        }
        if (p === 0) {
          $(div).prepend(table);
        } else {
          $("#c" + type.toString() + "_" + people[p - 1].id).after(table);
        }
        $("#c" + type.toString() + "_" + people[p].id + " .count").html(people[p].count[type].toString());
      }
    }
  }

  function update_activity(i) {
    var a, j, chk_r, int_type, int_audience, post_time, post_hour, post_day, post_date, att, att_link, item;
    item = activities[i];

    post_time = new Date(item.published);
    post_hour = post_time.getHours();
    post_day = post_time.getDay();
    post_day = (post_day === 0) ? 6 : post_day - 1;
    post_date = post_time.nice_short_date();
    item.int_hour = post_hour;
    item.int_weekday = post_day;
    item.str_day = post_date;
    chk_r = (item.object.actor != undefined);
    item.org_author_name = "";
    item.org_author_id = "";

    if (chk_r) {
      item.chk_reshared = true;
      item.chk_original = false;
      item.org_author_name = item.object.actor.displayName || "";
      item.org_author_id = item.object.actor.id || "";
    } else {
      item.chk_reshared = false;
      item.chk_original = true;
    }
    int_type = chk_r ? ST_RESHARED : ST_ORIGINAL;
    int_audience = SA_LIMITED;
    for (j = 0; j < item.access.items.length; j++) {
      if (item.access.items[j].type == "public") {
        int_audience = SA_PUBLIC;
        break;
      }
      if (item.access.items[j].type == "myCircles") {
        int_audience = SA_CIRCLES;
        break;
      }
      if (item.access.items[j].type == "extendedCircles") {
        int_audience = SA_EXTENDED;
        break;
      }
    }
    item.int_audience = int_audience;

    item.chk_comments = false;
    item.int_comments = 0;
    if (item.object.replies != undefined) {
      if (item.object.replies.totalItems > max_comments) {
        max_comments = item.object.replies.totalItems;
        max_comments_post = i;
      }
      if (item.object.replies.totalItems > 0) {
        item.chk_comments = true;
      }
      item.int_comments = item.object.replies.totalItems;
    }

    item.chk_plusones = false;
    item.int_plusones = 0;
    if (item.object.plusoners != undefined) {
      item.int_plusones = item.object.plusoners.totalItems;
      if (item.object.plusoners.items) {
        if (item.object.plusoners.items.length > item.int_plusones) {
          item.int_plusones = item.object.plusoners.items.length;
        }
      }
    }
    if (item.int_plusones > 0) {
      if (item.int_plusones > max_plusones) {
        max_plusones = item.int_plusones;
        max_plusones_post = i;
      }
      item.chk_plusones = true;
    }

    item.chk_reshares = false;
    item.int_reshares = 0;
    if (item.object.resharers != undefined) {
      if (item.object.resharers.totalItems > max_reshares) {
        max_reshares = item.object.resharers.totalItems;
        max_reshares_post = i;
      }
      if (item.object.resharers.totalItems > 0) {
        item.chk_reshares = true;
      }
      item.int_reshares = item.object.resharers.totalItems;
    }

    item.chk_location = false;
    if (item.geocode != undefined) {
      item.chk_location = true;
    }
    item.chk_videos = false;
    item.chk_photos = false;
    item.chk_gifs = false;
    item.chk_links = false;
    item.int_videos = 0;
    item.int_photos = 0;
    item.int_gifs = 0;
    item.int_links = 0;
    if (item.object.attachments != undefined) {
      for (a = 0; a < item.object.attachments.length; a++) {
        att = item.object.attachments[a];
        if (att.objectType == "article") {
          item.chk_links = true;
          item.int_links++;
        }
        if (att.objectType == "photo") {
          att_link = "";
          if (att.url != undefined) {
            att_link = att.url;
          }
          if (att_link == "") {
            if (att.fullImage != undefined) {
              att_link = att.fullImage.url;
            }
          }
          if (att_link.search("plus.google.com/photos") >= 0) {
            item.chk_photos = true;
            item.int_photos++;
          }
        }
        if (att.objectType == "video") {
          item.chk_videos = true;
          item.int_videos++;
        }
        if (att.image != undefined) {
          if (att.image.url != undefined) {
            att_link = "";
            if (att.url != undefined) {
              att_link = att.url;
            }
            if (att_link == "") {
              if (att.fullImage != undefined) {
                att_link = att.fullImage.url;
              }
            }
            if (att_link.search("plus.google.com/photos") >= 0) {
              att_link = att.image.url.toUpperCase();
              att_link = att_link.substring(att_link.length - 4);
              if (att_link == ".GIF") {
                item.chk_gifs = true;
                item.int_gifs++;
              }
            }
          }
        }
      }
    }
  }

  function filter_activities() {
    var i, l, changed, active, comments, reshares, plusones, str_contents, start, end, keyword, posttime, contents, items;
    l = activities.length;
    items = 0;
    comments = 0;
    reshares = 0;
    plusones = 0;
    changed = false;
    start = ($.datepicker.parseDate("yy-mm-dd", $("#date_from").val())).getTime();
    end = ($.datepicker.parseDate("yy-mm-dd", $("#date_to").val())).getTime() + 86399999;
    keyword = $.trim($("#filter_keyword").val()).toUpperCase();
    for (i = 0; i < l; i++) {
      active = true;
      posttime = (new Date(activities[i].published)).getTime();
      if (!activities[i].search_contents) {
        contents = strip_html(activities[i].object.content || "").toUpperCase();
        if (activities[i].annotation) {
          contents += " " + strip_html(activities[i].annotation).toUpperCase();
        }
        activities[i].search_contents = contents;
      } else {
        contents = activities[i].search_contents;
      }
      if (posttime < start || posttime > end) {
        active = false;
      }
      if (keyword && keyword !== "" && contents.indexOf(keyword) < 0) {
        active = false;
      }

      if (activities[i].chk_active !== active) {
        activities[i].chk_active = active;
        changed = true;
      }
      if (activities[i].chk_active) {
        items++;
        comments += activities[i].int_comments;
        reshares += activities[i].int_reshares;
        plusones += activities[i].int_plusones;
      }
    }
    if (changed) {
      $(".stat_calculated").removeClass("stat_calculated");
    }
    str_contents = "Activities: " + items + " / ";
    str_contents += "Comments: " +  comments + " / ";
    str_contents += "Reshares: " +  reshares + " / ";
    str_contents += "+1's: " +  plusones;

    $("#filtered_activities").html(str_contents);
  }

  function update_activities() {
    var i, l, comments, reshares, plusones, str_contents, min_date, max_date, post_time;
    l = activities.length;
    comments = 0;
    reshares = 0;
    plusones = 0;
    for (i = 0; i < l; i++) {
      update_activity(i);
      comments += activities[i].int_comments;
      reshares += activities[i].int_reshares;
      plusones += activities[i].int_plusones;
      post_time = new Date(activities[i].published);
      if (min_date) {
        if (post_time.getTime() < min_date.getTime()) {
          min_date = new Date();
          min_date.setFullYear(post_time.getFullYear(), post_time.getMonth(), post_time.getDate());
        }
      } else {
        min_date = new Date();
        min_date.setFullYear(post_time.getFullYear(), post_time.getMonth(), post_time.getDate());
      }
      if (max_date) {
        if (post_time.getTime() > max_date.getTime()) {
          max_date = new Date();
          max_date.setFullYear(post_time.getFullYear(), post_time.getMonth(), post_time.getDate());
        }
      } else {
        max_date = new Date();
        max_date.setFullYear(post_time.getFullYear(), post_time.getMonth(), post_time.getDate());
      }
    }
    str_contents = "Activities loaded: " + activities.length + "<br>";
    str_contents += "Comments: " +  comments + "<br>";
    str_contents += "Reshares: " +  reshares + "<br>";
    str_contents += "+1's: " +  plusones;
    $("#user_activities").html(str_contents);

    if (min_date) {
      if (min_date.getTime() === max_date.getTime()) {
        min_date.setDate(min_date.getDate() - 1);
      }
      $("#date_slider").slider("option", "min", min_date.getTime());
      $("#date_slider").slider("option", "max", max_date.getTime());
      $("#date_slider").slider("values", [min_date.getTime(), max_date.getTime()]);
      $("#date_from").val($.datepicker.formatDate("yy-mm-dd", min_date));
      $("#date_to").val($.datepicker.formatDate("yy-mm-dd", max_date));
    }

    filter_activities();
  }

  function add_cols(cols, int_col) {
    if ($("#chk_all").is(":checked")) { cols.push(int_col); }
    if ($("#chk_public").is(":checked")) { cols.push(int_col + 36); }
    if ($("#chk_extended").is(":checked")) { cols.push(int_col + 72); }
    if ($("#chk_circles").is(":checked")) { cols.push(int_col + 108); }
    if ($("#chk_limited").is(":checked")) { cols.push(int_col + 144); }
  }

  function update_charts() {
    var cols = [], int_col;
    cols.push(0);
    if ($("#chk_posts").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 1); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 2); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 3); }
    }
    if ($("#chk_location").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 4); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 5); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 6); }
    }
    if ($("#chk_photos").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 7); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 8); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 9); }
    }
    if ($("#chk_gifs").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 10); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 11); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 12); }
    }
    if ($("#chk_videos").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 13); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 14); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 15); }
    }
    if ($("#chk_links").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 16); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 17); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 18); }
    }
    if ($("#chk_comments").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 19); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 20); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 21); }
    }
    if ($("#chk_cpp").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 22); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 23); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 24); }
    }
    if ($("#chk_plusones").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 25); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 26); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 27); }
    }
    if ($("#chk_ppp").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 28); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 29); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 30); }
    }
    if ($("#chk_reshares").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 31); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 32); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 33); }
    }
    if ($("#chk_rpp").is(":checked")) {
      if ($("#chk_total").is(":checked")) { add_cols(cols, 34); }
      if ($("#chk_original").is(":checked")) { add_cols(cols, 35); }
      if ($("#chk_reshared").is(":checked")) { add_cols(cols, 36); }
    }
    if (cols.length > 1) {
      $("#chart_warning").hide();
      $("#day_chart").show();
      $("#weekday_chart").show();
      $("#hour_chart").show();
      day_view.setColumns(cols);
      day_chart.draw(day_view, {
        width: 950,
        height: 250,
        title: "Timeline",
        hAxis: {textStyle: {fontSize: 10}},
        legendTextStyle: {fontSize : 10}
      });
      weekday_view.setColumns(cols);
      weekday_chart.draw(weekday_view, {
        width: 950,
        height: 250,
        title: "Posting behaviour per weekday",
        hAxis: {textStyle: {fontSize: 10}},
        legendTextStyle: {fontSize: 10}
      });
      hour_view.setColumns(cols);
      hour_chart.draw(hour_view, {
        width: 950,
        height: 250,
        title: "Posting behaviour per hour",
        hAxis: {textStyle: {fontSize: 10}},
        legendTextStyle: {fontSize: 10}
      });
    } else {
      $("#chart_warning").show();
      $("#day_chart").hide();
      $("#weekday_chart").hide();
      $("#hour_chart").hide();
    }
  }

  function prepare_charts() {
    var data_array, i, j, k, l, day, tmp_date;
    data_array = [];
    data_array.push([
      'Hour',
      'Posts', 'Posts (o)', 'Posts (r)', 'Location', 'Location (o)', 'Location (r)', 'Photos', 'Photos (o)', 'Photos (r)', 'GIFs', 'GIFs (o)', 'GIFs (r)', 'Videos', 'Videos (o)', 'Videos (r)', 'Links', 'Links (o)', 'Links (r)', 'Comments', 'Comments (o)', 'Comments (r)', 'CpP', 'CpP (o)', 'CpP (r)', '+1\'s', '+1\'s (o)', '+1\'s (r)', 'PpP', 'PpP (o)', 'PpP (r)', 'Reshares', 'Reshares (o)', 'Reshares (r)', 'RpP', 'RpP (o)', 'RpP (r)',
      'Posts (p)', 'Posts (o/p)', 'Posts (r/p)', 'Location (p)', 'Location (o/p)', 'Location (r/p)', 'Photos (p)', 'Photos (o/p)', 'Photos (r/p)', 'GIFs (p)', 'GIFs (o/p)', 'GIFs (r/p)', 'Videos (p)', 'Videos (o/p)', 'Videos (r/p)', 'Links (p)', 'Links (o/p)', 'Links (r/p)', 'Comments (p)', 'Comments (o/p)', 'Comments (r/p)', 'CpP (p)', 'CpP (o/p)', 'CpP (r/p)', '+1\'s (p)', '+1\'s (o/p)', '+1\'s (r/p)', 'PpP (p)', 'PpP (o/p)', 'PpP (r/p)', 'Reshares (p)', 'Reshares (o/p)', 'Reshares (r/p)', 'RpP (p)', 'RpP (o/p)', 'RpP (r/p)',
      'Posts (e)', 'Posts (o/e)', 'Posts (r/e)', 'Location (e)', 'Location (o/e)', 'Location (r/e)', 'Photos (e)', 'Photos (o/e)', 'Photos (r/e)', 'GIFs (e)', 'GIFs (o/e)', 'GIFs (r/e)', 'Videos (e)', 'Videos (o/e)', 'Videos (r/e)', 'Links (e)', 'Links (o/e)', 'Links (r/e)', 'Comments (e)', 'Comments (o/e)', 'Comments (r/e)', 'CpP (e)', 'CpP (o/e)', 'CpP (r/e)', '+1\'s (e)', '+1\'s (o/e)', '+1\'s (r/e)', 'PpP (e)', 'PpP (o/e)', 'PpP (r/e)', 'Reshares (e)', 'Reshares (o/e)', 'Reshares (r/e)', 'RpP (e)', 'RpP (o/e)', 'RpP (r/e)',
      'Posts (c)', 'Posts (o/c)', 'Posts (r/c)', 'Location (c)', 'Location (o/c)', 'Location (r/c)', 'Photos (c)', 'Photos (o/c)', 'Photos (r/c)', 'GIFs (c)', 'GIFs (o/c)', 'GIFs (r/c)', 'Videos (c)', 'Videos (o/c)', 'Videos (r/c)', 'Links (c)', 'Links (o/c)', 'Links (r/c)', 'Comments (c)', 'Comments (o/c)', 'Comments (r/c)', 'CpP (c)', 'CpP (o/c)', 'CpP (r/c)', '+1\'s (c)', '+1\'s (o/c)', '+1\'s (r/c)', 'PpP (c)', 'PpP (o/c)', 'PpP (r/c)', 'Reshares (c)', 'Reshares (o/c)', 'Reshares (r/c)', 'RpP (c)', 'RpP (o/c)', 'RpP (r/c)',
      'Posts (l)', 'Posts (o/l)', 'Posts (r/l)', 'Location (l)', 'Location (o/l)', 'Location (r/l)', 'Photos (l)', 'Photos (o/l)', 'Photos (r/l)', 'GIFs (l)', 'GIFs (o/l)', 'GIFs (r/l)', 'Videos (l)', 'Videos (o/l)', 'Videos (r/l)', 'Links (l)', 'Links (o/l)', 'Links (r/l)', 'Comments (l)', 'Comments (o/l)', 'Comments (r/l)', 'CpP (l)', 'CpP (o/l)', 'CpP (r/l)', '+1\'s (l)', '+1\'s (o/l)', '+1\'s (r/l)', 'PpP (l)', 'PpP (o/l)', 'PpP (r/l)', 'Reshares (l)', 'Reshares (o/l)', 'Reshares (r/l)', 'RpP (l)', 'RpP (o/l)', 'RpP (r/l)'
    ]);
    for (i = 0; i < 24; i++) {
      data_array.push([
        i.toString(),
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]);
      for (j = 0; j < S_VARS; j++) {
        for (k = 0; k < 3; k++) {
          for (l = 0; l < 5; l++) {
            data_array[data_array.length - 1][l * 36 + j * 3 + k + 1] = hour_stats[i][j][k][l];
          }
        }
      }
    }
    hour_data = global.google.visualization.arrayToDataTable(data_array);

    data_array = [];
    data_array.push([
      'Weekday',
      'Posts', 'Posts (o)', 'Posts (r)', 'Location', 'Location (o)', 'Location (r)', 'Photos', 'Photos (o)', 'Photos (r)', 'GIFs', 'GIFs (o)', 'GIFs (r)', 'Videos', 'Videos (o)', 'Videos (r)', 'Links', 'Links (o)', 'Links (r)', 'Comments', 'Comments (o)', 'Comments (r)', 'CpP', 'CpP (o)', 'CpP (r)', '+1\'s', '+1\'s (o)', '+1\'s (r)', 'PpP', 'PpP (o)', 'PpP (r)', 'Reshares', 'Reshares (o)', 'Reshares (r)', 'RpP', 'RpP (o)', 'RpP (r)',
      'Posts (p)', 'Posts (o/p)', 'Posts (r/p)', 'Location (p)', 'Location (o/p)', 'Location (r/p)', 'Photos (p)', 'Photos (o/p)', 'Photos (r/p)', 'GIFs (p)', 'GIFs (o/p)', 'GIFs (r/p)', 'Videos (p)', 'Videos (o/p)', 'Videos (r/p)', 'Links (p)', 'Links (o/p)', 'Links (r/p)', 'Comments (p)', 'Comments (o/p)', 'Comments (r/p)', 'CpP (p)', 'CpP (o/p)', 'CpP (r/p)', '+1\'s (p)', '+1\'s (o/p)', '+1\'s (r/p)', 'PpP (p)', 'PpP (o/p)', 'PpP (r/p)', 'Reshares (p)', 'Reshares (o/p)', 'Reshares (r/p)', 'RpP (p)', 'RpP (o/p)', 'RpP (r/p)',
      'Posts (e)', 'Posts (o/e)', 'Posts (r/e)', 'Location (e)', 'Location (o/e)', 'Location (r/e)', 'Photos (e)', 'Photos (o/e)', 'Photos (r/e)', 'GIFs (e)', 'GIFs (o/e)', 'GIFs (r/e)', 'Videos (e)', 'Videos (o/e)', 'Videos (r/e)', 'Links (e)', 'Links (o/e)', 'Links (r/e)', 'Comments (e)', 'Comments (o/e)', 'Comments (r/e)', 'CpP (e)', 'CpP (o/e)', 'CpP (r/e)', '+1\'s (e)', '+1\'s (o/e)', '+1\'s (r/e)', 'PpP (e)', 'PpP (o/e)', 'PpP (r/e)', 'Reshares (e)', 'Reshares (o/e)', 'Reshares (r/e)', 'RpP (e)', 'RpP (o/e)', 'RpP (r/e)',
      'Posts (c)', 'Posts (o/c)', 'Posts (r/c)', 'Location (c)', 'Location (o/c)', 'Location (r/c)', 'Photos (c)', 'Photos (o/c)', 'Photos (r/c)', 'GIFs (c)', 'GIFs (o/c)', 'GIFs (r/c)', 'Videos (c)', 'Videos (o/c)', 'Videos (r/c)', 'Links (c)', 'Links (o/c)', 'Links (r/c)', 'Comments (c)', 'Comments (o/c)', 'Comments (r/c)', 'CpP (c)', 'CpP (o/c)', 'CpP (r/c)', '+1\'s (c)', '+1\'s (o/c)', '+1\'s (r/c)', 'PpP (c)', 'PpP (o/c)', 'PpP (r/c)', 'Reshares (c)', 'Reshares (o/c)', 'Reshares (r/c)', 'RpP (c)', 'RpP (o/c)', 'RpP (r/c)',
      'Posts (l)', 'Posts (o/l)', 'Posts (r/l)', 'Location (l)', 'Location (o/l)', 'Location (r/l)', 'Photos (l)', 'Photos (o/l)', 'Photos (r/l)', 'GIFs (l)', 'GIFs (o/l)', 'GIFs (r/l)', 'Videos (l)', 'Videos (o/l)', 'Videos (r/l)', 'Links (l)', 'Links (o/l)', 'Links (r/l)', 'Comments (l)', 'Comments (o/l)', 'Comments (r/l)', 'CpP (l)', 'CpP (o/l)', 'CpP (r/l)', '+1\'s (l)', '+1\'s (o/l)', '+1\'s (r/l)', 'PpP (l)', 'PpP (o/l)', 'PpP (r/l)', 'Reshares (l)', 'Reshares (o/l)', 'Reshares (r/l)', 'RpP (l)', 'RpP (o/l)', 'RpP (r/l)'
    ]);
    for (i = 0; i < 7; i++) {
      switch (i) {
      case 0: day = "Mon"; break;
      case 1: day = "Tue"; break;
      case 2: day = "Wed"; break;
      case 3: day = "Thu"; break;
      case 4: day = "Fri"; break;
      case 5: day = "Sat"; break;
      case 6: day = "Sun"; break;
      }
      data_array.push([
        day,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]);
      for (j = 0; j < S_VARS; j++) {
        for (k = 0; k < 3; k++) {
          for (l = 0; l < 5; l++) {
            data_array[data_array.length - 1][l * 36 + j * 3 + k + 1] = day_stats[i][j][k][l];
          }
        }
      }
    }
    weekday_data = global.google.visualization.arrayToDataTable(data_array);

    data_array = [];
    data_array.push([
      'Weekday',
      'Posts', 'Posts (o)', 'Posts (r)', 'Location', 'Location (o)', 'Location (r)', 'Photos', 'Photos (o)', 'Photos (r)', 'GIFs', 'GIFs (o)', 'GIFs (r)', 'Videos', 'Videos (o)', 'Videos (r)', 'Links', 'Links (o)', 'Links (r)', 'Comments', 'Comments (o)', 'Comments (r)', 'CpP', 'CpP (o)', 'CpP (r)', '+1\'s', '+1\'s (o)', '+1\'s (r)', 'PpP', 'PpP (o)', 'PpP (r)', 'Reshares', 'Reshares (o)', 'Reshares (r)', 'RpP', 'RpP (o)', 'RpP (r)',
      'Posts (p)', 'Posts (o/p)', 'Posts (r/p)', 'Location (p)', 'Location (o/p)', 'Location (r/p)', 'Photos (p)', 'Photos (o/p)', 'Photos (r/p)', 'GIFs (p)', 'GIFs (o/p)', 'GIFs (r/p)', 'Videos (p)', 'Videos (o/p)', 'Videos (r/p)', 'Links (p)', 'Links (o/p)', 'Links (r/p)', 'Comments (p)', 'Comments (o/p)', 'Comments (r/p)', 'CpP (p)', 'CpP (o/p)', 'CpP (r/p)', '+1\'s (p)', '+1\'s (o/p)', '+1\'s (r/p)', 'PpP (p)', 'PpP (o/p)', 'PpP (r/p)', 'Reshares (p)', 'Reshares (o/p)', 'Reshares (r/p)', 'RpP (p)', 'RpP (o/p)', 'RpP (r/p)',
      'Posts (e)', 'Posts (o/e)', 'Posts (r/e)', 'Location (e)', 'Location (o/e)', 'Location (r/e)', 'Photos (e)', 'Photos (o/e)', 'Photos (r/e)', 'GIFs (e)', 'GIFs (o/e)', 'GIFs (r/e)', 'Videos (e)', 'Videos (o/e)', 'Videos (r/e)', 'Links (e)', 'Links (o/e)', 'Links (r/e)', 'Comments (e)', 'Comments (o/e)', 'Comments (r/e)', 'CpP (e)', 'CpP (o/e)', 'CpP (r/e)', '+1\'s (e)', '+1\'s (o/e)', '+1\'s (r/e)', 'PpP (e)', 'PpP (o/e)', 'PpP (r/e)', 'Reshares (e)', 'Reshares (o/e)', 'Reshares (r/e)', 'RpP (e)', 'RpP (o/e)', 'RpP (r/e)',
      'Posts (c)', 'Posts (o/c)', 'Posts (r/c)', 'Location (c)', 'Location (o/c)', 'Location (r/c)', 'Photos (c)', 'Photos (o/c)', 'Photos (r/c)', 'GIFs (c)', 'GIFs (o/c)', 'GIFs (r/c)', 'Videos (c)', 'Videos (o/c)', 'Videos (r/c)', 'Links (c)', 'Links (o/c)', 'Links (r/c)', 'Comments (c)', 'Comments (o/c)', 'Comments (r/c)', 'CpP (c)', 'CpP (o/c)', 'CpP (r/c)', '+1\'s (c)', '+1\'s (o/c)', '+1\'s (r/c)', 'PpP (c)', 'PpP (o/c)', 'PpP (r/c)', 'Reshares (c)', 'Reshares (o/c)', 'Reshares (r/c)', 'RpP (c)', 'RpP (o/c)', 'RpP (r/c)',
      'Posts (l)', 'Posts (o/l)', 'Posts (r/l)', 'Location (l)', 'Location (o/l)', 'Location (r/l)', 'Photos (l)', 'Photos (o/l)', 'Photos (r/l)', 'GIFs (l)', 'GIFs (o/l)', 'GIFs (r/l)', 'Videos (l)', 'Videos (o/l)', 'Videos (r/l)', 'Links (l)', 'Links (o/l)', 'Links (r/l)', 'Comments (l)', 'Comments (o/l)', 'Comments (r/l)', 'CpP (l)', 'CpP (o/l)', 'CpP (r/l)', '+1\'s (l)', '+1\'s (o/l)', '+1\'s (r/l)', 'PpP (l)', 'PpP (o/l)', 'PpP (r/l)', 'Reshares (l)', 'Reshares (o/l)', 'Reshares (r/l)', 'RpP (l)', 'RpP (o/l)', 'RpP (r/l)'
    ]);
    for (i = 0; i < 7; i++) {
      switch (i) {
      case 0: day = "Mon"; break;
      case 1: day = "Tue"; break;
      case 2: day = "Wed"; break;
      case 3: day = "Thu"; break;
      case 4: day = "Fri"; break;
      case 5: day = "Sat"; break;
      case 6: day = "Sun"; break;
      }
      data_array.push([
        day,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]);
      for (j = 0; j < S_VARS; j++) {
        for (k = 0; k < 3; k++) {
          for (l = 0; l < 5; l++) {
            data_array[data_array.length - 1][l * 36 + j * 3 + k + 1] = day_stats[i][j][k][l];
          }
        }
      }
    }
    weekday_data = global.google.visualization.arrayToDataTable(data_array);

    data_array = [];
    data_array.push([
      'Weekday',
      'Posts', 'Posts (o)', 'Posts (r)', 'Location', 'Location (o)', 'Location (r)', 'Photos', 'Photos (o)', 'Photos (r)', 'GIFs', 'GIFs (o)', 'GIFs (r)', 'Videos', 'Videos (o)', 'Videos (r)', 'Links', 'Links (o)', 'Links (r)', 'Comments', 'Comments (o)', 'Comments (r)', 'CpP', 'CpP (o)', 'CpP (r)', '+1\'s', '+1\'s (o)', '+1\'s (r)', 'PpP', 'PpP (o)', 'PpP (r)', 'Reshares', 'Reshares (o)', 'Reshares (r)', 'RpP', 'RpP (o)', 'RpP (r)',
      'Posts (p)', 'Posts (o/p)', 'Posts (r/p)', 'Location (p)', 'Location (o/p)', 'Location (r/p)', 'Photos (p)', 'Photos (o/p)', 'Photos (r/p)', 'GIFs (p)', 'GIFs (o/p)', 'GIFs (r/p)', 'Videos (p)', 'Videos (o/p)', 'Videos (r/p)', 'Links (p)', 'Links (o/p)', 'Links (r/p)', 'Comments (p)', 'Comments (o/p)', 'Comments (r/p)', 'CpP (p)', 'CpP (o/p)', 'CpP (r/p)', '+1\'s (p)', '+1\'s (o/p)', '+1\'s (r/p)', 'PpP (p)', 'PpP (o/p)', 'PpP (r/p)', 'Reshares (p)', 'Reshares (o/p)', 'Reshares (r/p)', 'RpP (p)', 'RpP (o/p)', 'RpP (r/p)',
      'Posts (e)', 'Posts (o/e)', 'Posts (r/e)', 'Location (e)', 'Location (o/e)', 'Location (r/e)', 'Photos (e)', 'Photos (o/e)', 'Photos (r/e)', 'GIFs (e)', 'GIFs (o/e)', 'GIFs (r/e)', 'Videos (e)', 'Videos (o/e)', 'Videos (r/e)', 'Links (e)', 'Links (o/e)', 'Links (r/e)', 'Comments (e)', 'Comments (o/e)', 'Comments (r/e)', 'CpP (e)', 'CpP (o/e)', 'CpP (r/e)', '+1\'s (e)', '+1\'s (o/e)', '+1\'s (r/e)', 'PpP (e)', 'PpP (o/e)', 'PpP (r/e)', 'Reshares (e)', 'Reshares (o/e)', 'Reshares (r/e)', 'RpP (e)', 'RpP (o/e)', 'RpP (r/e)',
      'Posts (c)', 'Posts (o/c)', 'Posts (r/c)', 'Location (c)', 'Location (o/c)', 'Location (r/c)', 'Photos (c)', 'Photos (o/c)', 'Photos (r/c)', 'GIFs (c)', 'GIFs (o/c)', 'GIFs (r/c)', 'Videos (c)', 'Videos (o/c)', 'Videos (r/c)', 'Links (c)', 'Links (o/c)', 'Links (r/c)', 'Comments (c)', 'Comments (o/c)', 'Comments (r/c)', 'CpP (c)', 'CpP (o/c)', 'CpP (r/c)', '+1\'s (c)', '+1\'s (o/c)', '+1\'s (r/c)', 'PpP (c)', 'PpP (o/c)', 'PpP (r/c)', 'Reshares (c)', 'Reshares (o/c)', 'Reshares (r/c)', 'RpP (c)', 'RpP (o/c)', 'RpP (r/c)',
      'Posts (l)', 'Posts (o/l)', 'Posts (r/l)', 'Location (l)', 'Location (o/l)', 'Location (r/l)', 'Photos (l)', 'Photos (o/l)', 'Photos (r/l)', 'GIFs (l)', 'GIFs (o/l)', 'GIFs (r/l)', 'Videos (l)', 'Videos (o/l)', 'Videos (r/l)', 'Links (l)', 'Links (o/l)', 'Links (r/l)', 'Comments (l)', 'Comments (o/l)', 'Comments (r/l)', 'CpP (l)', 'CpP (o/l)', 'CpP (r/l)', '+1\'s (l)', '+1\'s (o/l)', '+1\'s (r/l)', 'PpP (l)', 'PpP (o/l)', 'PpP (r/l)', 'Reshares (l)', 'Reshares (o/l)', 'Reshares (r/l)', 'RpP (l)', 'RpP (o/l)', 'RpP (r/l)'
    ]);
    if (min_date) {
      tmp_date = new Date();
      tmp_date.setTime(min_date.getTime());
      while (tmp_date.getTime() < max_date.getTime() + 86400000) {
        i = tmp_date.nice_short_date();
        data_array.push([
          i,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ]);
        if (daily_stats[i]) {
          for (j = 0; j < S_VARS; j++) {
            for (k = 0; k < 3; k++) {
              for (l = 0; l < 5; l++) {
                data_array[data_array.length - 1][l * 36 + j * 3 + k + 1] = daily_stats[i][j][k][l];
              }
            }
          }
        }
        tmp_date.setTime(tmp_date.getTime() + 86400000);
      }
    } else {
      tmp_date = new Date();
      i = tmp_date.nice_short_date();
      data_array.push([
        i,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]);
    }
    day_data = global.google.visualization.arrayToDataTable(data_array);

    day_view = new global.google.visualization.DataView(day_data);
    day_view.setColumns([0, 1, 2, 3]);
    day_chart = new global.google.visualization.AreaChart($("#day_chart")[0]);

    weekday_view = new global.google.visualization.DataView(weekday_data);
    weekday_view.setColumns([0, 1, 2, 3]);
    weekday_chart = new global.google.visualization.ColumnChart($("#weekday_chart")[0]);

    hour_view = new global.google.visualization.DataView(hour_data);
    hour_view.setColumns([0, 1, 2, 3]);
    hour_chart = new global.google.visualization.ColumnChart($("#hour_chart")[0]);

    update_charts();
  }

  function prepare_map() {
    var latlng, myOptions;
    latlng = new global.google.maps.LatLng(0, 0);
    myOptions = {
      zoom: 0,
      center: latlng,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeId: global.google.maps.MapTypeId.ROADMAP
    };
    map = new global.google.maps.Map(global.document.getElementById("map_canvas"), myOptions);
    llbounds = new global.google.maps.LatLngBounds();
    chk_locations = false;
  }

  function draw_map() {
    var latlng, myOptions, wp, maps_marker, i, coords;
    for (i = 0; i < activities.length; i++) {
      if (activities[i].object.actor == undefined) {
        if (activities[i].geocode != undefined) {
          if (activities[i].chk_active) {
            if (activities[i].chk_mapped) {
              activities[i].marker.setMap(map);
            } else {
              chk_locations = true;
              coords = activities[i].geocode.split(" ");
              wp = new global.google.maps.LatLng(coords[0], coords[1]);
              maps_marker = new global.google.maps.Marker({position: wp, map: map});
              llbounds.extend(wp);
              activities[i].marker = maps_marker;
              activities[i].chk_mapped = true;
            }
          } else {
            if (activities[i].chk_mapped) {
              activities[i].marker.setMap(null);
            }
          }
        }
      }
    }
    if (chk_locations) {
      map.fitBounds(llbounds);
    }
  }

  function update_posts() {
    var a, chk_show, item;
    for (a = 0; a < activities.length; a++) {
      item = activities[a];
      if (item.chk_posts_printed) {
        chk_show = true;
        if (!item.chk_active) { chk_show = false; }
        if (!$("#posts_public").is(":checked") && item.int_audience == SA_PUBLIC) { chk_show = false; }
        if (!$("#posts_extended").is(":checked") && item.int_audience == SA_EXTENDED) { chk_show = false; }
        if (!$("#posts_circles").is(":checked") && item.int_audience == SA_CIRCLES) { chk_show = false; }
        if (!$("#posts_limited").is(":checked") && item.int_audience == SA_LIMITED) { chk_show = false; }
        if (!$("#posts_original").is(":checked") && item.chk_original) { chk_show = false; }
        if (!$("#posts_reshared").is(":checked") && item.chk_reshared) { chk_show = false; }
        if (!$("#posts_location").is(":checked") && item.chk_location) { chk_show = false; }
        if (!$("#posts_location_wo").is(":checked") && !item.chk_location) { chk_show = false; }
        if (!$("#posts_photos").is(":checked") && item.chk_photos) { chk_show = false; }
        if (!$("#posts_photos_wo").is(":checked") && !item.chk_photos) { chk_show = false; }
        if (!$("#posts_gifs").is(":checked") && item.chk_gifs) { chk_show = false; }
        if (!$("#posts_gifs_wo").is(":checked") && !item.chk_gifs) { chk_show = false; }
        if (!$("#posts_videos").is(":checked") && item.chk_videos) { chk_show = false; }
        if (!$("#posts_videos_wo").is(":checked") && !item.chk_videos) { chk_show = false; }
        if (!$("#posts_links").is(":checked") && item.chk_links) { chk_show = false; }
        if (!$("#posts_links_wo").is(":checked") && !item.chk_links) { chk_show = false; }
        if (!$("#posts_comments").is(":checked") && item.chk_comments) { chk_show = false; }
        if (!$("#posts_comments_wo").is(":checked") && !item.chk_comments) { chk_show = false; }
        if (!$("#posts_plusones").is(":checked") && item.chk_plusones) { chk_show = false; }
        if (!$("#posts_plusones_wo").is(":checked") && !item.chk_plusones) { chk_show = false; }
        if (!$("#posts_reshares").is(":checked") && item.chk_reshares) { chk_show = false; }
        if (!$("#posts_reshares_wo").is(":checked") && !item.chk_reshares) { chk_show = false; }

        if (chk_show) {
          $("#" + item.id).show();
        } else {
          $("#" + item.id).hide();
        }
      }
    }
  }


  function format_photo(att, id) {
    var str_contents, att_link, att_preview, att_title;
    str_contents = "";
    if (att.objectType == "photo") {
      att_link = "";
      att_preview = "";
      att_title = "";
      if (att.url) {
        att_link = att.url;
      }
      if (att.image) {
        att_preview = att.image.url;
      }
      if (att.displayName) {
        att_title = att.displayName;
      }
      if (att_link == "") {
        if (att.fullImage) {
          att_link = att.fullImage.url;
        }
      }
      if (att_link.search("plus.google.com/photos") >= 0) {
        if (att_title == "" && att_preview == "") {
          att_title = att_link;
        }
        if (att_preview != "") {
          str_contents += " <a href=\"" + att_link + "\" class=\"photo_" + id + "\">";
          str_contents += "<img src=\"" + att_preview + "\" alt=\"" + ((att_title != "") ? att_title : "preview") + "\">";
          str_contents += "</a>";
        }
      }
    }
    return str_contents;
  }

  function post_length(item) {
    if (item.object.content === "") {
      return 0;
    } else {
      return item.object.content.length;
    }
  }

  function format_post(item) {
    var str_contents, a, chk_pic, att, att_link, att_preview, att_title, chk_reshare, author_url, author_name;
    str_contents = "";

    if (keyword && !author) {
      author_name = item.actor.displayName;
      author_url = item.actor.url;
      str_contents += "<a href=\"" + author_url + "\"><b>" + author_name + "</b></a><br>";
    }

    if (item.object.actor != undefined) {
      chk_reshare = true;
      if (item.annotation != undefined && item.annotation != "") {
        str_contents += item.annotation + "<hr>";
      }
      if (item.object.actor.displayName) {
        str_contents += " <p class=\"smalll\">Reshared <a href=\"" + item.object.url + "\">post</a> by <a href=\"" + item.object.actor.url + "\">" + item.object.actor.displayName + "</a></p>";
      }
    }
    str_contents += item.object.content + "<br>";
    chk_pic = false;

    if (item.object.attachments != undefined) {
      for (a = 0; a < item.object.attachments.length; a++) {
        att = item.object.attachments[a];
        att_link = "";
        att_preview = "";
        att_title = "";
        if (att.url != undefined) {
          att_link = att.url;
        }
        if (att.image != undefined) {
          att_preview = att.image.url;
        }
        if (att.displayName != undefined) {
          att_title = att.displayName;
        }
        if (att_link == "") {
          if (att.fullImage != undefined) {
            att_link = att.fullImage.url;
          }
        }
        if (att_title == "" && att_preview == "") {
          att_title = att_link;
        }
        if (att_link != "") {
          if (!(att_preview != "" && chk_pic == true)) {
            str_contents += " <br><br>";
          }
          str_contents += " <a href=\"" + att_link + "\">";
          if (att_preview != "") {
            chk_pic = true;
            str_contents += "<img src=\"" + att_preview + "\" alt=\"" + ((att_title != "") ? att_title : "preview") + "\">";
          } else {
            str_contents += att_title;
          }
          str_contents += "</a>";
        }
      }
    }

    return str_contents;
  }

  function print_photos(i) {
    var a, item;

    item = activities[i];
    if (!item.object.actor) {
      if (item.object.attachments) {
        for (a = 0; a < item.object.attachments.length; a++) {
          $("#d_photos").append(format_photo(item.object.attachments[a], item.id));
        }
      }
    }
  }

  function print_table_post(i) {
    var item, str_row, post_time, audience;

    item = activities[i];
    post_time = new Date(item.published);

    str_row = "<tr id=\"" + item.id + "\">";
    str_row += "<td sorttable_customkey=\"" + post_time.yyyymmddhhmmss() + "\" style=\"white-space: nowrap;\"><a href=\"" + item.url + "\">" + post_time.nice_date() + "<\/a><\/td>";
    audience = "";
    switch (item.int_audience) {
    case SA_PUBLIC: audience = "P"; break;
    case SA_LIMITED: audience = "L"; break;
    case SA_EXTENDED: audience = "E"; break;
    case SA_CIRCLES: audience = "C"; break;
    }
    str_row += "<td>" + audience + "<\/td>";
    if (item.object.replies != undefined) {
      str_row += "<td>" + item.object.replies.totalItems + "<\/td>";
    } else {
      str_row += "<td>0<\/td>";
    }
    if (item.object.resharers != undefined) {
      str_row += "<td>" + item.object.resharers.totalItems + "<\/td>";
    } else {
      str_row += "<td>0<\/td>";
    }
    if (item.int_plusones != undefined) {
      str_row += "<td>" + item.int_plusones + "<\/td>";
    } else {
      str_row += "<td>0<\/td>";
    }
    str_row += "<td>" + post_length(item) + "<\/td>";
    str_row += "<td>" + format_post(item) + "<\/td>";
    str_row += "</tr>";

    $("#posts_table tbody").prepend(str_row);
  }

  function html_entities(value) {
    if (value) {
      return $("<div />").text(value).html();
    } else {
      return "";
    }
  }

  function print_data_row(i) {
    var item, str_row, post_time, day, audience;

    item = activities[i];
    post_time = new Date(item.published);
    item.str_date = post_time.nice_date();

    str_row = "<tr id=\"raw_" + item.id + "\">";
    str_row += "<td>" + item.str_date + "<\/td>";
    str_row += "<td>" + item.str_day + "<\/td>";
    day = "";
    switch (item.int_weekday) {
    case 0: day = "Mon"; break;
    case 1: day = "Tue"; break;
    case 2: day = "Wed"; break;
    case 3: day = "Thu"; break;
    case 4: day = "Fri"; break;
    case 5: day = "Sat"; break;
    case 6: day = "Sun"; break;
    }
    str_row += "<td>" + day + "<\/td>";
    str_row += "<td>" + item.int_hour + "<\/td>";

    audience = "";
    switch (item.int_audience) {
    case SA_PUBLIC: audience = "Public"; break;
    case SA_LIMITED: audience = "Limited"; break;
    case SA_EXTENDED: audience = "Extended Circles"; break;
    case SA_CIRCLES: audience = "Circles"; break;
    }
    str_row += "<td>" + audience + "<\/td>";
    str_row += "<td>" + (item.chk_original ? 1 : 0) + "<\/td>";
    str_row += "<td>" + (item.chk_reshared ? 1 : 0) + "<\/td>";
    str_row += "<td>" + (item.chk_location ? 1 : 0) + "<\/td>";
    str_row += "<td>" + item.int_photos + "<\/td>";
    str_row += "<td>" + item.int_gifs + "<\/td>";
    str_row += "<td>" + item.int_videos + "<\/td>";
    str_row += "<td>" + item.int_links + "<\/td>";
    str_row += "<td>" + item.int_comments + "<\/td>";
    str_row += "<td>" + item.int_reshares + "<\/td>";
    str_row += "<td>" + item.int_plusones + "<\/td>";
    str_row += "<td>" + item.url + "<\/td>";
    str_row += "<td>" + item.actor.displayName + "<\/td>";
    str_row += "<td>" + item.actor.id + "<\/td>";
    str_row += "<td>" + item.org_author_name + "<\/td>";
    str_row += "<td>" + item.org_author_id + "<\/td>";
    str_row += "<td>" + html_entities(strip_html(item.annotation || "")) + "<\/td>";
    str_row += "<td>" + html_entities(strip_html(item.object.content || "")) + "<\/td>";
    str_row += "</tr>";

    $("#data_table tbody").append(str_row);
  }

  function print_post(i) {
    var item, str_contents, post_time, update_time;

    item = activities[i];
    post_time = new Date(item.published);
    update_time = new Date(item.updated);

    str_contents = "<p class=\"smallr\"><a href=\"" + item.url + "\">" + post_time.nice_date() + "</a>";

    if (post_time.nice_date() != update_time.nice_date()) {
      str_contents += " (updated " + update_time.nice_date() + ")";
    }
    str_contents += "</p>";

    str_contents += format_post(item);

    return str_contents;
  }

  function make_csv_compliant(text) {
    return text.replace(/(\r\n|\n|\r)/gm, " ").replace(/\"/gm, '""');
  }

  function export_table() {
    var doc, i, str_line, item, day, audience, filename;
    doc = "";
    doc += "Date,Day,Weekday,Hour,Audience,Org,Reshare,Location,Photos,GIFs,Videos,Links,Comments,Reshares,+1,Link,Poster, Poster ID, Org Poster,Org Poster ID,Annotation,Post\r\n";
    for (i = 0; i < activities.length; i++) {
      item = activities[i];
      if (item.chk_active) {
        str_line = "";
        str_line += item.str_date;
        str_line += "," + item.str_day;
        day = "";
        switch (item.int_weekday) {
        case 0: day = "Mon"; break;
        case 1: day = "Tue"; break;
        case 2: day = "Wed"; break;
        case 3: day = "Thu"; break;
        case 4: day = "Fri"; break;
        case 5: day = "Sat"; break;
        case 6: day = "Sun"; break;
        }
        str_line += "," + day;
        str_line += "," + item.int_hour;
        audience = "";
        switch (item.int_audience) {
        case SA_PUBLIC: audience = "Public"; break;
        case SA_LIMITED: audience = "Limited"; break;
        case SA_EXTENDED: audience = "Extended Circles"; break;
        case SA_CIRCLES: audience = "Circles"; break;
        }
        str_line += ",\"" + make_csv_compliant(audience) + "\"";
        str_line += "," + (item.chk_original ? 1 : 0);
        str_line += "," + (item.chk_reshared ? 1 : 0);
        str_line += "," + (item.chk_location ? 1 : 0);
        str_line += "," + item.int_photos;
        str_line += "," + item.int_gifs;
        str_line += "," + item.int_videos;
        str_line += "," + item.int_links;
        str_line += "," + item.int_comments;
        str_line += "," + item.int_reshares;
        str_line += "," + item.int_plusones;
        str_line += "," + item.url;
        str_line += ",\"" + make_csv_compliant(item.actor.displayName) + "\"";
        str_line += "," + item.actor.id;
        if (item.org_author_name) {
          str_line += ",\"" + make_csv_compliant(item.org_author_name) + "\"";
        } else {
          str_line += ",";
        }
        str_line += "," + item.org_author_id;
        str_line += ",\"" + make_csv_compliant(html_entities(strip_html(item.annotation || ""))) + "\"";
        str_line += ",\"" + make_csv_compliant(html_entities(strip_html(item.object.content || ""))) + "\"";
        doc += str_line + "\r\n";
      }
    }
    if (author && author.id) {
      filename = "allmyplus_data_" + author.id + ".csv";
    } else {
      filename = "allmyplus_data.csv";
    }
    $("#data_download").html("<a download=\"" + filename + "\" href=\"data:text/csv;charset=utf-8," + global.window.escape(doc) + "\">Download as CSV</a>");
  }

  function check_reshared() {
    var i, item, p = -1, actor_id, actor_url, actor_pic, actor_name;
    for (i = 0; i < activities.length; i++) {
      item = activities[i];
      if (item.chk_active) {
        if (item.object.actor) {
          actor_id = item.object.actor.id;
          p = find_person(actor_id);
          if (p < 0) {
            actor_name = item.object.actor.displayName;
            actor_url = item.object.actor.url;
            actor_pic = "";
            if (item.object.actor.image && item.object.actor.image.url) {
              actor_pic = item.object.actor.image.url;
            }
            if (actor_pic == "") {
              actor_pic = base_url + "images/noimage.png";
            }
            if (actor_name && actor_url) {
              people.push({id: actor_id, name: actor_name, url: actor_url, pic: actor_pic, count: [0, 0, 0, 0], chk_displayed: [0, 0, 0, 0]});
              p = people.length - 1;
            }
          }
          if (p >= 0) {
            people[p].count[P_RESHARED]++;
          }
        }
        if (keyword && !author) {
          actor_id = item.actor.id;
          p = find_person(actor_id);
          if (p < 0) {
            actor_name = item.actor.displayName;
            actor_url = item.actor.url;
            actor_pic = "";
            if (item.actor.image && item.actor.image.url) {
              actor_pic = item.actor.image.url;
            }
            if (actor_pic == "") {
              actor_pic = base_url + "images/noimage.png";
            }
            if (actor_name && actor_url) {
              people.push({id: actor_id, name: actor_name, url: actor_url, pic: actor_pic, count: [0, 0, 0, 0], chk_displayed: [0, 0, 0, 0]});
              p = people.length - 1;
            }
          }
          if (p >= 0) {
            people[p].count[P_PLUSONES]++;
          }
        }
      }
    }
    display_people("#reshared", P_RESHARED);
    if (keyword && !author) {
      display_people("#plusoners", P_PLUSONES);
    }
  }

  function check_commenters() {
    var i, j, l, item, person, p, actor_id, actor_url, actor_pic, actor_name;
    for (i = 0; i < activities.length; i++) {
      item = activities[i];
      if (item.chk_active) {
        if (item.object.replies) {
          if (item.object.replies.items) {
            l = item.object.replies.items.length;
            for (j = 0; j < l; j++) {
              person = item.object.replies.items[j].actor;
              actor_id = person.id;
              p = find_person(actor_id);
              if (p < 0) {
                actor_name = person.displayName;
                actor_url = person.url;
                actor_pic = "";
                if (person.image && person.image.url) {
                  actor_pic = person.image.url;
                }
                if (actor_pic == "") {
                  actor_pic = base_url + "images/noimage.png";
                }
                people.push({id: actor_id, name: actor_name, url: actor_url, pic: actor_pic, count: [0, 0, 0, 0], chk_displayed: [0, 0, 0, 0]});
                p = people.length - 1;
              }
              people[p].count[P_COMMENTS]++;
            }
          }
        }
      }
    }
    display_people("#commenters", P_COMMENTS);
  }

  function check_resharers() {
    var i, j, l, item, person, p, actor_id, actor_url, actor_pic, actor_name;
    for (i = 0; i < activities.length; i++) {
      item = activities[i];
      if (item.chk_active) {
        if (item.object.resharers) {
          if (item.object.resharers.items) {
            l = item.object.resharers.items.length;
            for (j = 0; j < l; j++) {
              person = item.object.resharers.items[j];
              actor_id = person.id;
              p = find_person(actor_id);
              if (p < 0) {
                actor_name = person.displayName;
                actor_url = person.url;
                actor_pic = "";
                if (person.image && person.image.url) {
                  actor_pic = person.image.url;
                }
                if (actor_pic == "") {
                  actor_pic = base_url + "images/noimage.png";
                }
                people.push({id: actor_id, name: actor_name, url: actor_url, pic: actor_pic, count: [0, 0, 0, 0], chk_displayed: [0, 0, 0, 0]});
                p = people.length - 1;
              }
              people[p].count[P_RESHARES]++;
            }
          }
        }
      }
    }
    display_people("#resharers", P_RESHARES);
  }

  function check_plusoners() {
    var i, j, l, item, person, p, actor_id, actor_url, actor_pic, actor_name;
    for (i = 0; i < activities.length; i++) {
      item = activities[i];
      if (item.chk_active) {
        if (item.object.plusoners) {
          if (item.object.plusoners.items) {
            l = item.object.plusoners.items.length;
            for (j = 0; j < l; j++) {
              person = item.object.plusoners.items[j];
              actor_id = person.id;
              p = find_person(actor_id);
              if (p < 0) {
                actor_name = person.displayName;
                actor_url = person.url;
                actor_pic = "";
                if (person.image && person.image.url) {
                  actor_pic = person.image.url;
                }
                if (actor_pic == "") {
                  actor_pic = base_url + "images/noimage.png";
                }
                people.push({id: actor_id, name: actor_name, url: actor_url, pic: actor_pic, count: [0, 0, 0, 0], chk_displayed: [0, 0, 0, 0]});
                p = people.length - 1;
              }
              people[p].count[P_PLUSONES]++;
            }
          }
        }
      }
    }
    display_people("#plusoners", P_PLUSONES);
  }

  function reset_people() {
    var p, l;
    l = people.length;
    for (p = 0; p < l; p++) {
      people[p].count[P_COMMENTS] = 0;
      people[p].count[P_RESHARES] = 0;
      people[p].count[P_PLUSONES] = 0;
      people[p].count[P_RESHARED] = 0;
    }
  }

  function check_people() {
    reset_people();
    check_reshared();
    check_plusoners();
    check_resharers();
    check_commenters();
  }

  function display_stats() {
    var a, suffix;
    for (a = 0; a < 5; a++) {
      switch (a) {
      case SA_TOTAL: suffix = "#t"; break;
      case SA_PUBLIC: suffix = "#tp"; break;
      case SA_EXTENDED: suffix = "#te"; break;
      case SA_CIRCLES: suffix = "#tc"; break;
      case SA_LIMITED: suffix = "#tl"; break;
      }
      $(suffix + "_posts").html(total_stats[S_POSTS][ST_TOTAL][a]);
      $(suffix + "_posts_o").html(total_stats[S_POSTS][ST_ORIGINAL][a]);
      $(suffix + "_posts_r").html(total_stats[S_POSTS][ST_RESHARED][a]);
      $(suffix + "_loc").html(total_stats[S_LOC][ST_TOTAL][a]);
      $(suffix + "_loc_o").html(total_stats[S_LOC][ST_ORIGINAL][a]);
      $(suffix + "_loc_r").html(total_stats[S_LOC][ST_RESHARED][a]);
      $(suffix + "_photos").html(total_stats[S_PHOTOS][ST_TOTAL][a]);
      $(suffix + "_photos_o").html(total_stats[S_PHOTOS][ST_ORIGINAL][a]);
      $(suffix + "_photos_r").html(total_stats[S_PHOTOS][ST_RESHARED][a]);
      $(suffix + "_gifs").html(total_stats[S_GIFS][ST_TOTAL][a]);
      $(suffix + "_gifs_o").html(total_stats[S_GIFS][ST_ORIGINAL][a]);
      $(suffix + "_gifs_r").html(total_stats[S_GIFS][ST_RESHARED][a]);
      $(suffix + "_videos").html(total_stats[S_VIDEOS][ST_TOTAL][a]);
      $(suffix + "_videos_o").html(total_stats[S_VIDEOS][ST_ORIGINAL][a]);
      $(suffix + "_videos_r").html(total_stats[S_VIDEOS][ST_RESHARED][a]);
      $(suffix + "_links").html(total_stats[S_LINKS][ST_TOTAL][a]);
      $(suffix + "_links_o").html(total_stats[S_LINKS][ST_ORIGINAL][a]);
      $(suffix + "_links_r").html(total_stats[S_LINKS][ST_RESHARED][a]);
      $(suffix + "_comments").html(total_stats[S_COMMENTS][ST_TOTAL][a]);
      $(suffix + "_comments_o").html(total_stats[S_COMMENTS][ST_ORIGINAL][a]);
      $(suffix + "_comments_r").html(total_stats[S_COMMENTS][ST_RESHARED][a]);
      $(suffix + "_cpp").html(total_stats[S_CPP][ST_TOTAL][a].toFixed(2));
      $(suffix + "_cpp_o").html(total_stats[S_CPP][ST_ORIGINAL][a].toFixed(2));
      $(suffix + "_cpp_r").html(total_stats[S_CPP][ST_RESHARED][a].toFixed(2));
      $(suffix + "_plusones").html(total_stats[S_PLUSONES][ST_TOTAL][a]);
      $(suffix + "_plusones_o").html(total_stats[S_PLUSONES][ST_ORIGINAL][a]);
      $(suffix + "_plusones_r").html(total_stats[S_PLUSONES][ST_RESHARED][a]);
      $(suffix + "_ppp").html(total_stats[S_PPP][ST_TOTAL][a].toFixed(2));
      $(suffix + "_ppp_o").html(total_stats[S_PPP][ST_ORIGINAL][a].toFixed(2));
      $(suffix + "_ppp_r").html(total_stats[S_PPP][ST_RESHARED][a].toFixed(2));
      $(suffix + "_reshares").html(total_stats[S_RESHARES][ST_TOTAL][a]);
      $(suffix + "_reshares_o").html(total_stats[S_RESHARES][ST_ORIGINAL][a]);
      $(suffix + "_reshares_r").html(total_stats[S_RESHARES][ST_RESHARED][a]);
      $(suffix + "_rpp").html(total_stats[S_RPP][ST_TOTAL][a].toFixed(2));
      $(suffix + "_rpp_o").html(total_stats[S_RPP][ST_ORIGINAL][a].toFixed(2));
      $(suffix + "_rpp_r").html(total_stats[S_RPP][ST_RESHARED][a].toFixed(2));
    }
  }

  function recalc_stats() {
    var a, i, j;
    for (i = 0; i < 3; i++) {
      for (a = 0; a < 5; a++) {
        if (total_stats[S_POSTS][i][a] > 0) {
          total_stats[S_CPP][i][a] = total_stats[S_COMMENTS][i][a] / total_stats[S_POSTS][i][a];
          total_stats[S_RPP][i][a] = total_stats[S_RESHARES][i][a] / total_stats[S_POSTS][i][a];
          total_stats[S_PPP][i][a] = total_stats[S_PLUSONES][i][a] / total_stats[S_POSTS][i][a];
        }
        for (j = 0; j < 24; j++) {
          if (hour_stats[j][S_POSTS][i][a] > 0) {
            hour_stats[j][S_CPP][i][a] = hour_stats[j][S_COMMENTS][i][a] / hour_stats[j][S_POSTS][i][a];
            hour_stats[j][S_RPP][i][a] = hour_stats[j][S_RESHARES][i][a] / hour_stats[j][S_POSTS][i][a];
            hour_stats[j][S_PPP][i][a] = hour_stats[j][S_PLUSONES][i][a] / hour_stats[j][S_POSTS][i][a];
          }
        }
        for (j = 0; j < 7; j++) {
          if (day_stats[j][S_POSTS][i][a] > 0) {
            day_stats[j][S_CPP][i][a] = day_stats[j][S_COMMENTS][i][a] / day_stats[j][S_POSTS][i][a];
            day_stats[j][S_RPP][i][a] = day_stats[j][S_RESHARES][i][a] / day_stats[j][S_POSTS][i][a];
            day_stats[j][S_PPP][i][a] = day_stats[j][S_PLUSONES][i][a] / day_stats[j][S_POSTS][i][a];
          }
        }
        for (j in daily_stats) {
          if (daily_stats.hasOwnProperty(j)) {
            if (daily_stats[j][S_POSTS][i][a] > 0) {
              daily_stats[j][S_CPP][i][a] = daily_stats[j][S_COMMENTS][i][a] / daily_stats[j][S_POSTS][i][a];
              daily_stats[j][S_RPP][i][a] = daily_stats[j][S_RESHARES][i][a] / daily_stats[j][S_POSTS][i][a];
              daily_stats[j][S_PPP][i][a] = daily_stats[j][S_PLUSONES][i][a] / daily_stats[j][S_POSTS][i][a];
            }
          }
        }
      }
    }
  }

  function update_author() {
    $("#user_pic").attr("href", author.url);
    if (author.image) {
      $("#user_pic img").attr("src", (author.image.url || base_url + "images/noimage.png").replace("?sz=50", "?sz=150"));
    } else {
      $("#user_pic img").attr("src", base_url + "images/noimage.png");
    }
    $("#user_pic img").attr("alt", author.displayName);
    $("#user_pic img").attr("title", author.displayName);
    $("#user_name").attr("href", author.url);
    $("#user_name").html(author.displayName);
    $("#user_data").show();
    $("#title").html("All my + Statistics for " + author.displayName);

    $("#login_version").remove();
    $("#api_version").remove();
    $("#search_version").remove();
    $("#instructions").remove();
    $(".or").remove();
    if (chk_api_data) {
      $("#takeout_version").remove();
    } else {
      $("#load_more").remove();
      $("#takeout_version .instructions").remove();
      $("#drop_zone").html("Drop more files here");
    }
  }

  function update_keyword() {
    var url = "https://plus.google.com/s/" + encodeURIComponent(keyword) + "/posts";
    $("#user_pic").attr("href", url);
    $("#user_pic img").attr("src", base_url + "images/search.png");
    $("#user_pic img").attr("alt", "Google+ Search");
    $("#user_pic img").attr("title", "Google+ Search");
    $("#user_name").attr("href", url);
    $("#user_name").html(keyword);
    $("#user_data").show();
    $("#title").html("All my + Statistics for " + keyword);

    $("#login_version").remove();
    $("#api_version").remove();
    $("#search_version").remove();
    $("#instructions").remove();
    $(".or").remove();
    $("#takeout_version").remove();
  }

  function load_activities(id, token, retry, max, cb) {
    var feed_url;
    feed_url = "https://www.googleapis.com/plus/v1/people/" + id + "/activities/public?callback=?&alt=json&maxResults=100&key=" + api_key;
    if (token != "") {
      feed_url += "&pageToken=" + token;
    }
    $.jsonp({
      "url": feed_url,
      "success": function (data) {
        var i, l, chk_new, i1, l1, next_token = "";
        if (data.items) {
          l = data.items.length;
          for (i = 0; i < l; i++) {
            chk_new = true;
            l1 = activities.length;
            for (i1 = 0; i1 < l1; i1++) {
              if (activities[i1].id === data.items[i].id) {
                chk_new = false;
                break;
              }
            }
            if (chk_new) {
              activities.push(data.items[i]);
            }
          }
        }
        update_activities();
        if (data.nextPageToken) {
          next_token = data.nextPageToken;
        }
        if (next_token === "" || (max > 0 && activities.length >= max)) {
          cb(next_token);
        } else {
          global.setTimeout(function () { load_activities(id, next_token, 0, max, cb); }, 100);
        }
      },
      "error": function (d, msg) {
        if (retry < 5) {
          global.setTimeout(function () { load_activities(id, token, retry + 1, max, cb); }, 200 * (retry + 1));
        } else {
          cb();
        }
      }
    });
  }

  function update_stats(i) {
    var a, j, chk_r, int_type, int_audience, post_time, post_hour, post_day, post_date, att, att_link, item;
    item = activities[i];

    post_time = new Date(item.published);
    post_hour = post_time.getHours();
    post_day = post_time.getDay();
    post_day = (post_day === 0) ? 6 : post_day - 1;
    post_date = post_time.nice_short_date();
    item.int_hour = post_hour;
    item.int_weekday = post_day;
    item.str_day = post_date;
    if (min_date) {
      if (post_time.getTime() < min_date.getTime()) {
        min_date = new Date();
        min_date.setFullYear(post_time.getFullYear(), post_time.getMonth(), post_time.getDate());
      }
    } else {
      min_date = new Date();
      min_date.setFullYear(post_time.getFullYear(), post_time.getMonth(), post_time.getDate());
    }
    if (max_date) {
      if (post_time.getTime() > max_date.getTime()) {
        max_date = new Date();
        max_date.setFullYear(post_time.getFullYear(), post_time.getMonth(), post_time.getDate());
      }
    } else {
      max_date = new Date();
      max_date.setFullYear(post_time.getFullYear(), post_time.getMonth(), post_time.getDate());
    }
    if (!daily_stats[post_date]) {
      daily_stats[post_date] = [];
      for (j = 0; j < S_VARS; j++) {
        daily_stats[post_date][j] = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
      }
    }
    chk_r = (item.object.actor != undefined);
    item.org_author_name = "";
    item.org_author_id = "";

    if (chk_r) {
      item.chk_reshared = true;
      item.chk_original = false;
      item.org_author_name = item.object.actor.displayName || "";
      item.org_author_id = item.object.actor.id || "";
    } else {
      item.chk_reshared = false;
      item.chk_original = true;
    }
    int_type = chk_r ? ST_RESHARED : ST_ORIGINAL;
    int_audience = SA_LIMITED;
    for (j = 0; j < item.access.items.length; j++) {
      if (item.access.items[j].type == "public") {
        int_audience = SA_PUBLIC;
        break;
      }
      if (item.access.items[j].type == "myCircles") {
        int_audience = SA_CIRCLES;
        break;
      }
      if (item.access.items[j].type == "extendedCircles") {
        int_audience = SA_EXTENDED;
        break;
      }
    }
    item.int_audience = int_audience;
    total_stats[S_POSTS][ST_TOTAL][int_audience]++;
    total_stats[S_POSTS][int_type][int_audience]++;
    hour_stats[post_hour][S_POSTS][ST_TOTAL][int_audience]++;
    hour_stats[post_hour][S_POSTS][int_type][int_audience]++;
    day_stats[post_day][S_POSTS][ST_TOTAL][int_audience]++;
    day_stats[post_day][S_POSTS][int_type][int_audience]++;
    daily_stats[post_date][S_POSTS][ST_TOTAL][int_audience]++;
    daily_stats[post_date][S_POSTS][int_type][int_audience]++;
    total_stats[S_POSTS][ST_TOTAL][SA_TOTAL]++;
    total_stats[S_POSTS][int_type][SA_TOTAL]++;
    hour_stats[post_hour][S_POSTS][ST_TOTAL][SA_TOTAL]++;
    hour_stats[post_hour][S_POSTS][int_type][SA_TOTAL]++;
    day_stats[post_day][S_POSTS][ST_TOTAL][SA_TOTAL]++;
    day_stats[post_day][S_POSTS][int_type][SA_TOTAL]++;
    daily_stats[post_date][S_POSTS][ST_TOTAL][SA_TOTAL]++;
    daily_stats[post_date][S_POSTS][int_type][SA_TOTAL]++;

    item.chk_comments = false;
    item.int_comments = 0;
    if (item.object.replies != undefined) {
      if (item.object.replies.totalItems > max_comments) {
        max_comments = item.object.replies.totalItems;
        max_comments_post = i;
      }
      if (item.object.replies.totalItems > 0) {
        item.chk_comments = true;
      }
      item.int_comments = item.object.replies.totalItems;
      total_stats[S_COMMENTS][0][int_audience] += item.object.replies.totalItems;
      total_stats[S_COMMENTS][int_type][int_audience] += item.object.replies.totalItems;
      hour_stats[post_hour][S_COMMENTS][0][int_audience] += item.object.replies.totalItems;
      hour_stats[post_hour][S_COMMENTS][int_type][int_audience] += item.object.replies.totalItems;
      day_stats[post_day][S_COMMENTS][0][int_audience] += item.object.replies.totalItems;
      day_stats[post_day][S_COMMENTS][int_type][int_audience] += item.object.replies.totalItems;
      daily_stats[post_date][S_COMMENTS][0][int_audience] += item.object.replies.totalItems;
      daily_stats[post_date][S_COMMENTS][int_type][int_audience] += item.object.replies.totalItems;
      total_stats[S_COMMENTS][0][SA_TOTAL] += item.object.replies.totalItems;
      total_stats[S_COMMENTS][int_type][SA_TOTAL] += item.object.replies.totalItems;
      hour_stats[post_hour][S_COMMENTS][0][SA_TOTAL] += item.object.replies.totalItems;
      hour_stats[post_hour][S_COMMENTS][int_type][SA_TOTAL] += item.object.replies.totalItems;
      day_stats[post_day][S_COMMENTS][0][SA_TOTAL] += item.object.replies.totalItems;
      day_stats[post_day][S_COMMENTS][int_type][SA_TOTAL] += item.object.replies.totalItems;
      daily_stats[post_date][S_COMMENTS][0][SA_TOTAL] += item.object.replies.totalItems;
      daily_stats[post_date][S_COMMENTS][int_type][SA_TOTAL] += item.object.replies.totalItems;
    }

    item.chk_plusones = false;
    item.int_plusones = 0;
    if (item.object.plusoners != undefined) {
      item.int_plusones = item.object.plusoners.totalItems;
      if (item.object.plusoners.items) {
        if (item.object.plusoners.items.length > item.int_plusones) {
          item.int_plusones = item.object.plusoners.items.length;
        }
      }
    }
    if (item.int_plusones > 0) {
      if (item.int_plusones > max_plusones) {
        max_plusones = item.int_plusones;
        max_plusones_post = i;
      }
      item.chk_plusones = true;
      total_stats[S_PLUSONES][0][int_audience] += item.object.plusoners.totalItems;
      total_stats[S_PLUSONES][int_type][int_audience] += item.object.plusoners.totalItems;
      hour_stats[post_hour][S_PLUSONES][0][int_audience] += item.object.plusoners.totalItems;
      hour_stats[post_hour][S_PLUSONES][int_type][int_audience] += item.object.plusoners.totalItems;
      day_stats[post_day][S_PLUSONES][0][int_audience] += item.object.plusoners.totalItems;
      day_stats[post_day][S_PLUSONES][int_type][int_audience] += item.object.plusoners.totalItems;
      daily_stats[post_date][S_PLUSONES][0][int_audience] += item.object.plusoners.totalItems;
      daily_stats[post_date][S_PLUSONES][int_type][int_audience] += item.object.plusoners.totalItems;
      total_stats[S_PLUSONES][0][SA_TOTAL] += item.object.plusoners.totalItems;
      total_stats[S_PLUSONES][int_type][SA_TOTAL] += item.object.plusoners.totalItems;
      hour_stats[post_hour][S_PLUSONES][0][SA_TOTAL] += item.object.plusoners.totalItems;
      hour_stats[post_hour][S_PLUSONES][int_type][SA_TOTAL] += item.object.plusoners.totalItems;
      day_stats[post_day][S_PLUSONES][0][SA_TOTAL] += item.object.plusoners.totalItems;
      day_stats[post_day][S_PLUSONES][int_type][SA_TOTAL] += item.object.plusoners.totalItems;
      daily_stats[post_date][S_PLUSONES][0][SA_TOTAL] += item.object.plusoners.totalItems;
      daily_stats[post_date][S_PLUSONES][int_type][SA_TOTAL] += item.object.plusoners.totalItems;
    }

    item.chk_reshares = false;
    item.int_reshares = 0;
    if (item.object.resharers != undefined) {
      if (item.object.resharers.totalItems > max_reshares) {
        max_reshares = item.object.resharers.totalItems;
        max_reshares_post = i;
      }
      if (item.object.resharers.totalItems > 0) {
        item.chk_reshares = true;
      }
      item.int_reshares = item.object.resharers.totalItems;
      total_stats[S_RESHARES][0][int_audience] += item.object.resharers.totalItems;
      total_stats[S_RESHARES][int_type][int_audience] += item.object.resharers.totalItems;
      hour_stats[post_hour][S_RESHARES][0][int_audience] += item.object.resharers.totalItems;
      hour_stats[post_hour][S_RESHARES][int_type][int_audience] += item.object.resharers.totalItems;
      day_stats[post_day][S_RESHARES][0][int_audience] += item.object.resharers.totalItems;
      day_stats[post_day][S_RESHARES][int_type][int_audience] += item.object.resharers.totalItems;
      daily_stats[post_date][S_RESHARES][0][int_audience] += item.object.resharers.totalItems;
      daily_stats[post_date][S_RESHARES][int_type][int_audience] += item.object.resharers.totalItems;
      total_stats[S_RESHARES][0][SA_TOTAL] += item.object.resharers.totalItems;
      total_stats[S_RESHARES][int_type][SA_TOTAL] += item.object.resharers.totalItems;
      hour_stats[post_hour][S_RESHARES][0][SA_TOTAL] += item.object.resharers.totalItems;
      hour_stats[post_hour][S_RESHARES][int_type][SA_TOTAL] += item.object.resharers.totalItems;
      day_stats[post_day][S_RESHARES][0][SA_TOTAL] += item.object.resharers.totalItems;
      day_stats[post_day][S_RESHARES][int_type][SA_TOTAL] += item.object.resharers.totalItems;
      daily_stats[post_date][S_RESHARES][0][SA_TOTAL] += item.object.resharers.totalItems;
      daily_stats[post_date][S_RESHARES][int_type][SA_TOTAL] += item.object.resharers.totalItems;
    }

    item.chk_location = false;
    if (item.geocode != undefined) {
      item.chk_location = true;
      total_stats[S_LOC][ST_TOTAL][int_audience]++;
      total_stats[S_LOC][int_type][int_audience]++;
      hour_stats[post_hour][S_LOC][ST_TOTAL][int_audience]++;
      hour_stats[post_hour][S_LOC][int_type][int_audience]++;
      day_stats[post_day][S_LOC][ST_TOTAL][int_audience]++;
      day_stats[post_day][S_LOC][int_type][int_audience]++;
      daily_stats[post_date][S_LOC][ST_TOTAL][int_audience]++;
      daily_stats[post_date][S_LOC][int_type][int_audience]++;
      total_stats[S_LOC][ST_TOTAL][SA_TOTAL]++;
      total_stats[S_LOC][int_type][SA_TOTAL]++;
      hour_stats[post_hour][S_LOC][ST_TOTAL][SA_TOTAL]++;
      hour_stats[post_hour][S_LOC][int_type][SA_TOTAL]++;
      day_stats[post_day][S_LOC][ST_TOTAL][SA_TOTAL]++;
      day_stats[post_day][S_LOC][int_type][SA_TOTAL]++;
      daily_stats[post_date][S_LOC][ST_TOTAL][SA_TOTAL]++;
      daily_stats[post_date][S_LOC][int_type][SA_TOTAL]++;
    }
    item.chk_videos = false;
    item.chk_photos = false;
    item.chk_gifs = false;
    item.chk_links = false;
    item.int_videos = 0;
    item.int_photos = 0;
    item.int_gifs = 0;
    item.int_links = 0;
    if (item.object.attachments != undefined) {
      for (a = 0; a < item.object.attachments.length; a++) {
        att = item.object.attachments[a];
        if (att.objectType == "article") {
          item.chk_links = true;
          item.int_links++;
          total_stats[S_LINKS][ST_TOTAL][int_audience]++;
          total_stats[S_LINKS][int_type][int_audience]++;
          hour_stats[post_hour][S_LINKS][ST_TOTAL][int_audience]++;
          hour_stats[post_hour][S_LINKS][int_type][int_audience]++;
          day_stats[post_day][S_LINKS][ST_TOTAL][int_audience]++;
          day_stats[post_day][S_LINKS][int_type][int_audience]++;
          daily_stats[post_date][S_LINKS][ST_TOTAL][int_audience]++;
          daily_stats[post_date][S_LINKS][int_type][int_audience]++;

          total_stats[S_LINKS][ST_TOTAL][SA_TOTAL]++;
          total_stats[S_LINKS][int_type][SA_TOTAL]++;
          hour_stats[post_hour][S_LINKS][ST_TOTAL][SA_TOTAL]++;
          hour_stats[post_hour][S_LINKS][int_type][SA_TOTAL]++;
          day_stats[post_day][S_LINKS][ST_TOTAL][SA_TOTAL]++;
          day_stats[post_day][S_LINKS][int_type][SA_TOTAL]++;
          daily_stats[post_date][S_LINKS][ST_TOTAL][SA_TOTAL]++;
          daily_stats[post_date][S_LINKS][int_type][SA_TOTAL]++;
        }
        if (att.objectType == "photo") {
          att_link = "";
          if (att.url != undefined) {
            att_link = att.url;
          }
          if (att_link == "") {
            if (att.fullImage != undefined) {
              att_link = att.fullImage.url;
            }
          }
          if (att_link.search("plus.google.com/photos") >= 0) {
            item.chk_photos = true;
            item.int_photos++;
            total_stats[S_PHOTOS][ST_TOTAL][int_audience]++;
            total_stats[S_PHOTOS][int_type][int_audience]++;
            hour_stats[post_hour][S_PHOTOS][ST_TOTAL][int_audience]++;
            hour_stats[post_hour][S_PHOTOS][int_type][int_audience]++;
            day_stats[post_day][S_PHOTOS][ST_TOTAL][int_audience]++;
            day_stats[post_day][S_PHOTOS][int_type][int_audience]++;
            daily_stats[post_date][S_PHOTOS][ST_TOTAL][int_audience]++;
            daily_stats[post_date][S_PHOTOS][int_type][int_audience]++;

            total_stats[S_PHOTOS][ST_TOTAL][SA_TOTAL]++;
            total_stats[S_PHOTOS][int_type][SA_TOTAL]++;
            hour_stats[post_hour][S_PHOTOS][ST_TOTAL][SA_TOTAL]++;
            hour_stats[post_hour][S_PHOTOS][int_type][SA_TOTAL]++;
            day_stats[post_day][S_PHOTOS][ST_TOTAL][SA_TOTAL]++;
            day_stats[post_day][S_PHOTOS][int_type][SA_TOTAL]++;
            daily_stats[post_date][S_PHOTOS][ST_TOTAL][SA_TOTAL]++;
            daily_stats[post_date][S_PHOTOS][int_type][SA_TOTAL]++;
          }
        }
        if (att.objectType == "video") {
          item.chk_videos = true;
          item.int_videos++;
          total_stats[S_VIDEOS][ST_TOTAL][int_audience]++;
          total_stats[S_VIDEOS][int_type][int_audience]++;
          hour_stats[post_hour][S_VIDEOS][ST_TOTAL][int_audience]++;
          hour_stats[post_hour][S_VIDEOS][int_type][int_audience]++;
          day_stats[post_day][S_VIDEOS][ST_TOTAL][int_audience]++;
          day_stats[post_day][S_VIDEOS][int_type][int_audience]++;
          daily_stats[post_date][S_VIDEOS][ST_TOTAL][int_audience]++;
          daily_stats[post_date][S_VIDEOS][int_type][int_audience]++;

          total_stats[S_VIDEOS][ST_TOTAL][SA_TOTAL]++;
          total_stats[S_VIDEOS][int_type][SA_TOTAL]++;
          hour_stats[post_hour][S_VIDEOS][ST_TOTAL][SA_TOTAL]++;
          hour_stats[post_hour][S_VIDEOS][int_type][SA_TOTAL]++;
          day_stats[post_day][S_VIDEOS][ST_TOTAL][SA_TOTAL]++;
          day_stats[post_day][S_VIDEOS][int_type][SA_TOTAL]++;
          daily_stats[post_date][S_VIDEOS][ST_TOTAL][SA_TOTAL]++;
          daily_stats[post_date][S_VIDEOS][int_type][SA_TOTAL]++;
        }
        if (att.image != undefined) {
          if (att.image.url != undefined) {
            att_link = "";
            if (att.url != undefined) {
              att_link = att.url;
            }
            if (att_link == "") {
              if (att.fullImage != undefined) {
                att_link = att.fullImage.url;
              }
            }
            if (att_link.search("plus.google.com/photos") >= 0) {
              att_link = att.image.url.toUpperCase();
              att_link = att_link.substring(att_link.length - 4);
              if (att_link == ".GIF") {
                item.chk_gifs = true;
                item.int_gifs++;
                total_stats[S_GIFS][ST_TOTAL][int_audience]++;
                total_stats[S_GIFS][int_type][int_audience]++;
                hour_stats[post_hour][S_GIFS][ST_TOTAL][int_audience]++;
                hour_stats[post_hour][S_GIFS][int_type][int_audience]++;
                day_stats[post_day][S_GIFS][ST_TOTAL][int_audience]++;
                day_stats[post_day][S_GIFS][int_type][int_audience]++;
                daily_stats[post_date][S_GIFS][ST_TOTAL][int_audience]++;
                daily_stats[post_date][S_GIFS][int_type][int_audience]++;

                total_stats[S_GIFS][ST_TOTAL][SA_TOTAL]++;
                total_stats[S_GIFS][int_type][SA_TOTAL]++;
                hour_stats[post_hour][S_GIFS][ST_TOTAL][SA_TOTAL]++;
                hour_stats[post_hour][S_GIFS][int_type][SA_TOTAL]++;
                day_stats[post_day][S_GIFS][ST_TOTAL][SA_TOTAL]++;
                day_stats[post_day][S_GIFS][int_type][SA_TOTAL]++;
                daily_stats[post_date][S_GIFS][ST_TOTAL][SA_TOTAL]++;
                daily_stats[post_date][S_GIFS][int_type][SA_TOTAL]++;
              }
            }
          }
        }
      }
    }
  }

  function reset_stats() {
    var i, j;
    people = [];
    total_stats = [];
    hour_stats = [];
    day_stats = [];
    daily_stats = {};
    for (j = 0; j < 24; j++) {
      hour_stats[j] = [];
    }
    for (j = 0; j < 7; j++) {
      day_stats[j] = [];
    }
    for (i = 0; i < S_VARS; i++) {
      total_stats[i] = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
      for (j = 0; j < 24; j++) {
        hour_stats[j][i] = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
      }
      for (j = 0; j < 7; j++) {
        day_stats[j][i] = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
      }
    }
    min_date = undefined;
    max_date = undefined;
  }

  function reset_popular() {
    max_reshares = 0;
    max_reshares_post = -1;
    max_plusones = 0;
    max_plusones_post = -1;
    max_comments = 0;
    max_comments_post = -1;
  }

  function update_popular(i) {
    var item, plusones;
    item = activities[i];

    if (item.object.replies != undefined) {
      if (item.object.replies.totalItems > max_comments) {
        max_comments = item.object.replies.totalItems;
        max_comments_post = i;
      }
    }

    plusones = 0;
    if (item.object.plusoners != undefined) {
      plusones = item.object.plusoners.totalItems;
      if (item.object.plusoners.items) {
        if (item.object.plusoners.items.length > plusones) {
          plusones = item.object.plusoners.items.length;
        }
      }
    }
    if (plusones > 0) {
      if (plusones > max_plusones) {
        max_plusones = plusones;
        max_plusones_post = i;
      }
    }

    if (item.object.resharers != undefined) {
      if (item.object.resharers.totalItems > max_reshares) {
        max_reshares = item.object.resharers.totalItems;
        max_reshares_post = i;
      }
    }
  }

  function display_popular() {
    var str_contents, chk_comments, chk_reshares, chk_plusones, int_posts;
    chk_comments = false;
    chk_reshares = false;
    chk_plusones = false;
    int_posts = 0;
    str_contents = "<table><tr>";
    if (max_comments > 0) {
      chk_comments = true;
      str_contents += "<td><b>Most comments (" + max_comments + ")";
      if (max_comments_post == max_reshares_post) {
        str_contents += " / Most reshares (" + max_reshares + ")";
        chk_reshares = true;
      }
      if (max_comments_post == max_plusones_post) {
        str_contents += " / Most +1's (" + max_plusones + ")";
        chk_plusones = true;
      }
      str_contents += "</b><br>";
      str_contents += print_post(max_comments_post) + "</td>";
      int_posts++;
    }
    if (max_reshares > 0 && chk_reshares == false) {
      chk_reshares = true;
      str_contents += "<td><b>Most reshares (" + max_reshares + ")";
      if (max_reshares_post == max_plusones_post) {
        str_contents += " / Most +1's (" + max_plusones + ")";
        chk_plusones = true;
      }
      str_contents += "</b><br>";
      str_contents += print_post(max_reshares_post) + "</td>";
      int_posts++;
    }
    if (max_plusones > 0 && chk_plusones == false) {
      str_contents += "<td><b>Most +1's (" + max_plusones + ")</b><br>";
      str_contents += print_post(max_plusones_post) + "</td>";
      int_posts++;
    }
    str_contents += "</tr></table>";
    $("#d_popular").html(str_contents);
    switch (int_posts) {
    case 1: $("#d_popular td").addClass("single_post"); break;
    case 2: $("#d_popular td").addClass("double_post"); break;
    case 3: $("#d_popular td").addClass("triple_post"); break;
    }
  }

  function handleFile(f) {
    var reader, i, activity, chk_new;
    reader = new global.FileReader();

    reader.onload = function (eventObj) {
      activity = {};
      try {
        activity = JSON.parse(eventObj.target.result);
      } catch (e) {
        // wrong filetype
      }
      if (activity && activity.id && activity.actor && activity.url && activity.object && activity.published) {
        // correct file
        chk_new = true;
        for (i = 0; i < activities.length; i++) {
          if (activities[i].id === activity.id) {
            chk_new = false;
            break;
          }
        }
        if (chk_new) {
          activities.push(activity);
          if (!author && !keyword) {
            author = activity.actor;
            update_author();
          }
        }
      }
      fileCount--;
      if (fileCount === 0) {
        update_activities();
        $("#progress").hide();
        $("#drop_zone").show();
        if (activities.length > 0) {
          $("#stat_types").show();
          $("#filter_data").show();
          $(".stat_calculated").removeClass("stat_calculated");
        }
      }
    };

    reader.readAsText(f);
  }

  function handleFileSelect(eventObj) {
    var i, l, files;
    $("#progress").show();
    $("#drop_zone").hide();
    $("#stat_types").hide();
    $("#filter_data").hide();
    eventObj.stopPropagation();
    eventObj.preventDefault();

    files = eventObj.dataTransfer.files;
    l = files.length;
    for (i = 0; i < l; i++) {
      fileCount++;
      handleFile(files[i]);
    }

    $("#drop_zone").removeClass("dragging");
  }

  function handleDragOver(eventObj) {
    eventObj.stopPropagation();
    eventObj.preventDefault();
    eventObj.dataTransfer.dropEffect = "copy"; // Explicitly show this is a copy.
  }

  function activitiesLoaded(next_token, error) {
    if (next_token && next_token !== "") {
      page_token = next_token;
      $("#load_more").show();
    } else {
      page_token = "";
      if (author && author.id) {
        $("#load_more").remove();
      } else {
        search_type = 1 - search_type;
        if (search_type === 0) {
          global.setTimeout(function () { $("#load_more").show(); }, 60000);
        } else {
          $("#load_more").show();
        }
      }
    }
    $("#progress").hide();
    if (activities.length > 0) {
      $("#stat_types").show();
      $("#filter_data").show();
      $(".stat_calculated").removeClass("stat_calculated");
    }
  }

  function search_activities(k, token, retry, max, cb) {
    var feed_url;
    feed_url =
      "https://www.googleapis.com/plus/v1/activities?query=" +
      encodeURIComponent(k) +
      "&callback=?&alt=json&maxResults=20&orderBy=" +
      (search_type === 0 ? "recent" : "best") + "&key=" + api_key;
    if (token != "") {
      feed_url += "&pageToken=" + token;
    }
    $.jsonp({
      "url": feed_url,
      "success": function (data) {
        var i, l, chk_new, i1, l1, next_token = "";
        if (data.items) {
          l = data.items.length;
          for (i = 0; i < l; i++) {
            chk_new = true;
            l1 = activities.length;
            for (i1 = 0; i1 < l1; i1++) {
              if (activities[i1].id === data.items[i].id) {
                chk_new = false;
                break;
              }
            }
            if (chk_new) {
              activities.push(data.items[i]);
            }
          }
        }
        update_activities();
        if (data.nextPageToken) {
          next_token = data.nextPageToken;
        }
        if (next_token === "" || (max > 0 && activities.length >= max)) {
          cb(next_token);
        } else {
          global.setTimeout(function () { search_activities(k, next_token, 0, max, cb); }, 100);
        }
      },
      "error": function (d, msg) {
        if (retry < 5) {
          global.setTimeout(function () { search_activities(k, token, retry + 1, max, cb); }, 200 * (retry + 1));
        } else {
          cb();
        }
      }
    });
  }

  function initialize() {
    $("#drop_zone").show();
    $("#progress").hide();
    $(".menue").hide();
    $(".contents").hide();
    $("#d_start").show();
    $("#men_start").show();
    dropZone = global.document.getElementById("drop_zone");
    dropZone.addEventListener("dragover", handleDragOver, false);
    dropZone.addEventListener("drop", handleFileSelect, false);
    dropZone.addEventListener("dragenter", function () {
      $("#drop_zone").addClass("dragging");
    }, false);
    dropZone.addEventListener("dragleave", function () {
      $("#drop_zone").removeClass("dragging");
    }, false);

    $(".menue").click(function (eventObj) {
      menu_click(eventObj.target.id.substring(4));
    });

    $("#d_charts input").click(update_charts);
    $("#d_posts input").click(update_posts);

    $("#login_version .instructions a").click(function () {
      $("#login_instructions").show();
      $("#api_instructions").hide();
      $("#takeout_instructions").hide();
      $("#search_instructions").hide();
    });

    $("#api_version .instructions a").click(function () {
      $("#login_instructions").hide();
      $("#api_instructions").show();
      $("#takeout_instructions").hide();
      $("#search_instructions").hide();
    });

    $("#takeout_version .instructions a").click(function () {
      $("#login_instructions").hide();
      $("#api_instructions").hide();
      $("#takeout_instructions").show();
      $("#search_instructions").hide();
    });

    $("#search_version .instructions a").click(function () {
      $("#login_instructions").hide();
      $("#api_instructions").hide();
      $("#takeout_instructions").hide();
      $("#search_instructions").show();
    });

    $("#date_from, #date_to").datepicker({dateFormat: "yy-mm-dd"});
    $("#date_from, #date_to").change(function () {
      $("#date_slider").slider("values",
        [
          ($.datepicker.parseDate("yy-mm-dd", $("#date_from").val())).getTime(),
          ($.datepicker.parseDate("yy-mm-dd", $("#date_to").val())).getTime()
        ]);
      filter_activities();
    });

    $("#filter_keyword").keyup(filter_activities);

		$("#date_slider").slider({
			range: true,
			min: (new Date(2011, 5, 1)).getTime(),
			max: (new Date()).getTime(),
			values: [(new Date(2011, 5, 1)).getTime(), (new Date()).getTime()],
			slide: function (event, ui) {
				$("#date_from").val($.datepicker.formatDate("yy-mm-dd", new Date(ui.values[0])));
        $("#date_to").val($.datepicker.formatDate("yy-mm-dd", new Date(ui.values[1])));
        filter_activities();
			}
		});
		$("#date_from").val($.datepicker.formatDate("yy-mm-dd", new Date($("#date_slider").slider("values", 0))));
    $("#date_to").val($.datepicker.formatDate("yy-mm-dd", new Date($("#date_slider").slider("values", 1))));

    $("#all_activities").click(function () {
      var start, end;
      start = new Date($("#date_slider").slider("option", "min"));
      end = new Date($("#date_slider").slider("option", "max"));
      $("#date_from").val($.datepicker.formatDate("yy-mm-dd", start));
      $("#date_to").val($.datepicker.formatDate("yy-mm-dd", end));
      $("#date_slider").slider("values", [start.getTime(), end.getTime()]);
      $("#filter_keyword").val("");
      filter_activities();
    });

    chk_api_data = false;
    if (author && author.id) {
      $("#progress").show();
      $("#load_500").click(function () {
        $("#progress").show();
        $("#load_more").hide();
        $("#stat_types").hide();
        $("#filter_data").hide();
        load_activities(author.id, page_token, 0, activities.length + 500, activitiesLoaded);
      });
      $("#load_all").click(function () {
        $("#progress").show();
        $("#load_more").hide();
        $("#stat_types").hide();
        $("#filter_data").hide();
        load_activities(author.id, page_token, 0, 0, activitiesLoaded);
      });

      chk_api_data = true;
      $(".takeout").addClass("deactivated");
      $(".takeout").attr("title", "Only available for Takeout data");
      $(".takeout").hide();
      update_author();
      load_activities(author.id, "", 0, 500, activitiesLoaded);
    }

    if (keyword && $.trim(keyword) !== "") {
      keyword = $.trim(keyword);
      $("#progress").show();
      $("#load_all").hide();
      $("#load_500").click(function () {
        $("#progress").show();
        $("#load_more").hide();
        $("#stat_types").hide();
        $("#filter_data").hide();
        search_activities(keyword, page_token, 0, activities.length + 200, activitiesLoaded);
      });

      chk_api_data = true;
      $("#plusoners_head").removeClass("takeout");
      $("#plusoners").removeClass("takeout");
      $("#plusoners_head").html("Posters");
      $("#plusoners_head").attr("title", "People who have posted about the keyword");
      $(".takeout").addClass("deactivated");
      $(".takeout").attr("title", "Only available for Takeout data");
      $(".takeout").hide();
      update_keyword();
      search_activities(keyword, "", 0, 200, activitiesLoaded);
    }

    $("#stat_overview").click(function () {
      var i, l;
      $("#progress").show();
      menu_click("overview");
      if (!$("#stat_overview").hasClass("stat_calculated")) {
        reset_stats();
        l = activities.length;
        for (i = 0; i < l; i++) {
          if (activities[i].chk_active) {
            update_stats(i);
          }
        }
        recalc_stats();
        display_stats();
        $("#stat_overview").addClass("stat_calculated");
        $("#men_overview").show();
      }
      $("#progress").hide();
    });

    $("#stat_locations").click(function () {
      $("#progress").show();
      menu_click("locations");
      if (!$("#stat_locations").hasClass("stat_calculated")) {
        $("#progress").show();
        draw_map();
        $("#stat_locations").addClass("stat_calculated");
        $("#men_locations").show();
      }
      if (chk_locations) {
        map.fitBounds(llbounds);
      }
      $("#progress").hide();
    });

    $("#stat_charts").click(function () {
      var i, l;
      $("#progress").show();
      menu_click("charts");
      if (!$("#stat_charts").hasClass("stat_calculated")) {
        reset_stats();
        l = activities.length;
        for (i = 0; i < l; i++) {
          if (activities[i].chk_active) {
            update_stats(i);
          }
        }
        recalc_stats();
        prepare_charts();
        $("#stat_charts").addClass("stat_calculated");
        $("#men_charts").show();
      }
      $("#progress").hide();
    });

    $("#stat_popular").click(function () {
      var i, l;
      $("#progress").show();
      menu_click("popular");
      if (!$("#stat_popular").hasClass("stat_calculated")) {
        reset_popular();
        l = activities.length;
        for (i = 0; i < l; i++) {
          if (activities[i].chk_active) {
            update_popular(i);
          }
        }
        display_popular();
        $("#stat_popular").addClass("stat_calculated");
        $("#men_popular").show();
      }
      $("#progress").hide();
    });

    $("#stat_people").click(function () {
      $("#progress").show();
      menu_click("people");
      if (!$("#stat_people").hasClass("stat_calculated")) {
        check_people();
        $("#stat_people").addClass("stat_calculated");
        $("#men_people").show();
      }
      $("#progress").hide();
    });

    $("#stat_photos").click(function () {
      var i, l;
      $("#progress").show();
      menu_click("photos");
      if (!$("#stat_photos").hasClass("stat_calculated")) {
        activities.sort(date_sort_function);
        l = activities.length;
        for (i = 0; i < l; i++) {
          if (activities[i].chk_photos_printed) {
            if (activities[i].chk_active) {
              $(".photo_" + activities[i].id).show();
            } else {
              $(".photo_" + activities[i].id).hide();
            }
          } else {
            print_photos(i);
            activities[i].chk_photos_printed = true;
          }
        }
        $("#stat_photos").addClass("stat_calculated");
        $("#men_photos").show();
      }
      $("#progress").hide();
    });

    $("#stat_posts").click(function () {
      var i, l;
      $("#progress").show();
      menu_click("posts");
      if (!$("#stat_posts").hasClass("stat_calculated")) {
        activities.sort(date_sort_function);
        l = activities.length;
        for (i = 0; i < l; i++) {
          if (activities[i].chk_active) {
            if (!activities[i].chk_posts_printed) {
              update_activity(i);
              print_table_post(i);
              activities[i].chk_posts_printed = true;
            }
          }
        }
        update_posts();
        $("#stat_posts").addClass("stat_calculated");
        $("#men_posts").show();
      }
      $("#progress").hide();
    });

    $("#stat_data").click(function () {
      var i, l;
      $("#progress").show();
      global.setTimeout(function () {
        menu_click("data");
        if (!$("#stat_data").hasClass("stat_calculated")) {
          activities.sort(date_sort_function);
          l = activities.length;
          for (i = 0; i < l; i++) {
            if (activities[i].chk_active) {
              if (!activities[i].chk_data_printed) {
                update_activity(i);
                print_data_row(i);
                activities[i].chk_data_printed = true;
              } else {
                $("#raw_" + activities[i].id).show();
              }
            } else {
              if (activities[i].chk_data_printed) {
                $("#raw_" + activities[i].id).hide();
              }
            }
          }
          export_table();
          $("#stat_data").addClass("stat_calculated");
          $("#men_data").show();
        }
        $("#progress").hide();
      }, 1);
    });
  }

  global.google.load("visualization", "1",
    {
      packages: ["corechart"],
      callback: function () {
        global.google.load("maps", "3",
          {
            other_params: "sensor=false",
            callback: function () {
              prepare_map();
              global.setTimeout(initialize, 50);
            }
          });
      }
    });
}

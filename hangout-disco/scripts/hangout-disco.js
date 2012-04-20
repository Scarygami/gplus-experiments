/*
 * Copyright (c) 2011-2012 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
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

/*global $: false, gapi: false, Keyboard_handler: false, BeatDetektor: false, HOST: false, Uint8Array: false, THREE: false*/

 // Flags that can be set via the checkboxes

var DEBUGMODE = false;
var SMOOTH = true;
var NOCLIP = false;
var FASTUPDATES = false;
var THIRD_PERSON = true;

// Globals for WEBGL

var WEBGL_SUPPORT = false;
var ROOM_WIDTH = 1000;
var ROOM_HEIGHT = 150;
var ROOM_FLOOR = 0;

var ROOM_MAX = ROOM_WIDTH / 2 + 25;
var ROOM_MIN = -ROOM_MAX;

var renderer;
var scene;
var camera;
var lights = [];

var android_geometry = {};

var last_tick = 0;
var last_update = 0;

var PLAYER_SPEED = 0.08;
var SMOOTH_SPEED = 0.12;
var ROT_SPEED = 0.002;
var PITCH_SPEED = 0.002;

// Globals for the shared state
var local_shared_state = null;
var local_participants = null;

// just some helpful functions to make things more readable...
var kbd = new Keyboard_handler(window.document);
var ROT_30 = Math.PI / 6;
var ROT_90 = Math.PI / 2;
var ROT_180 = Math.PI;
var ROT_270 = Math.PI * 1.5;
var ROT_360 = Math.PI * 2;

function player_id() {
  "use strict";
  return gapi.hangout.getParticipantId();
}

// ------------------------------------------------------------------------------------------
// Animations

function Animation(k, n, s, l, f) {
  "use strict";
  var key, share_name, speed, length, func, int_count, int_count_new, chk_running, progress;
  key = k;
  share_name = n;
  speed = s;
  length = l;
  func = f;
  int_count = 0;
  int_count_new = 0;
  chk_running = false;
  progress = 0;

  function animate(elapsed, player) {
    if (chk_running) {
      progress += speed * elapsed;
      if (progress > length) {
        chk_running = false;
        progress = 0;
      }
      func(player, progress);
    } else {
      if (int_count < int_count_new) {
        int_count++;
        chk_running = true;
        progress = 0;
      }
    }
  }

  function set_count(c) {
    int_count = c;
    int_count_new = c;
  }

  function set_count_new(c) {
    int_count_new = c;
  }

  function run() {
    int_count_new++;
  }

  return {
    key: key,
    share_name: share_name,
    is_running: function () { return chk_running; },
    animate: animate,
    get_count: function () { return int_count_new; },
    set_count: set_count,
    set_count_new: set_count_new,
    run: run
  };
}


// ------------------------------------------------------------------------------------------
// Audio

function Music() {
  "use strict";
  var
    AUDIO_SUPPORT = false,
    audio_context,
    audio_source,
    audio_gain_node,
    audio_analyser,
    audio_processor,
    audio_timer = 0,
    audio_bd = new BeatDetektor(),
    audio_vu = new BeatDetektor.modules.vis.VU(),
    songs = [],
    current_song = 0,
    playing = false,
    beat = 0.5,
    intensity = [2, 2, 2, 2];

  AUDIO_SUPPORT = true;
  if (window.AudioContext) {
    audio_context = new window.AudioContext();
  } else {
    if (window.webkitAudioContext) {
      audio_context = new window.webkitAudioContext();
    } else {
      AUDIO_SUPPORT = false;
    }
  }

  function change_volume(v) {
    if (audio_gain_node) {
      audio_gain_node.gain.value = v * v;
    }
  }

  function start_music() {
    try { audio_source.noteOff(0); } catch (e) {}
    audio_source = audio_context.createBufferSource();
    if (!audio_gain_node) { audio_gain_node = audio_context.createGainNode(); }
    if (!audio_analyser) { audio_analyser = audio_context.createAnalyser(); }
    if (!audio_processor) {
      audio_processor = audio_context.createJavaScriptNode(2048, 1, 1);
      audio_processor.onaudioprocess = function (e) {
        var input_array, freq_data, i, j, z, sum, bin_size;

        input_array = e.inputBuffer.getChannelData(0);
        freq_data = new Uint8Array(audio_analyser.frequencyBinCount);
        audio_analyser.getByteFrequencyData(freq_data);
        audio_bd.process(audio_context.currentTime, input_array);
        audio_timer += audio_bd.last_update;
        if (audio_timer > 1.0 / 24.0) {
          audio_vu.process(audio_bd, audio_timer);
          audio_timer = 0;
        }
        if (audio_vu.vu_levels.length) {
          z = audio_vu.vu_levels[0];
          beat = 1.0 + 10 * z;

        }
        bin_size = Math.floor(freq_data.length / 4);
        for (i = 0; i < lights.length; i++) {
          sum = 0;
          for (j = 0; j < bin_size; j++) {
            sum += freq_data[i * bin_size + j];
          }
          sum /= bin_size;
          intensity[i] = 0.5 + 3 * sum / 256;
        }
      };
    }
    audio_source.buffer = songs[current_song].buffer;
    audio_source.loop = true;

    audio_source.connect(audio_gain_node);
    audio_gain_node.connect(audio_context.destination);

    audio_source.connect(audio_analyser);
    audio_analyser.connect(audio_processor);
    audio_processor.connect(audio_context.destination);

    audio_source.noteOn(0);
  }

  function stop_music() {
    try { audio_source.noteOff(0); } catch (e) {}
    beat = 0.5;
    intensity = [2, 2, 2, 2];
  }

  function load_song(s_nr, mp3, callback) {
    songs[s_nr] = {};
    songs[s_nr].mp3 = mp3;
    songs[s_nr].buffer = null;
    var request = new XMLHttpRequest();
    request.open("GET", songs[s_nr].mp3, true);
    request.responseType = "arraybuffer";
    request.onload = function () {
      audio_context.decodeAudioData(request.response, function (buffer) {
        songs[s_nr].buffer = buffer;
        callback(s_nr);
      }, function () {
        console.log("Error decoding: " + songs[s_nr].mp3);
      });
    };
    request.send();
  }

  return {
    AUDIO_SUPPORT: AUDIO_SUPPORT,
    get_current_song: function () { return current_song; },
    set_current_song: function (s) { current_song = s; },
    change_volume: change_volume,
    start_music: start_music,
    stop_music: stop_music,
    load_song: load_song,
    get_beat: function () { return beat; },
    intensity: intensity
  };
}

var music;

function initialize_audio() {
  "use strict";
  var i, songs = [], cb;

  music = new Music();

  if (music.AUDIO_SUPPORT) {
    songs.push({
      song_title: "Emerge in Love",
      song_author: "Alex",
      song_link: "http://ccmixter.org/files/AlexBeroza/30239",
      mp3: HOST + "songs/alex__emerge_in_love.mp3"
    });
    songs.push({
      song_title: "Straight to the Light",
      song_author: "Alex",
      song_link: "http://ccmixter.org/files/AlexBeroza/29630",
      mp3: HOST + "songs/alex__straight_to_the_light.mp3"
    });
    songs.push({
      song_title: "Hornet",
      song_author: "George Ellinas",
      song_link: "http://ccmixter.org/files/George_Ellinas/15924",
      mp3: HOST + "songs/george_ellinas__hornet.mp3"
    });
    songs.push({
      song_title: "Mine + Yours = Ours",
      song_author: "George Ellinas",
      song_link: "http://ccmixter.org/files/George_Ellinas/28107",
      mp3: HOST + "songs/george_ellinas__mine_yours_ours.mp3"
    });

    $("#hangoutdisco_music").append("Music <input type=\"checkbox\" id=\"hangoutdisco_control_music\" disabled=\"true\"> (All songs licensed under <a href=\"http://creativecommons.org/licenses/by/3.0/\" target=\"_blank\">CC BY 3.0</a>)<br>");
    $("#hangoutdisco_music").append("Volume <input type=\"range\" min=\"0\" max=\"100\" value=\"100\" id=\"hangoutdisco_control_volume\" onchange=\"change_volume(this);\" disabled=\"true\" /><br>");
    for (i = 0; i < songs.length; i++) {
      $("#hangoutdisco_music").append("<input type=\"radio\" name=\"song\" value=\"" + i + "\" id=\"song" + i + "\" " + (i == 0 ? "checked=\"checked\"" : "") + " disabled=\"true\"> <a href=\"" + songs[i].song_link + "\" target=\"blank\">" + songs[i].song_title + " by " + songs[i].song_author + "</a><br>");
    }
    $("input[name='song']:radio").change(function () {
      for (i = 0; i < songs.length; i++) {
        if ($("#song" + i + ":checked").val() != undefined) {
          if (i != music.get_current_song()) {
            music.set_current_song(i);
            if ($("#hangoutdisco_control_music:checked").val() != undefined) {
              music.start_music();
            }
          }
        }
      }
    });
    $("#hangoutdisco_control_music").click(function () {
      if ($("#hangoutdisco_control_music:checked").val() != undefined) {
        music.start_music();
      } else {
        music.stop_music();
      }
    });

    cb = function (s_nr) {
      if (s_nr == 0) {
        $("#hangoutdisco_control_music").removeAttr("disabled");
        $("#hangoutdisco_control_volume").removeAttr("disabled");
      }
      $("#song" + s_nr).removeAttr("disabled");
    };

    for (i = 0; i < songs.length; i++) {
      music.load_song(i, songs[i].mp3, cb);
    }
  } else {
    $("#hangoutdisco_music").html("Unfortunately your browser doesn't support the new Web Audio API. Try Chrome ;)");
  }
}


// ------------------------------------------------------------------------------------------

var players = [];

// Player object
function Player(p_id, x, y, z, p_rot, p_pitch, p_col, p_s_width, p_s_height, ph) {
  "use strict";
  var
    id = p_id,
    col = new THREE.Color(p_col),
    col_new = new THREE.Color(p_col),
    pos = new THREE.Vector3(x, y, z),
    pos_new = new THREE.Vector3(x, y, z),
    rot = p_rot,
    rot_new = p_rot,
    rot_rate = 0,
    pitch = p_pitch,
    pitch_new = p_pitch,
    pitch_rate = 0,
    speed = 0,
    strafe = 0,
    jogging_angle = 0,
    scale_width = p_s_width,
    scale_width_new = p_s_width,
    scale_height = p_s_height,
    scale_height_new = p_s_height,
    animations = [],
    player_material,
    eyes_material,
    profile_material,
    tmp_img = "",
    p,
    model,
    chk_partyhat = ph;

  animations.push(new Animation("space", "jump", 0.008, Math.PI, function (model, progress) {
    model.body.position.y = Math.sin(progress) * 15;
  }));
  animations.push(new Animation("C", "duck", 0.005, Math.PI, function (model, progress) {
    var s = Math.sin(progress) * 15;
    model.body.position.y = -s;
    s += 19;
    model.leg1.position.y = s;
    model.leg2.position.y = s;
  }));
  animations.push(new Animation("E", "wave", 0.008, ROT_360, function (model, progress) {
    var s = Math.sin(progress) * Math.sin(progress);
    model.arm2.rotation.x = 0; // don't swing arm while waving
    if (progress > ROT_90 && progress < ROT_270) {
      model.arm2.rotation.z = -(Math.PI * 0.75 + s * Math.PI / 4);
    } else {
      model.arm2.rotation.z = -s * Math.PI;
    }
  }));
  animations.push(new Animation("T", "turn", 0.003, ROT_360, function (model, progress) {
    model.body.rotation.y = progress;
  }));
  animations.push(new Animation("R", "hturn", 0.003, ROT_360, function (model, progress) {
    model.head.rotation.y = progress;
  }));

  player_material = new THREE.MeshLambertMaterial({ color: col.getHex(), shading: THREE.SmoothShading });
  eyes_material = new THREE.MeshLambertMaterial({ color: 0xEEEEEE, shading: THREE.SmoothShading });

  tmp_img = "";
  p = gapi.hangout.getParticipantById(id);
  if (p.person.image) {
    tmp_img = p.person.image.url;
    tmp_img = tmp_img.replace("s96-c", "s256-c");
    tmp_img = tmp_img.replace("?sz=50", "");
    tmp_img += "?sz=256";
  }
  profile_material = player_material;
  if (tmp_img != "") {
    profile_material = new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture(tmp_img) });
  }

  model = new THREE.Object3D();

  model.body = new THREE.Mesh(android_geometry.body, player_material);
  model.add(model.body);

  model.arm1 = new THREE.Mesh(android_geometry.arm, player_material);
  model.arm1.position.y = 45;
  model.arm1.position.x = 27;
  model.body.add(model.arm1);

  model.arm2 = new THREE.Mesh(android_geometry.arm, player_material);
  model.arm2.position.y = 45;
  model.arm2.position.x = -27;
  model.body.add(model.arm2);

  model.leg1 = new THREE.Mesh(android_geometry.leg, player_material);
  model.leg1.position.y = 19;
  model.leg1.position.x = 10;
  model.body.add(model.leg1);

  model.leg2 = new THREE.Mesh(android_geometry.leg, player_material);
  model.leg2.position.y = 19;
  model.leg2.position.x = -10;
  model.body.add(model.leg2);

  model.head = new THREE.Mesh(android_geometry.head, player_material);
  model.head.position.y = 52;
  model.eyes = new THREE.Mesh(android_geometry.eyes, eyes_material);
  model.head.add(model.eyes);
  model.partyhat = new THREE.Mesh(android_geometry.partyhat, eyes_material);
  model.partyhat.rotation.x = -Math.PI / 6;
  model.partyhat.visible = chk_partyhat;
  model.partyhat.scale.x = 0.8;
  model.partyhat.scale.y = 0.8;
  model.partyhat.scale.z = 0.8;
  model.partyhat.position.y = 5;
  model.head.add(model.partyhat);
  model.body.add(model.head);

  model.profile_plane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20, 1, 1), profile_material);
  model.profile_plane.position.y = 36;
  model.profile_plane.position.z = 22;
  model.body.add(model.profile_plane);

  function set_state(s, v) {
    var i;
    console.log("setting " + s + " to " + v);
    switch (s) {
    case "x": pos_new.x = parseFloat(v); break;
    case "z": pos_new.z = parseFloat(v); break;
    case "rot": rot_new = parseFloat(v); break;
    case "pitch": pitch_new = parseFloat(v); break;
    case "col": col_new.setHex(parseInt(v, 10)); break;
    case "s_width": scale_width_new = parseFloat(v); break;
    case "s_height": scale_height_new = parseFloat(v); break;
    case "partyhat":
      chk_partyhat = (v == "1");
      model.partyhat.visible = chk_partyhat;
      break;
    default:
      if (s.substr(0, 4) == "ani_") {
        for (i = 0; i < animations.length; i++) {
          if (animations[i].share_name == s.substr(4)) {
            animations[i].set_count_new(parseInt(v, 10));
            break;
          }
        }
      }
    }
  }

  function animate(elapsed) {
    var chk_moving, dif_x, dif_z, dif, change, rot2, i, test_x, test_z, first_cycle, new_material, phi, phi2, theta, target_x, target_y, target_z, pitch2;

    chk_moving = false;
    if (id == player_id()) {
      // real animation based on speed values
      dif_x = 0;
      dif_z = 0;
      if (speed != 0) {
        dif = speed * elapsed;
        dif_x -= Math.sin(rot) * dif;
        dif_z -= Math.cos(rot) * dif;
      }
      if (strafe != 0) {
        dif = strafe * elapsed;
        rot2 = rot + ROT_90;
        dif_x -= Math.sin(rot2) * dif;
        dif_z -= Math.cos(rot2) * dif;
      }

      // check for collision with other participants
      if (!NOCLIP) {
        for (i = 1; i < players.length; i++) {
          test_x = pos.x - players[i].get_pos().x;
          test_z = pos.z - players[i].get_pos().z;
          if ((test_x + dif_x) * (test_x + dif_x) + (test_z + dif_z) * (test_z + dif_z) < 3600) {
            if ((test_x + dif_x) * (test_x + dif_x) + test_z * test_z < 3600) {
              dif_x = 0;
            }
            if (test_x * test_x + (test_z + dif_z) * (test_z + dif_z) < 3600) {
              dif_z = 0;
            }
          }
        }
      }
      chk_moving = (dif_x != 0 || dif_z != 0);
      pos.x += dif_x;
      pos.z += dif_z;

      rot += rot_rate * elapsed;
      if (rot > ROT_180) { rot -= ROT_360; }
      if (rot < -ROT_180) { rot += ROT_360; }

      pitch += pitch_rate * elapsed;
      pitch = Math.max(-ROT_30, Math.min(ROT_30, pitch));
      pos.x = Math.max(ROOM_MIN, Math.min(ROOM_MAX, pos.x));
      pos.z = Math.max(ROOM_MIN, Math.min(ROOM_MAX, pos.z));
    } else {
      if (SMOOTH) {
        // interpolate from actual values to new values
        dif_x = pos_new.x - pos.x;
        dif_z = pos_new.z - pos.z;
        if (dif_x != 0 || dif_z != 0) {
          dif = SMOOTH_SPEED / (Math.abs(dif_x) + Math.abs(dif_z)) * elapsed;
        }

        if (dif_x != 0) {
          if (dif_x > -5 && dif_x < 5) {
            pos.x = pos_new.x;
          } else {
            chk_moving = true;
            pos.x += dif_x * dif;
          }
        }
        if (dif_z != 0) {
          if (dif_z > -5 && dif_z < 5) {
            pos.z = pos_new.z;
          } else {
            chk_moving = true;
            pos.z += dif_z * dif;
          }
        }

        dif = pitch_new - pitch;
        if (dif != 0) {
          if (dif > -0.08 && dif < 0.08) {
            pitch = pitch_new;
          } else {
            pitch += dif / Math.abs(dif) * 0.002 * elapsed;
          }
        }

        dif = rot_new - rot;
        if (dif != 0) {
          if (dif > ROT_180) { dif -= ROT_360; }
          if (dif < -ROT_180) { dif += ROT_360; }
          if (dif > -0.08 && dif < 0.08) {
            rot = rot_new;
          } else {
            rot += dif / Math.abs(dif) * 0.002 * elapsed;
          }
        }

        dif = scale_width_new - scale_width;
        if (dif != 0) {
          if (Math.abs(dif) < 0.1) {
            scale_width = scale_width_new;
          } else {
            change = dif / Math.abs(dif) * 0.005 * elapsed;
            if (Math.abs(change) > Math.abs(dif)) { change = dif; }
            scale_width += change;
          }
        }

        dif = scale_height_new - scale_height;
        if (dif != 0) {
          if (Math.abs(dif) < 0.1) {
            scale_height = scale_height_new;
          } else {
            change = dif / Math.abs(dif) * 0.005 * elapsed;
            if (Math.abs(change) > Math.abs(dif)) { change = dif; }
            scale_height += change;
          }
        }
      } else {
        pos.x = pos_new.x;
        pos.y = pos_new.y;
        pos.z = pos_new.z;
        rot = rot_new;
        pitch = pitch_new;
        scale_width = scale_width_new;
        scale_height = scale_height_new;
      }
    }

    // jogging animation
    if (chk_moving) {
      jogging_angle += elapsed * 0.009;
      if (jogging_angle > ROT_360) {
        jogging_angle -= ROT_360;
      }
    } else {
      if (jogging_angle != 0) {
        // just move back to normal position as quickly as possible
        first_cycle = (jogging_angle < ROT_180);
        jogging_angle += elapsed * 0.02;
        if (jogging_angle > (first_cycle ? ROT_180 : ROT_360)) {
          jogging_angle = 0;
        }
      }
    }
    dif = Math.sin(jogging_angle);
    model.body.position.y = 2 * dif * dif;
    dif = dif * ROT_30;
    model.arm1.rotation.x = dif;
    model.arm2.rotation.x = -dif;
    model.leg1.rotation.x = -dif;
    model.leg2.rotation.x = dif;

    for (i = 0; i < animations.length; i++) {
      animations[i].animate(elapsed, model);
    }

    model.scale.y = scale_height;
    model.scale.x = scale_width;
    model.scale.z = scale_width;

    if (col != col_new) {
      col.r = col_new.r;
      col.g = col_new.g;
      col.b = col_new.b;
      new_material = new THREE.MeshLambertMaterial({ color: col.getHex(), shading: THREE.SmoothShading });
      model.body.material = new_material;
      model.head.material = new_material;
      model.leg1.material = new_material;
      model.leg2.material = new_material;
      model.arm1.material = new_material;
      model.arm2.material = new_material;
    }

    dif = 0;
    if (gapi.hangout.av.getParticipantVolume(id)) {
      dif = gapi.hangout.av.getParticipantVolume(id);
    }
    model.head.position.y = 52 + dif;

    model.position.x = pos.x;
    model.position.y = pos.y;
    model.position.z = pos.z;
    pitch2 = pitch / 2;
    phi = ROT_90 - pitch;
    phi2 = ROT_90 - pitch2;
    theta = rot;

    target_x = pos.x - 100 * Math.sin(theta);
    if (pitch < 0) {
      target_y = pos.y + 100 * Math.cos(phi);
      model.head.rotation.x = 0;
      model.leg1.rotation.x += pitch;
      model.leg2.rotation.x += pitch;
    } else {
      target_y = pos.y + 100 * Math.cos(phi2);
      model.head.rotation.x = -pitch2;
      model.leg1.rotation.x += pitch2;
      model.leg2.rotation.x += pitch2;
    }
    target_z = pos.z - 100 * Math.cos(theta);

    model.lookAt(new THREE.Vector3(target_x, target_y, target_z));
  }

  function set_display(d) {
    model.body.visible = d;
    model.arm1.visible = d;
    model.arm2.visible = d;
    model.leg1.visible = d;
    model.leg2.visible = d;
    model.head.visible = d;
    model.eyes.visible = d;
    model.partyhat.vi = (d && chk_partyhat);
  }

  function set_partyhat(h) {
    chk_partyhat = h;
    model.partyhat.visible = (model.body.visible && chk_partyhat);
  }

  function set_color(r, g, b) {
    col_new.r = r;
    col_new.g = g;
    col_new.b = b;
  }

  function set_scale(h, w) {
    scale_height = h;
    scale_width = w;
  }

  function handle_keys(kbd) {
    var i;

    for (i = 0; i < animations.length; i++) {
      if (kbd.pressed(animations[i].key)) {
        if (!animations[i].is_running()) {
          animations[i].run();
        }
      }
    }

    if (kbd.pressed("up")) {
      pitch_rate = PITCH_SPEED;
    } else if (kbd.pressed("down")) {
      pitch_rate = -PITCH_SPEED;
    } else {
      pitch_rate = 0;
    }

    if (kbd.pressed("left")) {
      rot_rate = ROT_SPEED;
    } else if (kbd.pressed("right")) {
      rot_rate = -ROT_SPEED;
    } else {
      rot_rate = 0;
    }

    if (kbd.pressed("a")) {
      strafe = PLAYER_SPEED / 2;
    } else if (kbd.pressed("d")) {
      strafe = -PLAYER_SPEED / 2;
    } else {
      strafe = 0;
    }

    if (kbd.pressed("w")) {
      speed = PLAYER_SPEED;
    } else if (kbd.pressed("s")) {
      speed = -PLAYER_SPEED;
    } else {
      speed = 0;
    }
    if (kbd.pressed("shift")) {
      speed *= 2;
    }
  }

  return {
    get_id: function() { return id; },
    get_pos: function () { return pos; },
    get_pitch: function () { return pitch; },
    get_rot: function () { return rot; },
    get_scale_width: function () { return scale_width; },
    get_scale_height: function () { return scale_height; },
    get_col: function () { return col; },
    get_partyhat: function () { return chk_partyhat; },
    model: model,
    animations: animations,
    animate: animate,
    set_display: set_display,
    set_state: set_state,
    set_color: set_color,
    set_scale: set_scale,
    set_partyhat: set_partyhat,
    handle_keys: handle_keys
  };
}
// ------------------------------------------------------------------------------------------

function change_avatar() {
  "use strict";
  var r, g, b, h, w, ph;
  if (players[0]) {
    r = $("#hangoutdisco_avatar_color_r").val() / 100;
    g = $("#hangoutdisco_avatar_color_g").val() / 100;
    b = $("#hangoutdisco_avatar_color_b").val() / 100;
    h = 1.0 + ($("#hangoutdisco_avatar_height").val() - 50) / 100;
    w = 1.0 + ($("#hangoutdisco_avatar_width").val() - 50) / 100;
    ph = ($("#hangoutdisco_avatar_partyhat:checked").val() != undefined);
    players[0].set_color(r, g, b);
    players[0].set_scale(h, w);
    players[0].set_partyhat(ph);
  }
}

function change_volume(element) {
  "use strict";
  var fraction;
  if (music) {
    fraction = parseInt(element.value, 10) / parseInt(element.max, 10);
    music.change_volume(fraction);
  }
}

function initialize_player() {
  "use strict";
  var
    place_found = false,
    x = 0,
    y = 0,
    z = 0,
    col = Math.floor(((Math.random() * 100 + 155) * 256 + (Math.random() * 100 + 155)) * 256 + (Math.random() * 100 + 155)),
    tmp_id, i, test_x, test_z;

  while (!place_found) {
    x = Math.random() * ROOM_WIDTH - ROOM_WIDTH / 2;
    y = 0;
    z = Math.random() * ROOM_WIDTH - ROOM_WIDTH / 2;
    place_found = true;
    for (i in local_participants) {
      if (local_participants.hasOwnProperty(i)) {
        tmp_id = local_participants[i].id;
        if (tmp_id != player_id()) {
          if (local_shared_state[tmp_id + ":x"]) {
            test_x = x - local_shared_state[tmp_id + ":x"];
            test_z = z - local_shared_state[tmp_id + ":z"];
            if (test_x * test_x + test_z * test_z < 10000) {
              place_found = false;
              break;
            }
          }
        }
      }
    }
  }
  players[0] = new Player(player_id(), x, y, z, 0, 0, col, 1, 1, false);
  scene.add(players[0].model);
  $("#hangoutdisco_avatar_color_r").val(Math.floor(players[0].get_col().r * 100));
  $("#hangoutdisco_avatar_color_g").val(Math.floor(players[0].get_col().g * 100));
  $("#hangoutdisco_avatar_color_b").val(Math.floor(players[0].get_col().b * 100));
}

function update_local_shared_state() {
  "use strict";
  var i, j, tmp;
  local_shared_state = gapi.hangout.data.getState();
  for (i in local_shared_state) {
    if (local_shared_state.hasOwnProperty(i)) {
      tmp = i.split(":");
      for (j = 1; j < players.length; j++) {
        if (players[j].get_id() == tmp[0]) {
          players[j].set_state(tmp[1], local_shared_state[i]);
          break;
        }
      }
    }
  }
}

function update_shared_state(force) {
  "use strict";
  var this_update, new_state, delete_state, tmp, chk_found, i, p, this_player_id, this_player;

  this_update = new Date().getTime();
  if ((last_update != 0) || force) {
    if ((this_update - last_update > (FASTUPDATES ? 33 : 1000)) || force) {
      update_local_shared_state();

      new_state = {};
      delete_state = [];
      for (i in local_shared_state) {
        if (local_shared_state.hasOwnProperty(i)) {
          tmp = i.split(":");
          chk_found = false;
          for (p in local_participants) {
            if (local_participants.hasOwnProperty(p)) {
              if (local_participants[p].id == tmp[0]) {
                chk_found = true;
                break;
              }
            }
          }
          if (!chk_found) {
            delete_state.push(i);
          }
        }
      }
      this_player_id = player_id();
      this_player = players[0];

      new_state[this_player_id + ":col"] = this_player.get_col().getHex().toString();
      new_state[this_player_id + ":x"] = Math.floor(this_player.get_pos().x).toString();
      new_state[this_player_id + ":z"] = Math.floor(this_player.get_pos().z).toString();
      new_state[this_player_id + ":pitch"] = this_player.get_pitch().toString();
      new_state[this_player_id + ":rot"] = this_player.get_rot().toString();
      new_state[this_player_id + ":s_width"] = this_player.get_scale_width().toString();
      new_state[this_player_id + ":s_height"] = this_player.get_scale_height().toString();
      new_state[this_player_id + ":partyhat"] = this_player.get_partyhat() ? "1" : "0";
      for (i = 0; i < this_player.animations.length; i++) {
        new_state[this_player_id + ":ani_" + this_player.animations[i].share_name] = this_player.animations[i].get_count().toString();
      }

      gapi.hangout.data.submitDelta(new_state, delete_state);
      last_update = this_update;
    }
  } else {
    last_update = this_update;
  }
}


function animate() {
  "use strict";
  var this_tick, elapsed, i, this_player, phi, phi2, theta, theta2, target_x, target_y, target_z, dif_x, dif_z;
  this_tick = new Date().getTime();
  if (last_tick != 0) {
    elapsed = this_tick - last_tick;
    //players
    for (i = 0; i < players.length; i++) {
      players[i].animate(elapsed);
    }

    //camera
    this_player = players[0];
    phi = ROT_90 - this_player.get_pitch();
//    phi2 = ROT_90 - this_player.pitch / 2;
    theta = this_player.get_rot();
    theta2 = theta + ROT_90;

    if (THIRD_PERSON) {
      this_player.set_display(true);
      camera.position.x = this_player.get_pos().x + 150 * Math.sin(theta);
      camera.position.y = 60;
      camera.position.z = this_player.get_pos().z + 150 * Math.cos(theta);
      camera.position.x += 25 * Math.sin(theta2);
      camera.position.z += 25 * Math.cos(theta2);
      camera.position.x = Math.max(-ROOM_WIDTH / 2 + 1, Math.min(ROOM_WIDTH / 2 - 1, camera.position.x));
      camera.position.z = Math.max(-ROOM_WIDTH / 2 + 1, Math.min(ROOM_WIDTH / 2 - 1, camera.position.z));
    } else {
      this_player.set_display(false);
      camera.position.x = this_player.get_pos().x;
      camera.position.y = this_player.model.body.position.y + 60;
      camera.position.z = this_player.get_pos().z;
    }

    target_x = camera.position.x - 100 * Math.sin(theta);
    target_y = camera.position.y + 100 * Math.cos(phi);
    target_z = camera.position.z - 100 * Math.cos(theta);
    camera.lookAt(new THREE.Vector3(target_x, target_y, target_z));

    //lights
    for (i = 0; i < 4; i++) {
      if (music) {
        lights[i].speed = music.get_beat();
        lights[i].intensity = music.intensity[i];
      } else {
        lights[i].speed = 0.5;
        lights[i].intensity = 2;
      }
      dif_x = 0;
      dif_z = 0;
      if (lights[i].speed != 0) {
        dif_x -= Math.sin(lights[i].dir) * lights[i].speed * elapsed;
        dif_z -= Math.cos(lights[i].dir) * lights[i].speed * elapsed;
      }
      lights[i].position.x += dif_x;
      lights[i].position.z += dif_z;
      if (lights[i].position.x > ROOM_WIDTH * 0.45) {
        lights[i].position.x = ROOM_WIDTH * 0.45;
        lights[i].dir = Math.random() * ROT_360 - ROT_180;
      }
      if (lights[i].position.x < -ROOM_WIDTH * 0.45) {
        lights[i].position.x = -ROOM_WIDTH * 0.45;
        lights[i].dir = Math.random() * ROT_360 - ROT_180;
      }
      if (lights[i].position.z > ROOM_WIDTH * 0.45) {
        lights[i].position.z = ROOM_WIDTH * 0.45;
        lights[i].dir = Math.random() * ROT_360 - ROT_180;
      }
      if (lights[i].position.z < -ROOM_WIDTH * 0.45) {
        lights[i].position.z = -ROOM_WIDTH * 0.45;
        lights[i].dir = Math.random() * ROT_360 - ROT_180;
      }
      if (lights[i].speed > 0.5) { lights[i].speed -= 0.01 * elapsed; }
      if (lights[i].speed < 0.5) { lights[i].speed = 0.5; }
    }
  }
  last_tick = this_tick;
}

function check_participants() {
  "use strict";
  var a, i, j, tmp_id, chk_new, x, z, rot, pitch, col, s_width, s_height, new_player, count, removed_player, ph;
  for (i = 1; i < players.length; i++) {
    players[i].chk_found = false;
  }

  for (i in local_participants) {
    if (local_participants.hasOwnProperty(i)) {
      tmp_id = local_participants[i].id;
      if (tmp_id != player_id()) {
        chk_new = true;
        for (j = 1; j < players.length; j++) {
          if (players[j].get_id() == tmp_id) {
            chk_new = false;
            players[j].chk_found = true;
            break;
          }
        }
        if (chk_new) {
          if (local_shared_state[tmp_id + ":x"]) {
            if (local_participants[i].person) {
              x = 0; if (local_shared_state[tmp_id + ":x"]) { x = parseFloat(local_shared_state[tmp_id + ":x"]); }
              z = 0; if (local_shared_state[tmp_id + ":z"]) { z = parseFloat(local_shared_state[tmp_id + ":z"]); }
              rot = 0; if (local_shared_state[tmp_id + ":rot"]) { rot = parseFloat(local_shared_state[tmp_id + ":rot"]); }
              pitch = 0; if (local_shared_state[tmp_id + ":pitch"]) { pitch = parseFloat(local_shared_state[tmp_id + ":pitch"]); }
              col = 0; if (local_shared_state[tmp_id + ":col"]) { col = parseInt(local_shared_state[tmp_id + ":col"], 10); }
              s_width = 0; if (local_shared_state[tmp_id + ":s_width"]) { s_width = parseFloat(local_shared_state[tmp_id + ":s_width"]); }
              s_height = 0; if (local_shared_state[tmp_id + ":s_height"]) { s_height = parseFloat(local_shared_state[tmp_id + ":s_height"]); }
              ph = false; if (local_shared_state[tmp_id + ":partyhat"]) { ph = (local_shared_state[tmp_id + ":partyhat"] == "1"); }
              new_player = new Player(tmp_id, x, 0, z, rot, pitch, col, s_width, s_height, ph);
              for (a = 0; a < new_player.animations.length; a++) {
                count = 0;
                if (local_shared_state[tmp_id + ":ani_" + new_player.animations[a].share_name]) {
                  count = parseInt(local_shared_state[tmp_id + ":ani_" + new_player.animations[a].share_name], 10);
                }
                new_player.animations[a].set_count(count);
              }
              players.push(new_player);
              scene.add(new_player.model);
              new_player.chk_found = true;
            }
          }
        }
      }
    }
  }

  i = 1;
  while (i < players.length) {
    if (players[i].chk_found) {
      i++;
    } else {
      removed_player = players.splice(i, 1);
      scene.remove(removed_player[0].model);
      delete removed_player[0];
    }
  }
}

// game loop
function tick() {
  "use strict";
  var i;
  if (local_shared_state && local_participants && ($("#hangoutdisco")) && camera && scene && renderer) {
    update_shared_state(false);
    check_participants();
    if (players[0]) {
      players[0].handle_keys(kbd);
    }
    animate();
    renderer.render(scene, camera);

    $("#hangoutdisco_debug").html("");
    if (DEBUGMODE) {
      for (i in local_shared_state) {
        if (local_shared_state.hasOwnProperty(i)) {
          $("#hangoutdisco_debug").append(i + ": " + local_shared_state[i] + "<br>");
        }
      }
    }
  }
  window.requestAnimationFrame(tick);
}

Date.prototype.yyyymmddhhmmss = function () {
  "use strict";
  var y, m, d, h, min, sec;
  y = this.getFullYear().toString();
  m = (this.getMonth() + 1).toString();
  d  = this.getDate().toString();
  h = this.getHours().toString();
  min = this.getMinutes().toString();
  sec = this.getSeconds().toString();
  return y + (m[1] ? m : "0" + m[0]) + (d[1] ? d : "0" + d[0]) + (h[1] ? h : "0" + h[0]) + (min[1] ? min : "0" + min[0]) + (sec[1] ? sec : "0" + sec[0]);
};

function initialize_app() {
  "use strict";
  var colors, i, room_material, floor, tmp_light, ceiling, wall_material, wall, loader;
  WEBGL_SUPPORT = !!window.WebGLRenderingContext;

  // initialize WebGL
  if (WEBGL_SUPPORT) {
    try {
      renderer = new THREE.WebGLRenderer({preserveDrawingBuffer: true});
      renderer.setSize(500, 350);
      renderer.setClearColorHex(0, 1);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, 500 / 350, 0.1, 10000);
      scene.add(camera);

      colors = [0x3333FF, 0xFFFF33, 0x33FF33, 0xFF3333];

      for (i = 0; i < 4; i++) {
        tmp_light = new THREE.PointLight(colors[i]);
        tmp_light.position.x = ((i % 2 == 0) ? 1 : -1) * (ROOM_WIDTH / 4);
        tmp_light.position.y = ROOM_FLOOR + ROOM_HEIGHT * 0.3;
        tmp_light.position.z = ((i < 2) ? 1 : -1) * (ROOM_WIDTH / 4);
        lights.push(tmp_light);
      }

      for (i = 0; i < 4; i++) {
        scene.add(lights[i]);
        lights[i].dir = Math.random() * ROT_360 - ROT_180;
        lights[i].speed = 0.5;
        lights[i].intensity = 2;
      }

      room_material = new THREE.MeshLambertMaterial({color: 0xCCCCCC});
      floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_WIDTH, 50, 50), room_material);
      floor.rotation.x = -ROT_90;
      floor.position.y = ROOM_FLOOR;
      scene.add(floor);

      ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_WIDTH, 50, 50), room_material);
      ceiling.rotation.x = ROT_90;
      ceiling.position.y = ROOM_FLOOR + ROOM_HEIGHT;
      scene.add(ceiling);

      wall_material = new THREE.MeshLambertMaterial({color: 0x222222});
      for (i = 0; i < 4; i++) {
        wall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT, 50, 10), wall_material);
        wall.rotation.y = Math.PI * i / 2;
        wall.position.x = (i == 3) ? ROOM_WIDTH / 2 : ((i == 1) ? -ROOM_WIDTH / 2 : 0);
        wall.position.y = ROOM_FLOOR + ROOM_HEIGHT / 2;
        wall.position.z = (i == 2) ? ROOM_WIDTH / 2 : ((i == 0) ? -ROOM_WIDTH / 2 : 0);
        scene.add(wall);
      }
    } catch (e) {
      console.log(e.message);
      WEBGL_SUPPORT = false;
    }
  }
  $("body").html("<div id=\"hangoutdisco\"></div>");
  if (WEBGL_SUPPORT) {
    $("#hangoutdisco").append("<div id=\"hangoutdisco_main\" style=\"float:left;\"></div>");
    $("#hangoutdisco_main").append(renderer.domElement);
    $("#hangoutdisco").append("<div id=\"hangoutdisco_screenshot\" style=\"float:left; padding:2px; margin:2px;\"></div>");
    $("#hangoutdisco").append("<div id=\"hangoutdisco_avatar\" style=\"border:1px solid black; float:left; padding:5px; margin:2px; text-align: right;\"></div>");
    $("#hangoutdisco").append("<div id=\"hangoutdisco_music\" style=\"border:1px solid black; float:left; padding:5px; margin:2px;\"></div>");
    $("#hangoutdisco").append("<div id=\"hangoutdisco_controls\" style=\"border:1px solid black; float:left; padding:5px; margin:2px;\"></div>");
    $("#hangoutdisco").append("<div id=\"hangoutdisco_debug\" style=\"float:left; padding:5px;\"></div>");

    $("#hangoutdisco_screenshot").append("<img id=\"img_screenshot\" src=\"" + HOST + "images/screenshot\" style=\"border: 0px; margin: 0px; padding: 0px;\"><br>");
    $("#hangoutdisco_screenshot").append("<div id=\"current_screenshot\"></div>");

    $("#img_screenshot").click(function () {
      var dataUrl = renderer.domElement.toDataURL("image/png");
      $("#current_screenshot").html("");
      $("#current_screenshot").append("<img src=\"" + dataUrl + "\" style=\"border: 1px solid black; max-width:300px\"><br>");
      $("#current_screenshot").append("<a download=\"hangoutdisco_" + (new Date()).yyyymmddhhmmss() + ".png\" href=\"" + dataUrl + "\">Download</a> / ");
      $("#current_screenshot").append("<a href=\"#\" onclick=\"$('#current_screenshot').html(''); return false;\">Remove</a>");
    });
    
    $("#hangoutdisco_avatar").append("<b>Avatar settings</b><br>");
    $("#hangoutdisco_avatar").append("R <input type=\"range\" min=\"0\" max=\"100\" value=\"100\" id=\"hangoutdisco_avatar_color_r\" onchange=\"change_avatar();\" style=\"width:50px;\"><br>");
    $("#hangoutdisco_avatar").append("G <input type=\"range\" min=\"0\" max=\"100\" value=\"100\" id=\"hangoutdisco_avatar_color_g\" onchange=\"change_avatar();\" style=\"width:50px;\"><br>");
    $("#hangoutdisco_avatar").append("B <input type=\"range\" min=\"0\" max=\"100\" value=\"100\" id=\"hangoutdisco_avatar_color_b\" onchange=\"change_avatar();\" style=\"width:50px;\"><br>");
    $("#hangoutdisco_avatar").append("Height <input type=\"range\" min=\"0\" max=\"100\" value=\"50\" id=\"hangoutdisco_avatar_height\" onchange=\"change_avatar();\" style=\"width:50px;\"><br>");
    $("#hangoutdisco_avatar").append("Width <input type=\"range\" min=\"0\" max=\"100\" value=\"50\" id=\"hangoutdisco_avatar_width\" onchange=\"change_avatar();\" style=\"width:50px;\"><br>");
    $("#hangoutdisco_avatar").append("Partyhat <input type=\"checkbox\" id=\"hangoutdisco_avatar_partyhat\"><br>");
    $("#hangoutdisco_avatar_partyhat").click(function () {
      change_avatar();
    });

    $("#hangoutdisco_controls").append("3rd person view <input type=\"checkbox\" id=\"hangoutdisco_control_third_person\" checked=\"checked\"/><br>");
    $("#hangoutdisco_control_third_person").click(function () {
      THIRD_PERSON = ($("#hangoutdisco_control_third_person:checked").val() != undefined);
    });
    $("#hangoutdisco_controls").append("Smooth transitions <input type=\"checkbox\" id=\"hangoutdisco_control_smooth\" checked=\"checked\" /><br>");
    $("#hangoutdisco_control_smooth").click(function () {
      SMOOTH = ($("#hangoutdisco_control_smooth:checked").val() != undefined);
    });
    $("#hangoutdisco_controls").append("No collisions <input type=\"checkbox\" id=\"hangoutdisco_control_noclip\" /><br>");
    $("#hangoutdisco_control_noclip").click(function () {
      NOCLIP = ($("#hangoutdisco_control_noclip:checked").val() != undefined);
    });
    $("#hangoutdisco_controls").append("Debug mode <input type=\"checkbox\" id=\"hangoutdisco_control_debug\" /><br>");
    $("#hangoutdisco_control_debug").click(function () {
      DEBUGMODE = ($("#hangoutdisco_control_debug:checked").val() != undefined);
    });
    $("#hangoutdisco_controls").append("Fast updates <input type=\"checkbox\" id=\"hangoutdisco_control_fast\" /><br>");
    $("#hangoutdisco_control_fast").click(function () {
      FASTUPDATES = ($("#hangoutdisco_control_fast:checked").val() != undefined);
    });

    initialize_audio();

    loader = new THREE.JSONLoader();
    loader.load(HOST + "models/android_body.js", function (geometry) {
      android_geometry.body = geometry;
      android_geometry.body.computeFaceNormals();
      android_geometry.body.computeVertexNormals();

      var loader = new THREE.JSONLoader();
      loader.load(HOST + "models/android_arm.js", function (geometry) {
        android_geometry.arm = geometry;
        android_geometry.arm.computeFaceNormals();
        android_geometry.arm.computeVertexNormals();

        var loader = new THREE.JSONLoader();
        loader.load(HOST + "models/android_leg_v2.js", function (geometry) {
          android_geometry.leg = geometry;
          android_geometry.leg.computeFaceNormals();
          android_geometry.leg.computeVertexNormals();

          var loader = new THREE.JSONLoader();
          loader.load(HOST + "models/android_head.js", function (geometry) {
            android_geometry.head = geometry;
            android_geometry.head.computeFaceNormals();
            android_geometry.head.computeVertexNormals();

            var loader = new THREE.JSONLoader();
            loader.load(HOST + "models/android_eyes.js", function (geometry) {
              android_geometry.eyes = geometry;
              android_geometry.eyes.computeFaceNormals();
              android_geometry.eyes.computeVertexNormals();

              var loader = new THREE.JSONLoader();
              loader.load(HOST + "models/partyhat.js", function (geometry) {
                android_geometry.partyhat = geometry;
                android_geometry.partyhat.computeFaceNormals();
                android_geometry.partyhat.computeVertexNormals();
                initialize_player();
                update_shared_state(true);
                tick();
              });
            });
          });
        });
      });
    });
  } else {
    $("#hangoutdisco").append("Unfortunately WebGL isn't supported by your browser. Please update to a modern browser.");
  }
}

// let's get this party started
(function () {
  "use strict";
  if (gapi && gapi.hangout) {
    var initHangout = function (apiInitEvent) {
      if (apiInitEvent.isApiReady) {
        gapi.hangout.onParticipantsChanged.add(function (partChangeEvent) {
          local_participants = gapi.hangout.getParticipants();
        });
        if (!local_shared_state) {
          local_shared_state = gapi.hangout.data.getState();
        }
        if (!local_participants) {
          local_participants = gapi.hangout.getParticipants();
        }
        initialize_app();
        gapi.hangout.onApiReady.remove(initHangout);
      }
    };
    gapi.hangout.onApiReady.add(initHangout);
  }
}());

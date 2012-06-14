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

/*global $: false, Keyboard_handler: false, BeatDetektor: false, HOST: false, Uint8Array: false, THREE: false*/

 // Flags that can be set via the checkboxes

(function (global) {
  "use strict";
  var
    NOCLIP = false,
    SHOW_EGGS = false,
    FACE_TRACKING = false,
    eggs = [],
    WEBGL_SUPPORT = false,
    ROOM_WIDTH = 1000,
    ROOM_HEIGHT = 150,
    ROOM_FLOOR = 0,
    ROOM_MAX = ROOM_WIDTH / 2 + 25,
    ROOM_MIN = -ROOM_MAX,
    renderer,
    scene,
    camera,
    lights = [],
    android_geometry = {},
    last_tick = 0,
    PLAYER_SPEED = 0.08,
    ROT_SPEED = 0.002,
    PITCH_SPEED = 0.002,
    kbd = new Keyboard_handler(global.document),
    ROT_30 = Math.PI / 6,
    ROT_90 = Math.PI / 2,
    ROT_180 = Math.PI,
    ROT_270 = Math.PI * 1.5,
    ROT_360 = Math.PI * 2,
    music,
    players = [];

  function player_id() {
    return global.gapi.hangout.getParticipantId();
  }

  // ------------------------------------------------------------------------------------------
  // Animations

  function Animation(k, n, s, l, f) {
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
      beat = 0.5,
      intensity = [2, 2, 2, 2];

    AUDIO_SUPPORT = true;
    if (global.AudioContext) {
      audio_context = new global.AudioContext();
    } else {
      if (global.webkitAudioContext) {
        audio_context = new global.webkitAudioContext();
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
      var request = new global.XMLHttpRequest();
      request.open("GET", songs[s_nr].mp3, true);
      request.responseType = "arraybuffer";
      request.onload = function () {
        audio_context.decodeAudioData(request.response, function (buffer) {
          songs[s_nr].buffer = buffer;
          callback(s_nr);
        }, function () {
          global.console.log("Error decoding: " + songs[s_nr].mp3);
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

  function initialize_audio() {
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
      $("#hangoutdisco_music").append("Volume <input type=\"range\" min=\"0\" max=\"100\" value=\"100\" id=\"hangoutdisco_control_volume\" disabled=\"true\" /><br>");
      $("#hangoutdisco_control_volume").change(function () {
        var fraction;
        if (music) {
          fraction = parseInt(this.value, 10) / parseInt(this.max, 10);
          music.change_volume(fraction);
        }
      });
      for (i = 0; i < songs.length; i++) {
        $("#hangoutdisco_music").append("<input type=\"radio\" name=\"song\" value=\"" + i + "\" id=\"song" + i + "\" " + (i === 0 ? "checked=\"checked\"" : "") + " disabled=\"true\"> <a href=\"" + songs[i].song_link + "\" target=\"blank\">" + songs[i].song_title + " by " + songs[i].song_author + "</a><br>");
      }
      $("input[name='song']:radio").change(function () {
        for (i = 0; i < songs.length; i++) {
          if ($("#song" + i + ":checked").val()) {
            if (i !== music.get_current_song()) {
              music.set_current_song(i);
              if ($("#hangoutdisco_control_music:checked").val()) {
                music.start_music();
              }
            }
          }
        }
      });
      $("#hangoutdisco_control_music").click(function () {
        if ($("#hangoutdisco_control_music:checked").val()) {
          music.start_music();
        } else {
          music.stop_music();
        }
      });

      cb = function (s_nr) {
        if (s_nr === 0) {
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

  // Player object
  function Player(p_id, x, y, z, p_rot, p_pitch, p_col, p_s_width, p_s_height, ph) {
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
      chk_partyhat = ph,
      face_pan = 0,
      face_tilt = 0,
      calibrate_pan = 0,
      calibrate_tilt = 0,
      chk_facetracking = false;

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
    p = global.gapi.hangout.getParticipantById(id);
    if (p.person.image) {
      tmp_img = p.person.image.url;
      tmp_img = tmp_img.replace("s96-c", "s256-c");
      tmp_img = tmp_img.replace("?sz=50", "");
      tmp_img += "?sz=256";
    }
    profile_material = player_material;
    if (tmp_img !== "") {
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
      switch (s) {
      case "x":
        pos_new.x = v;
        break;
      case "z":
        pos_new.z = v;
        break;
      case "rot":
        rot_new = v;
        break;
      case "pitch":
        pitch_new = v;
        break;
      case "col":
        col_new.setHex(v);
        break;
      case "s_width":
        scale_width_new = v;
        break;
      case "s_height":
        scale_height_new = v;
        break;
      case "partyhat":
        chk_partyhat = v;
        model.partyhat.visible = chk_partyhat;
        break;
      default:
        if (s.substr(0, 4) === "ani_") {
          for (i = 0; i < animations.length; i++) {
            if (animations[i].share_name === s.substr(4)) {
              animations[i].set_count_new(v);
              break;
            }
          }
        }
      }
    }

    function animate(elapsed) {
      var chk_moving, dif_x, dif_z, dif, rot2, i, test_x, test_z, first_cycle, new_material, phi, phi2, theta, target_x, target_y, target_z, pitch2;

      chk_moving = false;
      if (id === player_id()) {
        // real animation based on speed values
        dif_x = 0;
        dif_z = 0;
        if (speed !== 0) {
          dif = speed * elapsed;
          dif_x -= Math.sin(rot) * dif;
          dif_z -= Math.cos(rot) * dif;
        }
        if (strafe !== 0) {
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
        chk_moving = (dif_x !== 0 || dif_z !== 0);
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
        pos.x = pos_new.x;
        pos.y = pos_new.y;
        pos.z = pos_new.z;
        rot = rot_new;
        pitch = pitch_new;
        scale_width = scale_width_new;
        scale_height = scale_height_new;
      }

      // jogging animation
      if (chk_moving) {
        jogging_angle += elapsed * 0.009;
        if (jogging_angle > ROT_360) {
          jogging_angle -= ROT_360;
        }
      } else {
        if (jogging_angle !== 0) {
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

      if (col.r !== col_new.r || col.g !== col_new.g || col.b !== col_new.b) {
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
      if (global.gapi.hangout.av.getParticipantVolume(id)) {
        dif = global.gapi.hangout.av.getParticipantVolume(id);
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
      var i, dif_pan, dif_tilt, dif_dist;

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

      if (chk_facetracking) {
        dif_pan = face_pan - calibrate_pan;
        dif_tilt = face_tilt - calibrate_tilt;
        if (dif_pan > -0.2 && dif_pan < 0.2) { dif_pan = 0; }
        if (dif_tilt > -0.1 && dif_tilt < 0.1) { dif_tilt = 0; }
        if (dif_pan !== 0) {
          rot_rate = dif_pan * 2 * ROT_SPEED;
        }
        if (dif_tilt !== 0) {
          pitch_rate = dif_tilt * 2 * PITCH_SPEED;
        }
      }
    }

    function setFaceTrackingData(data) {
      if (data.hasFace) {
        face_pan = data.pan;
        face_tilt = data.tilt;
      } else {
        face_pan = calibrate_pan;
        face_tilt = calibrate_tilt;
      }
    }

    function startFaceTracking() {
      chk_facetracking = true;
      calibrate_pan = face_pan;
      calibrate_tilt = face_tilt;
    }

    function stopFaceTracking() {
      chk_facetracking = false;
    }

    return {
      get_id: function () { return id; },
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
      handle_keys: handle_keys,
      setFaceTrackingData: setFaceTrackingData,
      startFaceTracking: startFaceTracking,
      stopFaceTracking: stopFaceTracking
    };
  }
  // ------------------------------------------------------------------------------------------

  function change_avatar() {
    var r, g, b, h, w, ph;
    if (players[0]) {
      r = $("#hangoutdisco_avatar_color_r").val() / 100;
      g = $("#hangoutdisco_avatar_color_g").val() / 100;
      b = $("#hangoutdisco_avatar_color_b").val() / 100;
      h = 1.0 + ($("#hangoutdisco_avatar_height").val() - 50) / 100;
      w = 1.0 + ($("#hangoutdisco_avatar_width").val() - 50) / 100;
      ph = !!($("#hangoutdisco_avatar_partyhat:checked").val());
      players[0].set_color(r, g, b);
      players[0].set_scale(h, w);
      players[0].set_partyhat(ph);
    }
  }

  function initialize_player() {
    var
      x = Math.random() * ROOM_WIDTH - ROOM_WIDTH / 2,
      y = 0,
      z = Math.random() * ROOM_WIDTH - ROOM_WIDTH / 2,
      col = Math.floor(((Math.random() * 100 + 155) * 256 + (Math.random() * 100 + 155)) * 256 + (Math.random() * 100 + 155));

    players[0] = new Player(player_id(), x, y, z, 0, 0, col, 1, 1, false);
    scene.add(players[0].model);
    $("#hangoutdisco_avatar_color_r").val(Math.floor(players[0].get_col().r * 100));
    $("#hangoutdisco_avatar_color_g").val(Math.floor(players[0].get_col().g * 100));
    $("#hangoutdisco_avatar_color_b").val(Math.floor(players[0].get_col().b * 100));
  }

  function send_state() {
    var message, this_player, i, l;
    message = {};
    this_player = players[0];
    message.col = this_player.get_col().getHex().toString();
    message.x = Math.floor(this_player.get_pos().x);
    message.z = Math.floor(this_player.get_pos().z);
    message.pitch = this_player.get_pitch();
    message.rot = this_player.get_rot();
    message.s_width = this_player.get_scale_width();
    message.s_height = this_player.get_scale_height();
    message.partyhat = this_player.get_partyhat();
    l = this_player.animations.length;
    for (i = 0; i < l; i++) {
      message["ani_" + this_player.animations[i].share_name] = this_player.animations[i].get_count();
    }
    global.gapi.hangout.data.sendMessage(JSON.stringify(message));
  }

  function animate() {
    var this_tick, elapsed, i, l, this_player, phi, theta, theta2, target_x, target_y, target_z, dif_x, dif_z;
    this_tick = new Date().getTime();
    if (last_tick !== 0) {
      elapsed = this_tick - last_tick;
      l = players.length;
      for (i = 0; i < l; i++) {
        players[i].animate(elapsed);
      }

      //camera
      this_player = players[0];
      phi = ROT_90 - this_player.get_pitch();
      theta = this_player.get_rot();
      theta2 = theta + ROT_90;

      this_player.set_display(true);
      camera.position.x = this_player.get_pos().x + 150 * Math.sin(theta);
      camera.position.y = 60;
      camera.position.z = this_player.get_pos().z + 150 * Math.cos(theta);
      camera.position.x += 25 * Math.sin(theta2);
      camera.position.z += 25 * Math.cos(theta2);
      camera.position.x = Math.max(-ROOM_WIDTH / 2 + 1, Math.min(ROOM_WIDTH / 2 - 1, camera.position.x));
      camera.position.z = Math.max(-ROOM_WIDTH / 2 + 1, Math.min(ROOM_WIDTH / 2 - 1, camera.position.z));

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
        if (lights[i].speed !== 0) {
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

  // game loop
  function tick() {
    if (($("#hangoutdisco")) && camera && scene && renderer) {
      send_state();
      if (players[0]) {
        players[0].handle_keys(kbd);
      }
      animate();
      renderer.render(scene, camera);
    }
    global.requestAnimationFrame(tick);
  }

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

  function show_eggs() {
    var i, l;
    l = eggs.length;
    for (i = 0; i < l; i++) {
      eggs[i].visible = SHOW_EGGS;
    }
  }

  function initialize_eggs() {
    var i, egg_material, tmp_egg, egg_col, tmp_scale;

    for (i = 0; i < 13; i++) {
      egg_col = new THREE.Color(Math.floor(((Math.random() * 100 + 155) * 256 + (Math.random() * 100 + 155)) * 256 + (Math.random() * 100 + 155)));
      egg_material = new THREE.MeshLambertMaterial({ color: egg_col.getHex(), shading: THREE.SmoothShading });
      tmp_egg = new THREE.Mesh(android_geometry.egg, egg_material);
      tmp_egg.position.x = Math.random() * ROOM_WIDTH - ROOM_WIDTH / 2;
      tmp_egg.position.y = 0;
      tmp_egg.position.z = Math.random() * ROOM_WIDTH - ROOM_WIDTH / 2;
      tmp_scale = Math.random() * 2 + 1;
      tmp_egg.scale.x = tmp_scale;
      tmp_egg.scale.y = tmp_scale;
      tmp_egg.scale.z = tmp_scale;
      tmp_egg.visible = false;
      eggs.push(tmp_egg);
      scene.add(eggs[i]);
    }
  }

  function onMessageReceived(event) {
    var key, message, sender, i, l, player, x, z, rot, pitch, col, s_width, s_height, ph, count;
    sender = event.senderId;
    if (sender === player_id()) {
      return;
    }
    try {
      message = JSON.parse(event.message);
    } catch (e) {
      global.console.log("Invalid message: " + event.message);
      message = {};
    }
    l = players.length;
    for (i = 1; i < l; i++) {
      if (players[i].get_id() === sender) {
        player = players[i];
        break;
      }
    }
    if (player) {
      for (key in message) {
        if (message.hasOwnProperty(key)) {
          player.set_state(key, message[key]);
        }
      }
    } else {
      // new player
      x = message.x || 0;
      z = message.z || 0;
      rot = message.rot || 0;
      pitch = message.pitch || 0;
      col = message.col || 0;
      s_width = message.s_width || 0;
      s_height = message.s_height || 0;
      ph = message.partyhat || false;
      player = new Player(sender, x, 0, z, rot, pitch, col, s_width, s_height, ph);
      l = player.animations.length;
      for (i = 0; i < l; i++) {
        count = message["ani_" + player.animations[i].share_name] || 0;
        player.animations[i].set_count(count);
      }
      scene.add(player.model);
      players.push(player);
    }
  }

  function removeParticipants(event) {
    var i, l, remove, i1, l1, removed_player;
    remove = event.disabledParticipants || event.removedParticipants || [];
    l = remove.length;
    for (i = 0; i < l; i++) {
      l1 = players.length;
      for (i1 = 1; i1 < l1; i1++) {
        if (remove[i].id === players[i1].get_id()) {
          removed_player = players.splice(i1, 1);
          scene.remove(removed_player[0].model);
          delete removed_player[0];
          break;
        }
      }
    }
  }

  function initialize_app() {
    var colors, i, room_material, floor, tmp_light, ceiling, wall_material, wall, loader;
    WEBGL_SUPPORT = !!global.WebGLRenderingContext;

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
          tmp_light.position.x = ((i % 2 === 0) ? 1 : -1) * (ROOM_WIDTH / 4);
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
          wall.position.x = (i === 3) ? ROOM_WIDTH / 2 : ((i === 1) ? -ROOM_WIDTH / 2 : 0);
          wall.position.y = ROOM_FLOOR + ROOM_HEIGHT / 2;
          wall.position.z = (i === 2) ? ROOM_WIDTH / 2 : ((i === 0) ? -ROOM_WIDTH / 2 : 0);
          scene.add(wall);
        }
      } catch (e) {
        global.console.log(e.message);
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
      $("#hangoutdisco_avatar").append("R <input type=\"range\" min=\"0\" max=\"100\" value=\"100\" id=\"hangoutdisco_avatar_color_r\" style=\"width:50px;\"><br>");
      $("#hangoutdisco_avatar").append("G <input type=\"range\" min=\"0\" max=\"100\" value=\"100\" id=\"hangoutdisco_avatar_color_g\" style=\"width:50px;\"><br>");
      $("#hangoutdisco_avatar").append("B <input type=\"range\" min=\"0\" max=\"100\" value=\"100\" id=\"hangoutdisco_avatar_color_b\" style=\"width:50px;\"><br>");
      $("#hangoutdisco_avatar").append("Height <input type=\"range\" min=\"0\" max=\"100\" value=\"50\" id=\"hangoutdisco_avatar_height\" style=\"width:50px;\"><br>");
      $("#hangoutdisco_avatar").append("Width <input type=\"range\" min=\"0\" max=\"100\" value=\"50\" id=\"hangoutdisco_avatar_width\" style=\"width:50px;\"><br>");
      $("#hangoutdisco_avatar").append("Partyhat <input type=\"checkbox\" id=\"hangoutdisco_avatar_partyhat\"><br>");
      $("#hangoutdisco_avatar_color_r").change(change_avatar);
      $("#hangoutdisco_avatar_color_g").change(change_avatar);
      $("#hangoutdisco_avatar_color_b").change(change_avatar);
      $("#hangoutdisco_avatar_height").change(change_avatar);
      $("#hangoutdisco_avatar_width").change(change_avatar);
      $("#hangoutdisco_avatar_partyhat").click(change_avatar);


      $("#hangoutdisco_controls").append("Face tracking <input type=\"checkbox\" id=\"hangoutdisco_control_facetracking\" /><br>");
      $("#hangoutdisco_control_facetracking").click(function () {
        FACE_TRACKING = !!($("#hangoutdisco_control_facetracking:checked").val());
        if (players[0]) {
          if (FACE_TRACKING) {
            players[0].startFaceTracking();
          } else {
            players[0].stopFaceTracking();
          }
        }
      });
      $("#hangoutdisco_controls").append("No collisions <input type=\"checkbox\" id=\"hangoutdisco_control_noclip\" /><br>");
      $("#hangoutdisco_control_noclip").click(function () {
        NOCLIP = !!($("#hangoutdisco_control_noclip:checked").val());
      });
      $("#hangoutdisco_controls").append("Easter eggs <input type=\"checkbox\" id=\"hangoutdisco_control_eggs\" /><br>");
      $("#hangoutdisco_control_eggs").click(function () {
        SHOW_EGGS = !!($("#hangoutdisco_control_eggs:checked").val());
        show_eggs();
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

                  var loader = new THREE.JSONLoader();
                  loader.load(HOST + "models/egg.js?v=1.1", function (geometry) {
                    android_geometry.egg = geometry;
                    android_geometry.egg.computeFaceNormals();
                    android_geometry.egg.computeVertexNormals();
                    initialize_eggs();
                    initialize_player();
                    global.gapi.hangout.data.onMessageReceived.add(onMessageReceived);
                    global.gapi.hangout.onParticipantsDisabled.add(removeParticipants);
                    global.gapi.hangout.onParticipantsRemoved.add(removeParticipants);
                    global.gapi.hangout.av.effects.onFaceTrackingDataChanged.add(function (eventObj) {
                      if (players[0]) {
                        players[0].setFaceTrackingData(eventObj);
                      }
                    });
                    tick();
                  });
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
  if (global.gapi && global.gapi.hangout) {
    global.gapi.hangout.onApiReady.add(function (event) {
      if (event.isApiReady) {
        initialize_app();
      }
    });
  }
}(this));
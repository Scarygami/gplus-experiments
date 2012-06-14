/*
 * Hangout Band (c) 2012 by Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
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


(function (window) {
  "use strict";
  var
    audio,
    hangout_band,
    base_url = "<YOUR PATH>",
    chords = {},
    keys = {},
    notes = {};

  chords.guitar_a = [-100, -100, 2, 2, 2, -100, -100];
  chords.guitar_am = [-100, -100, 1, 2, 2, -100, -100];
  chords.guitar_bb = [1, -100, 3, 3, 3, -100, -100];
  chords.guitar_bbm = [1, -100, 2, 3, 3, -100, -100];
  chords.guitar_b = [2, -100, 4, 4, 4, -100, -100];
  chords.guitar_bm = [2, -100, 3, 4, 4, -100, -100];
  chords.guitar_c = [-100, -100, 1, -100, 2, 3, -100];
  chords.guitar_cm = [3, -100, 4, 5, 5, -100, -100];
  chords.guitar_db = [4, -100, 6, 6, 6, -100, -100];
  chords.guitar_dbm = [4, -100, 5, 6, 6, -100, -100];
  chords.guitar_d = [-100, 2, 3, 2, -100, -100, -100];
  chords.guitar_dm = [-100, 1, 3, 2, -100, -100, -100];
  chords.guitar_eb = [6, -100, 8, 8, 8, -100, -100];
  chords.guitar_ebm = [6, -100, 7, 8, 8, -100, -100];
  chords.guitar_e = [-100, -100, -100, 1, 2, 2, -100];
  chords.guitar_em = [-100, -100, -100, -100, 2, 2, -100];
  chords.guitar_f = [1, -100, -100, 2, 3, 3, -100];
  chords.guitar_fm = [1, -100, -100, -100, 3, 3, -100];
  chords.guitar_gb = [2, -100, -100, 3, 4, 4, -100];
  chords.guitar_gbm = [2, -100, -100, -100, 4, 4, -100];
  chords.guitar_g = [-100, 3, -100, -100, -100, 2, 3];
  chords.guitar_gm = [3, -100, -100, -100, 5, 5, -100];
  chords.guitar_ab = [4, -100, -100, 5, 6, 6, -100];
  chords.guitar_abm = [4, -100, -100, -100, 6, 6, -100];

  keys.A = ["drum_bass", "piano_c", "guitar_c"];
  keys.W = ["drum_snare3", "piano_db", "guitar_db"];
  keys.S = ["drum_snare5", "piano_d", "guitar_d"];
  keys.E = ["drum_snare1", "piano_eb", "guitar_eb"];
  keys.D = ["drum_snare2", "piano_e", "guitar_e"];
  keys.F = ["drum_snare4", "piano_f", "guitar_f"];
  keys.T = ["drum_cymbal1", "piano_gb", "guitar_gb"];
  keys.G = ["drum_cymbal2", "piano_g", "guitar_g"];
  keys.Y = ["drum_cymbal3", "piano_ab", "guitar_ab"];
  keys.Z = ["drum_cymbal3", "piano_ab", "guitar_ab"];
  keys.H = ["drum_cymbal4", "piano_a", "guitar_a"];
  keys.U = ["drum_cymbal6", "piano_bb", "guitar_bb"];
  keys.J = ["drum_cymbal5", "piano_b", "guitar_b"];
  keys.K = ["drum_hihat", "piano_c", "guitar_c"];

  notes.piano_c3 = ["score_part_fclef", 0, ["note_up"]];
  notes.piano_db3 = ["score_part_fclef", 0, ["note_up_sharp"]];
  notes.piano_d3 = ["score_part_fclef", -3, ["note_up"]];
  notes.piano_eb3 = ["score_part_fclef", 10, ["note_down_flat"]];
  notes.piano_e3 = ["score_part_fclef", 10, ["note_down"]];
  notes.piano_f3 = ["score_part_fclef", 7, ["note_down"]];
  notes.piano_gb3 = ["score_part_fclef", 7, ["note_down_sharp"]];
  notes.piano_g3 = ["score_part_fclef", 5, ["note_down"]];
  notes.piano_ab3 = ["score_part_fclef", 5, ["note_down_sharp"]];
  notes.piano_a3 = ["score_part_fclef", 2, ["note_down"]];
  notes.piano_bb3 = ["score_part_fclef", 0, ["note_down_flat"]];
  notes.piano_b3 = ["score_part_fclef", 0, ["note_down"]];

  notes.piano_c4 = ["score_part_gclef", 12, ["note_up_slash1", "note_up"]];
  notes.piano_db4 = ["score_part_gclef", 12, ["note_up_slash1", "note_up_sharp"]];
  notes.piano_d4 = ["score_part_gclef", 10, ["note_up"]];
  notes.piano_eb4 = ["score_part_gclef", 7, ["note_up_flat"]];
  notes.piano_e4 = ["score_part_gclef", 7, ["note_up"]];
  notes.piano_f4 = ["score_part_gclef", 5, ["note_up"]];
  notes.piano_gb4 = ["score_part_gclef", 5, ["note_up_sharp"]];
  notes.piano_g4 = ["score_part_gclef", 2, ["note_up"]];
  notes.piano_ab4 = ["score_part_gclef", 2, ["note_up_sharp"]];
  notes.piano_a4 = ["score_part_gclef", 0, ["note_up"]];
  notes.piano_bb4 = ["score_part_gclef", -3, ["note_up_flat"]];
  notes.piano_b4 = ["score_part_gclef", -3, ["note_up"]];

  notes.piano_c5 = ["score_part_gclef", 10, ["note_down"]];
  notes.piano_db5 = ["score_part_gclef", 10, ["note_down_sharp"]];
  notes.piano_d5 = ["score_part_gclef", 7, ["note_down"]];
  notes.piano_eb5 = ["score_part_gclef", 5, ["note_down_flat"]];
  notes.piano_e5 = ["score_part_gclef", 5, ["note_down"]];
  notes.piano_f5 = ["score_part_gclef", 2, ["note_down"]];
  notes.piano_gb5 = ["score_part_gclef", 2, ["note_down_sharp"]];
  notes.piano_g5 = ["score_part_gclef", 0, ["note_down"]];
  notes.piano_ab5 = ["score_part_gclef", 0, ["note_down_sharp"]];
  notes.piano_a5 = ["score_part_gclef", -3, ["note_down_slash1", "note_down"]];
  notes.piano_bb5 = ["score_part_gclef", -5, ["note_down_slash2", "note_down_flat"]];
  notes.piano_b5 = ["score_part_gclef", -5, ["note_down_slash2", "note_down"]];

  notes.piano_c6 = ["score_part_gclef", -8, ["note_down_slash1", "note_down_slash3", "note_down"]];

  notes.drum_bass = ["score_part_drums", 12, ["note_up_slash1", "note_up"]];
  notes.drum_snare1 = ["score_part_drums", 10, ["note_up"]];
  notes.drum_snare2 = ["score_part_drums", 7, ["note_up"]];
  notes.drum_snare3 = ["score_part_drums", 5, ["note_up"]];
  notes.drum_snare4 = ["score_part_drums", 2, ["note_up"]];
  notes.drum_snare5 = ["score_part_drums", 0, ["note_up"]];
  notes.drum_cymbal1 = ["score_part_drums", -3, ["drum_up"]];
  notes.drum_cymbal2 = ["score_part_drums", 10, ["drum_down"]];
  notes.drum_cymbal3 = ["score_part_drums", 7, ["drum_down"]];
  notes.drum_cymbal4 = ["score_part_drums", 5, ["drum_down"]];
  notes.drum_cymbal5 = ["score_part_drums", 2, ["drum_down"]];
  notes.drum_cymbal6 = ["score_part_drums", 0, ["drum_down"]];
  notes.drum_hihat = ["score_part_drums", -3, ["drum_down_slash", "drum_down"]];

  notes.guitar_c = ["score_part_guitar", 0, ["guitar_chord"], "C"];
  notes.guitar_cm = ["score_part_guitar", 0, ["guitar_chord"], "c"];
  notes.guitar_db = ["score_part_guitar", 0, ["guitar_chord"], "C#"];
  notes.guitar_dbm = ["score_part_guitar", 0, ["guitar_chord"], "c#"];
  notes.guitar_d = ["score_part_guitar", 0, ["guitar_chord"], "D"];
  notes.guitar_dm = ["score_part_guitar", 0, ["guitar_chord"], "d"];
  notes.guitar_eb = ["score_part_guitar", 0, ["guitar_chord"], "Eb"];
  notes.guitar_ebm = ["score_part_guitar", 0, ["guitar_chord"], "eb"];
  notes.guitar_e = ["score_part_guitar", 0, ["guitar_chord"], "E"];
  notes.guitar_em = ["score_part_guitar", 0, ["guitar_chord"], "e"];
  notes.guitar_f = ["score_part_guitar", 0, ["guitar_chord"], "F"];
  notes.guitar_fm = ["score_part_guitar", 0, ["guitar_chord"], "f"];
  notes.guitar_gb = ["score_part_guitar", 0, ["guitar_chord"], "F#"];
  notes.guitar_gbm = ["score_part_guitar", 0, ["guitar_chord"], "f#"];
  notes.guitar_g = ["score_part_guitar", 0, ["guitar_chord"], "G"];
  notes.guitar_gm = ["score_part_guitar", 0, ["guitar_chord"], "g"];
  notes.guitar_ab = ["score_part_guitar", 0, ["guitar_chord"], "G#"];
  notes.guitar_abm = ["score_part_guitar", 0, ["guitar_chord"], "g#"];
  notes.guitar_a = ["score_part_guitar", 0, ["guitar_chord"], "A"];
  notes.guitar_am = ["score_part_guitar", 0, ["guitar_chord"], "a"];
  notes.guitar_bb = ["score_part_guitar", 0, ["guitar_chord"], "Bb"];
  notes.guitar_bbm = ["score_part_guitar", 0, ["guitar_chord"], "bb"];
  notes.guitar_b = ["score_part_guitar", 0, ["guitar_chord"], "B"];
  notes.guitar_bm = ["score_part_guitar", 0, ["guitar_chord"], "b"];

  function WebAudio() {
    var audio_context, sounds = {}, gain_node_guitar, gain_node_drums, gain_node;

    this.AUDIO_SUPPORT = true;
    if (window.AudioContext) {
      audio_context = new window.AudioContext();
    } else {
      if (window.webkitAudioContext) {
        audio_context = new window.webkitAudioContext();
      } else {
        this.AUDIO_SUPPORT = false;
      }
    }

    if (this.AUDIO_SUPPORT) {
      gain_node = audio_context.createGainNode();
      gain_node.gain.value = 1.0;
      gain_node.connect(audio_context.destination);
      gain_node_guitar = audio_context.createGainNode();
      gain_node_guitar.gain.value = 0.5;
      gain_node_guitar.connect(gain_node);
      gain_node_drums = audio_context.createGainNode();
      gain_node_drums.gain.value = 0.8;
      gain_node_drums.connect(gain_node);
    }

    this.change_volume = function (v) {
      if (gain_node) {
        gain_node.gain.value = v * v;
      }
    };

    this.play_sound = function (nr) {
      var audio_source;
      if (sounds[nr] && sounds[nr].buffer) {
        audio_source = audio_context.createBufferSource();
        audio_source.buffer = sounds[nr].buffer;
        audio_source.loop = false;
        if (nr.substr(0, 6) == "guitar") {
          audio_source.connect(gain_node_guitar);
        } else {
          if (nr.substr(0, 4) == "drum") {
            audio_source.connect(gain_node_drums);
          } else {
            audio_source.connect(gain_node);
          }
        }
        audio_source.noteOn(0);
      }
    };

    this.load_sound = function (nr, callback) {
      sounds[nr] = {};
      sounds[nr].file = base_url + "sounds/" + nr + ".wav";
      sounds[nr].buffer = null;
      var request = new XMLHttpRequest();
      request.open("GET", sounds[nr].file, true);
      request.responseType = "arraybuffer";
      request.onload = function () {
        audio_context.decodeAudioData(request.response, function (buffer) {
          sounds[nr].buffer = buffer;
          callback(nr);
        }, function () {
          console.log("Error decoding: " + sounds[nr].file);
        });
      };
      request.send();
    };
  }

  function HangoutBand() {
    this.current_tab = 0;
    this.current_score_part = 1;
    this.current_score_pos = 30;
    this.last_chord = "";
    this.recording = false;
    this.start_recording = false;
    this.mute_others = false;
    this.play_private = false;
    this.last_time = 0;
    this.volume = 50;
    this.drums_loaded = 0;
    this.piano_loaded = 0;
    this.guitar_loaded = 0;
    this.drums_total = 13;
    this.guitar_total = 24;
    this.piano_total = 37;
    this.changing_volume = false;
    this.screenX = 0;
    this.screenY = 0;

    if (window.gapi) {
      window.gapi.hangout.onApiReady.add(this.onApiReady.bind(this));
    } else {
      this.initialize_app();
    }
  }

  HangoutBand.prototype.onApiReady = function (event) {
    if (event.isApiReady) {
      this.initialize_app();
      if (audio.AUDIO_SUPPORT) {
        window.gapi.hangout.data.onMessageReceived.add(this.onMessageReceived.bind(this));
        this.drums_image = gapi.hangout.av.effects.createImageResource(base_url + "images/drums.png").createOverlay();
        this.piano_image = gapi.hangout.av.effects.createImageResource(base_url + "images/piano.png").createOverlay();
        this.guitar_image = gapi.hangout.av.effects.createImageResource(base_url + "images/guitar.png").createOverlay();
        this.drums_image.setPosition(-0.35, -0.3);
        this.piano_image.setPosition(-0.34, -0.3);
        this.guitar_image.setPosition(-0.34, -0.3);
        this.drums_image.setScale(0.3, gapi.hangout.av.effects.ScaleReference.WIDTH);
        this.piano_image.setScale(0.3, gapi.hangout.av.effects.ScaleReference.WIDTH);
        this.guitar_image.setScale(0.3, gapi.hangout.av.effects.ScaleReference.WIDTH);
        this.drums_image.setVisible(true);
      }
    }
  };

  HangoutBand.prototype.initialize_app = function () {
    var i, l, cb, sounds, div, animation_end, element;

    audio = new WebAudio();

    if (audio.AUDIO_SUPPORT) {
      cb = function (nr) {
        var div, animation_end;
        div = window.document.getElementById(nr);
        if (div) {
          div.onclick = function () {
            this.play_sound("", nr);
          }.bind(this);
          animation_end = function () {
            div.classList.remove("effect");
          };
          div.addEventListener("webkitAnimationEnd", animation_end);
          div.addEventListener("mozAnimationEnd", animation_end);
          div.addEventListener("msAnimationEnd", animation_end);
          div.addEventListener("oAnimationEnd", animation_end);
          div.addEventListener("animationEnd", animation_end);
          if (chords[nr] && nr.substr(0, 6) == "guitar") {
            div.onmouseover = function () {
              this.set_chords(nr);
            }.bind(this);
            div.onmouseout = function () {
              this.set_chords();
            }.bind(this);
          }
          if (nr.substr(0, 4) == "drum") {
            this.drums_loaded++;
            if (this.drums_loaded >= this.drums_total) {
              window.document.getElementById("drums_loading").classList.remove("button_loading");
              window.document.getElementById("drums_ready").classList.add("button_lighted_green");
            }
          }
          if (nr.substr(0, 5) == "piano") {
            this.piano_loaded++;
            if (this.piano_loaded >= this.piano_total) {
              window.document.getElementById("piano_loading").classList.remove("button_loading");
              window.document.getElementById("piano_ready").classList.add("button_lighted_green");
            }
          }
          if (nr.substr(0, 6) == "guitar") {
            this.guitar_loaded++;
            if (this.guitar_loaded >= this.guitar_total) {
              window.document.getElementById("guitar_loading").classList.remove("button_loading");
              window.document.getElementById("guitar_ready").classList.add("button_lighted_green");
            }
          }
        }
      }.bind(this);

      div = window.document.getElementById("strings");
      animation_end = function () {
        div.classList.remove("effect");
      };
      div.addEventListener("webkitAnimationEnd", animation_end);
      div.addEventListener("mozAnimationEnd", animation_end);
      div.addEventListener("msAnimationEnd", animation_end);
      div.addEventListener("oAnimationEnd", animation_end);
      div.addEventListener("animationEnd", animation_end);

      window.document.getElementById("button_drums").onclick = function () {
        this.switch_tabs("drums");
      }.bind(this);
      window.document.getElementById("button_piano").onclick = function () {
        this.switch_tabs("piano");
      }.bind(this);
      window.document.getElementById("button_guitar").onclick = function () {
        this.switch_tabs("guitar");
      }.bind(this);
      window.document.getElementById("record").onclick = function () {
        if (this.recording) {
          this.recording = false;
          this.start_recording = false;
          this.last_chord = "";
          window.document.getElementById("record").innerHTML = "Start recording";
        } else {
          this.start_recording = true;
          this.last_chord = "";
          window.document.getElementById("record").innerHTML = "Stop recording";
        }
      }.bind(this);

      element = window.document.getElementById("volume_control");
      if (element) {
        element.onmousewheel = function (e) {
          this.volume = Math.max(0, Math.min(100, this.volume + e.wheelDelta / 10));
          this.change_volume();
        }.bind(this);
        element.onmousemove = function (e) {
          var dif_x, dif_y;
          if (this.changing_volume) {
            dif_x = e.screenX - this.screenX;
            dif_y = e.screenY - this.screenY;
            this.volume = Math.max(0, Math.min(100, this.volume + (dif_x - dif_y) * 5));
            this.change_volume();
          }
          this.screenX = e.screenX;
          this.screenY = e.screenY;
        }.bind(this);
        element.onmousedown = function (e) {
          this.changing_volume = true;
        }.bind(this);
        window.document.onmouseup = function (e) {
          this.changing_volume = false;
        }.bind(this);
      }
      element = window.document.getElementById("mute_others");
      if (element) {
        element.onclick = function () {
          this.mute_others = !this.mute_others;
          if (this.mute_others) {
            this.play_private = true;
            window.document.getElementById("mute_others").classList.remove("button_pressed");
            window.document.getElementById("receiving_light").classList.remove("button_lighted");
            window.document.getElementById("play_private").classList.remove("button_pressed");
            window.document.getElementById("sending_light").classList.remove("button_lighted");
          } else {
            window.document.getElementById("mute_others").classList.add("button_pressed");
            window.document.getElementById("receiving_light").classList.add("button_lighted");
          }
        }.bind(this);
      }

      element = window.document.getElementById("play_private");
      if (element) {
        element.onclick = function () {
          this.play_private = !this.play_private;
          if (!this.play_private) {
            this.mute_others = false;
            window.document.getElementById("mute_others").classList.add("button_pressed");
            window.document.getElementById("receiving_light").classList.add("button_lighted");
            window.document.getElementById("play_private").classList.add("button_pressed");
            window.document.getElementById("sending_light").classList.add("button_lighted");
          } else {
            window.document.getElementById("play_private").classList.remove("button_pressed");
            window.document.getElementById("sending_light").classList.remove("button_lighted");
          }
        }.bind(this);
      }

      window.document.getElementById("clear_score").onclick = function () {
        var i, div1, div2;
        div1 = window.document.getElementById("score");
        for (i = 1; i <= this.current_score_part; i++) {
          div2 = window.document.getElementById("score_part" + i);
          div1.removeChild(div2);
        }
        div2 = window.document.getElementById("score_part_template").cloneNode(true);
        div2.id = "score_part1";
        div2.style.display = "block";
        div1.appendChild(div2);
        div1.scrollTop = div1.scrollHeight;
        this.current_score_part = 1;
        this.current_score_pos = 30;
      }.bind(this);

      window.document.onkeydown = function (e) {
        var
          key = String.fromCharCode(e.which || e.keyCode) || "xxx",
          shift = e.shiftKey,
          ctrl = e.ctrlKey || e.altKey,
          p = 4,
          nr = "";
        if (keys[key]) {
          switch (this.current_tab) {
          case 0:
            nr = keys[key][0];
            break;
          case 1:
            if (key == "K") { p++; }
            if (shift) { p++; }
            if (ctrl) { p--; }
            nr = keys[key][1] + p;
            break;
          case 2:
            nr = keys[key][2];
            if (shift || ctrl) {
              nr = nr + "m";
            }
            break;
          }

          if (nr && nr != "") {
            this.play_sound("", nr);
          }
        }
      }.bind(this);

      sounds = [];
      sounds.push("drum_bass", "drum_snare1", "drum_snare2", "drum_snare3", "drum_snare4", "drum_snare5");
      sounds.push("drum_hihat", "drum_cymbal1", "drum_cymbal2", "drum_cymbal3", "drum_cymbal4", "drum_cymbal5", "drum_cymbal6");
      sounds.push("piano_a3", "piano_a4", "piano_a5", "piano_ab3", "piano_ab4", "piano_ab5");
      sounds.push("piano_b3", "piano_b4", "piano_b5", "piano_bb3", "piano_bb4", "piano_bb5");
      sounds.push("piano_c3", "piano_c4", "piano_c5", "piano_c6");
      sounds.push("piano_d3", "piano_d4", "piano_d5", "piano_db3", "piano_db4", "piano_db5");
      sounds.push("piano_e3", "piano_e4", "piano_e5", "piano_eb3", "piano_eb4", "piano_eb5");
      sounds.push("piano_f3", "piano_f4", "piano_f5");
      sounds.push("piano_g3", "piano_g4", "piano_g5", "piano_gb3", "piano_gb4", "piano_gb5");
      sounds.push("guitar_a", "guitar_am", "guitar_ab", "guitar_abm");
      sounds.push("guitar_b", "guitar_bm", "guitar_bb", "guitar_bbm");
      sounds.push("guitar_c", "guitar_cm");
      sounds.push("guitar_d", "guitar_dm", "guitar_db", "guitar_dbm");
      sounds.push("guitar_e", "guitar_em", "guitar_eb", "guitar_ebm");
      sounds.push("guitar_f", "guitar_fm");
      sounds.push("guitar_g", "guitar_gm", "guitar_gb", "guitar_gbm");

      l = sounds.length;
      for (i = 0; i < l; i++) {
        audio.load_sound(sounds[i], cb);
      }

    } else {
      window.document.getElementById("playground").innerHTML = "Sorry, the Web Audio API is not supported by your browser. Try Chrome!";
    }
  };

  HangoutBand.prototype.change_volume = function (nr) {
    var element, rot;
    element = window.document.getElementById("volume_knob");
    rot = (this.volume - 50) / 50 * 140;
    element.style.transform = "rotate(" + rot + "deg)";
    element.style.webkitTransform = "rotate(" + rot + "deg)";
    element.style.mozTransform = "rotate(" + rot + "deg)";
    element.style.msTransform = "rotate(" + rot + "deg)";
    element.style.oTransform = "rotate(" + rot + "deg)";
    audio.change_volume(this.volume / 100.0);
  };

  HangoutBand.prototype.set_chords = function (nr) {
    var i;
    if (nr && chords[nr]) {
      for (i = 0; i < 7; i++) {
        window.document.getElementById("chordmark" + i).style.left = (chords[nr][i] * 50 - 20) + "px";
      }
    } else {
      for (i = 0; i < 7; i++) {
        window.document.getElementById("chordmark" + i).style.left = "-5000px";
      }
    }
  };

  HangoutBand.prototype.switch_tabs = function (tab) {
    var i, l, instruments;
    window.document.getElementById("drums").style.display = (tab === "drums") ? "block" : "none";
    window.document.getElementById("piano").style.display = (tab === "piano") ? "block" : "none";
    window.document.getElementById("guitar").style.display = (tab === "guitar") ? "block" : "none";
    switch (tab) {
    case "drums":
      this.current_tab = 0;
      window.document.getElementById("button_drums").classList.add("button_pressed");
      window.document.getElementById("button_piano").classList.remove("button_pressed");
      window.document.getElementById("button_guitar").classList.remove("button_pressed");
      break;
    case "piano":
      this.current_tab = 1;
      window.document.getElementById("button_drums").classList.remove("button_pressed");
      window.document.getElementById("button_piano").classList.add("button_pressed");
      window.document.getElementById("button_guitar").classList.remove("button_pressed");
      break;
    case "guitar":
      this.current_tab = 2;
      window.document.getElementById("button_drums").classList.remove("button_pressed");
      window.document.getElementById("button_piano").classList.remove("button_pressed");
      window.document.getElementById("button_guitar").classList.add("button_pressed");
      break;
    }
    if (window.gapi) {
      this.drums_image.setVisible(this.current_tab == 0);
      this.piano_image.setVisible(this.current_tab == 1);
      this.guitar_image.setVisible(this.current_tab == 2);
    }
  };

  HangoutBand.prototype.onMessageReceived = function (event) {
    this.play_sound(event.senderId, event.message);
  };

  HangoutBand.prototype.play_sound = function (id, nr) {
    var chk_play = false, div, div_new;
    if (id && id != "") {
      if (!this.mute_others) {
        chk_play = true;
      }
    } else {
      chk_play = true;
      if (window.gapi) {
        if (!this.play_private) {
          window.gapi.hangout.data.sendMessage(nr);
        }
      }
    }
    if (chk_play) {
      audio.play_sound(nr);
      this.draw_note(id, nr);
      div = window.document.getElementById(nr);
      if (div) {
        div.classList.add("effect");
        if (nr.substr(0, 6) == "guitar") {
          window.document.getElementById("strings").classList.add("effect");
        }
      }
    }
  };

  HangoutBand.prototype.draw_note = function (id, nr) {
    var div1, i, l, children, div2, div3, this_time;
    if (notes[nr]) {
      if (notes[nr][3]) {
        if (notes[nr][3] == this.last_chord) {
          return;
        }
      }
      this_time = new Date().getTime();
      if (this.start_recording && !this.recording) {
        this.recording = true;
        if (this.current_score_pos > 30) {
          this.current_score_pos = 500;
        }
        this.last_time = this_time;
      }
      if (this.recording) {
        this.current_score_pos += Math.floor((this_time - this.last_time) / 50) * 5;
        this.last_time = this_time;
        if (this.current_score_pos > 410) {
          this.current_score_part++;
          this.current_score_pos = 30;
          div2 = window.document.getElementById("score_part_template").cloneNode(true);
          div2.id = "score_part" + this.current_score_part;
          div2.style.display = "block";
          div1 = window.document.getElementById("score");
          div1.appendChild(div2);
          div1.scrollTop = div1.scrollHeight;
          div1 = undefined;
          div2 = undefined;
        }
        div1 = window.document.getElementById("score_part" + this.current_score_part);
        if (div1) {
          children = div1.childNodes;
          l = children.length;
          div2 = undefined;
          for (i = 0; i < l; i++) {
            if (children[i].classList) {
              if (children[i].classList.contains(notes[nr][0])) {
                div2 = children[i];
                break;
              }
            }
          }
          if (div2) {
            l = notes[nr][2].length;
            for (i = 0; i < l; i++) {
              div3 = window.document.createElement("div");
              div3.classList.add(notes[nr][2][i]);
              div3.style.left = this.current_score_pos + "px";
              div3.style.top = notes[nr][1] + "px";
              if (notes[nr][3]) {
                this.last_chord = notes[nr][3];
                div3.innerHTML = notes[nr][3];
              }
              div2.appendChild(div3);
            }
          }
        }
      }
    }
  };

  hangout_band = new HangoutBand();
}(window));
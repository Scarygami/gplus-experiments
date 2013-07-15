/**
 * Copyright (c) 2011-2012 Gerwin Sturm, FoldedSoft e.u. / www.foldedsoft.at
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

  global.HangoutCube = function (mainDiv) {
    var doc, colors, faces, verticalPos, horizontalPos, dragging, draggingReversed, cube, rotX, rotY, moves, sliceMoves, faceMoves, gapi, moving;
    doc = global.document;
    gapi = global.gapi;
    colors = ["yellow", "white", "blue", "green", "red", "orange"];
    faces = ["u", "d", "l", "r", "f", "b"];
    moves = ["move-left", "move-up", "move-right", "move-down"];
    verticalPos = ["top", "middle", "bottom"];
    horizontalPos = ["left", "center", "right"];
    rotX = -20;
    rotY = 20;
    dragging = false;
    draggingReversed = false;
    moving = false;

    sliceMoves = {
      "move-left": {
        "u": {
          "top": {
            "left": {slice: "b", clockwise: true},
            "right": {slice: "b", clockwise: true}
          },
          "bottom": {
            "left": {slice: "f", clockwise: false},
            "right": {slice: "f", clockwise: false}
          }
        },
        "d": {
          "top": {
            "left": {slice: "f", clockwise: true},
            "right": {slice: "f", clockwise: true}
          },
          "bottom": {
            "left": {slice: "b", clockwise: false},
            "right": {slice: "b", clockwise: false}
          }
        },
        "l": {
          "top": {
            "left": {slice: "u", clockwise: true},
            "right": {slice: "u", clockwise: true}
          },
          "bottom": {
            "left": {slice: "d", clockwise: false},
            "right": {slice: "d", clockwise: false}
          }
        },
        "r": {
          "top": {
            "left": {slice: "u", clockwise: true},
            "right": {slice: "u", clockwise: true}
          },
          "bottom": {
            "left": {slice: "d", clockwise: false},
            "right": {slice: "d", clockwise: false}
          }
        },
        "f": {
          "top": {
            "left": {slice: "u", clockwise: true},
            "right": {slice: "u", clockwise: true}
          },
          "bottom": {
            "left": {slice: "d", clockwise: false},
            "right": {slice: "d", clockwise: false}
          }
        },
        "b": {
          "top": {
            "left": {slice: "u", clockwise: true},
            "right": {slice: "u", clockwise: true}
          },
          "bottom": {
            "left": {slice: "d", clockwise: false},
            "right": {slice: "d", clockwise: false}
          }
        }
      },
      "move-up": {
        "u": {
          "top": {
            "left": {slice: "l", clockwise: false},
            "right": {slice: "r", clockwise: true}
          },
          "bottom": {
            "left": {slice: "l", clockwise: false},
            "right": {slice: "r", clockwise: true}
          }
        },
        "d": {
          "top": {
            "left": {slice: "l", clockwise: false},
            "right": {slice: "r", clockwise: true}
          },
          "bottom": {
            "left": {slice: "l", clockwise: false},
            "right": {slice: "r", clockwise: true}
          }
        },
        "l": {
          "top": {
            "left": {slice: "b", clockwise: false},
            "right": {slice: "f", clockwise: true}
          },
          "bottom": {
            "left": {slice: "b", clockwise: false},
            "right": {slice: "f", clockwise: true}
          }
        },
        "r": {
          "top": {
            "left": {slice: "f", clockwise: false},
            "right": {slice: "b", clockwise: true}
          },
          "bottom": {
            "left": {slice: "f", clockwise: false},
            "right": {slice: "b", clockwise: true}
          }
        },
        "f": {
          "top": {
            "left": {slice: "l", clockwise: false},
            "right": {slice: "r", clockwise: true}
          },
          "bottom": {
            "left": {slice: "l", clockwise: false},
            "right": {slice: "r", clockwise: true}
          }
        },
        "b": {
          "top": {
            "left": {slice: "r", clockwise: false},
            "right": {slice: "l", clockwise: true}
          },
          "bottom": {
            "left": {slice: "r", clockwise: false},
            "right": {slice: "l", clockwise: true}
          }
        }
      }
    };

    // assuming all are clockwise, none-clickwise = 3x clockwise
    faceMoves = {
      "u": [
        {selector: ".u.top.left", vPos: "top", hPos: "right"},
        {selector: ".u.top.center", vPos: "middle", hPos: "right"},
        {selector: ".u.top.right", vPos: "bottom", hPos: "right"},
        {selector: ".u.middle.right", vPos: "bottom", hPos: "center"},
        {selector: ".u.bottom.right", vPos: "bottom", hPos: "left"},
        {selector: ".u.bottom.center", vPos: "middle", hPos: "left"},
        {selector: ".u.bottom.left", vPos: "top", hPos: "left"},
        {selector: ".u.middle.left", vPos: "top", hPos: "center"},
        {selector: ".u.middle.center"},
        {selector: ".f.top", face: "l"},
        {selector: ".l.top", face: "b"},
        {selector: ".b.top", face: "r"},
        {selector: ".r.top", face: "f"}
      ],
      "d": [
        {selector: ".d.top.left", vPos: "top", hPos: "right"},
        {selector: ".d.top.center", vPos: "middle", hPos: "right"},
        {selector: ".d.top.right", vPos: "bottom", hPos: "right"},
        {selector: ".d.middle.right", vPos: "bottom", hPos: "center"},
        {selector: ".d.bottom.right", vPos: "bottom", hPos: "left"},
        {selector: ".d.bottom.center", vPos: "middle", hPos: "left"},
        {selector: ".d.bottom.left", vPos: "top", hPos: "left"},
        {selector: ".d.middle.left", vPos: "top", hPos: "center"},
        {selector: ".d.middle.center"},
        {selector: ".f.bottom", face: "r"},
        {selector: ".l.bottom", face: "f"},
        {selector: ".b.bottom", face: "l"},
        {selector: ".r.bottom", face: "b"}
      ],
      "l": [
        {selector: ".l.top.left", vPos: "top", hPos: "right"},
        {selector: ".l.top.center", vPos: "middle", hPos: "right"},
        {selector: ".l.top.right", vPos: "bottom", hPos: "right"},
        {selector: ".l.middle.right", vPos: "bottom", hPos: "center"},
        {selector: ".l.bottom.right", vPos: "bottom", hPos: "left"},
        {selector: ".l.bottom.center", vPos: "middle", hPos: "left"},
        {selector: ".l.bottom.left", vPos: "top", hPos: "left"},
        {selector: ".l.middle.left", vPos: "top", hPos: "center"},
        {selector: ".l.middle.center"},
        {selector: ".f.left", face: "d"},
        {selector: ".u.left", face: "f"},
        {selector: ".d.top.left", face: "b", vPos: "bottom", hPos: "right"},
        {selector: ".d.middle.left", face: "b", vPos: "middle", hPos: "right"},
        {selector: ".d.bottom.left", face: "b", vPos: "top", hPos: "right"},
        {selector: ".b.top.right", face: "u", vPos: "bottom", hPos: "left"},
        {selector: ".b.middle.right", face: "u", vPos: "middle", hPos: "left"},
        {selector: ".b.bottom.right", face: "u", vPos: "top", hPos: "left"}
      ],
      "r": [
        {selector: ".r.top.left", vPos: "top", hPos: "right"},
        {selector: ".r.top.center", vPos: "middle", hPos: "right"},
        {selector: ".r.top.right", vPos: "bottom", hPos: "right"},
        {selector: ".r.middle.right", vPos: "bottom", hPos: "center"},
        {selector: ".r.bottom.right", vPos: "bottom", hPos: "left"},
        {selector: ".r.bottom.center", vPos: "middle", hPos: "left"},
        {selector: ".r.bottom.left", vPos: "top", hPos: "left"},
        {selector: ".r.middle.left", vPos: "top", hPos: "center"},
        {selector: ".r.middle.center"},
        {selector: ".f.right", face: "u"},
        {selector: ".d.right", face: "f"},
        {selector: ".u.top.right", face: "b", vPos: "bottom", hPos: "left"},
        {selector: ".u.middle.right", face: "b", vPos: "middle", hPos: "left"},
        {selector: ".u.bottom.right", face: "b", vPos: "top", hPos: "left"},
        {selector: ".b.top.left", face: "d", vPos: "bottom", hPos: "right"},
        {selector: ".b.middle.left", face: "d", vPos: "middle", hPos: "right"},
        {selector: ".b.bottom.left", face: "d", vPos: "top", hPos: "right"}
      ],
      "f": [
        {selector: ".f.top.left", vPos: "top", hPos: "right"},
        {selector: ".f.top.center", vPos: "middle", hPos: "right"},
        {selector: ".f.top.right", vPos: "bottom", hPos: "right"},
        {selector: ".f.middle.right", vPos: "bottom", hPos: "center"},
        {selector: ".f.bottom.right", vPos: "bottom", hPos: "left"},
        {selector: ".f.bottom.center", vPos: "middle", hPos: "left"},
        {selector: ".f.bottom.left", vPos: "top", hPos: "left"},
        {selector: ".f.middle.left", vPos: "top", hPos: "center"},
        {selector: ".f.middle.center"},
        {selector: ".l.top.right", face: "u", vPos: "bottom", hPos: "right"},
        {selector: ".l.middle.right", face: "u", vPos: "bottom", hPos: "center"},
        {selector: ".l.bottom.right", face: "u", vPos: "bottom", hPos: "left"},
        {selector: ".u.bottom.left", face: "r", vPos: "top", hPos: "left"},
        {selector: ".u.bottom.center", face: "r", vPos: "middle", hPos: "left"},
        {selector: ".u.bottom.right", face: "r", vPos: "bottom", hPos: "left"},
        {selector: ".r.top.left", face: "d", vPos: "top", hPos: "right"},
        {selector: ".r.middle.left", face: "d", vPos: "top", hPos: "center"},
        {selector: ".r.bottom.left", face: "d", vPos: "top", hPos: "left"},
        {selector: ".d.top.left", face: "l", vPos: "top", hPos: "right"},
        {selector: ".d.top.center", face: "l", vPos: "middle", hPos: "right"},
        {selector: ".d.top.right", face: "l", vPos: "bottom", hPos: "right"}
      ],
      "b": [
        {selector: ".b.top.left", vPos: "top", hPos: "right"},
        {selector: ".b.top.center", vPos: "middle", hPos: "right"},
        {selector: ".b.top.right", vPos: "bottom", hPos: "right"},
        {selector: ".b.middle.right", vPos: "bottom", hPos: "center"},
        {selector: ".b.bottom.right", vPos: "bottom", hPos: "left"},
        {selector: ".b.bottom.center", vPos: "middle", hPos: "left"},
        {selector: ".b.bottom.left", vPos: "top", hPos: "left"},
        {selector: ".b.middle.left", vPos: "top", hPos: "center"},
        {selector: ".b.middle.center"},
        {selector: ".r.top.right", face: "u", vPos: "top", hPos: "left"},
        {selector: ".r.middle.right", face: "u", vPos: "top", hPos: "center"},
        {selector: ".r.bottom.right", face: "u", vPos: "top", hPos: "right"},
        {selector: ".u.top.left", face: "l", vPos: "bottom", hPos: "left"},
        {selector: ".u.top.center", face: "l", vPos: "middle", hPos: "left"},
        {selector: ".u.top.right", face: "l", vPos: "top", hPos: "left"},
        {selector: ".l.top.left", face: "d", vPos: "bottom", hPos: "left"},
        {selector: ".l.middle.left", face: "d", vPos: "bottom", hPos: "center"},
        {selector: ".l.bottom.left", face: "d", vPos: "bottom", hPos: "right"},
        {selector: ".d.bottom.right", face: "r", vPos: "top", hPos: "right"},
        {selector: ".d.bottom.center", face: "r", vPos: "middle", hPos: "right"},
        {selector: ".d.bottom.left", face: "r", vPos: "bottom", hPos: "right"}
      ]
    };

    function getMove(moveList, faceList) {
      var move, face, vPos, hPos, i, sliceMove, slice, clockwise;
      for (i = 0; i < moveList.length; i++) {
        if (moves.indexOf(moveList[i]) >= 0) {
          move = moveList[i];
          break;
        }
      }
      for (i = 0; i < faceList.length; i++) {
        if (faces.indexOf(faceList[i]) >= 0) {
          face = faceList[i];
        }
        if (verticalPos.indexOf(faceList[i]) >= 0) {
          vPos = faceList[i];
        }
        if (horizontalPos.indexOf(faceList[i]) >= 0) {
          hPos = faceList[i];
        }
      }
      switch (move) {
      case "move-left":
        sliceMove = sliceMoves[move][face][vPos][hPos];
        slice = sliceMove.slice;
        clockwise = sliceMove.clockwise;
        break;

      case "move-up":
        sliceMove = sliceMoves[move][face][vPos][hPos];
        slice = sliceMove.slice;
        clockwise = sliceMove.clockwise;
        break;

      case "move-right":
        sliceMove = sliceMoves["move-left"][face][vPos][hPos];
        slice = sliceMove.slice;
        clockwise = !sliceMove.clockwise;
        break;

      case "move-down":
        sliceMove = sliceMoves["move-up"][face][vPos][hPos];
        slice = sliceMove.slice;
        clockwise = !sliceMove.clockwise;
        break;
      }
      return { slice: slice, clockwise: clockwise };
    }

    function performMove(slice) {
      var moveList, i, faces, f, face;
      moveList = faceMoves[slice];

      // clean-up from previous move
      faces = doc.querySelectorAll(".face");
      for (i = 0; i < faces.length; i++) {
        faces[i].removeAttribute("data-moved");
      }

      for (i = 0; i < moveList.length; i++) {
        faces = doc.querySelectorAll(moveList[i].selector);
        for (f = 0; f < faces.length; f++) {
          face = faces[f];
          if (!face.getAttribute("data-moved")) {
            if (moveList[i].face) {
              face.classList.remove(face.getAttribute("data-face"));
              face.classList.add(moveList[i].face);
              face.setAttribute("data-face", moveList[i].face);
            }
            if (moveList[i].vPos) {
              face.classList.remove(face.getAttribute("data-vpos"));
              face.classList.add(moveList[i].vPos);
              face.setAttribute("data-vpos", moveList[i].vPos);
            }
            if (moveList[i].hPos) {
              face.classList.remove(face.getAttribute("data-hpos"));
              face.classList.add(moveList[i].hPos);
              face.setAttribute("data-hpos", moveList[i].hPos);
            }
            face.setAttribute("data-moved", "1");
          }
        }
      }
    }

    function animateMove(move, cb) {
      // do some CSS3 animation stuff here...
      var animationEnd, div, css, cube, moveList, faces, i, f;
      div = doc.getElementById("slice");
      cube = doc.getElementById("cube");
      css = "slice-" + move.slice + "c";
      if (!move.clockwise) {
        css += "c";
      }
      moveList = faceMoves[move.slice];
      for (i = 0; i < moveList.length; i++) {
        faces = doc.querySelectorAll(moveList[i].selector);
        for (f = 0; f < faces.length; f++) {
          div.appendChild(faces[f]);
        }
      }
      animationEnd = function () {
        var i, faces;
        faces = doc.querySelectorAll(".face");
        for (i = 0; i < faces.length; i++) {
          cube.appendChild(faces[i]);
        }
        div.removeEventListener("webkitTransitionEnd", animationEnd);
        div.removeEventListener("transitionend", animationEnd);
        div.removeEventListener("transitionEnd", animationEnd);
        div.classList.remove("slice-move");
        div.classList.remove(css);
        cb();
      };
      div.addEventListener("webkitTransitionEnd", animationEnd);
      div.addEventListener("transitionend", animationEnd);
      div.addEventListener("transitionEnd", animationEnd);
      div.classList.add("slice-move");
      div.classList.add(css);
    }

    function shareCube() {
      var faces, state, f;
      faces = doc.querySelectorAll(".face");
      state = [];
      for (f = 0; f < faces.length; f++) {
        state.push(
          {
            face: faces[f].getAttribute("data-face"),
            vpos: faces[f].getAttribute("data-vpos"),
            hpos: faces[f].getAttribute("data-hpos"),
            col: faces[f].getAttribute("data-col")
          }
        );
      }
      gapi.hangout.data.setValue("cube", JSON.stringify(state));
    }

    function doMove(move, own, cb) {
      moving = true;

      if (own && gapi && gapi.hangout) {
        gapi.hangout.data.sendMessage(JSON.stringify(move));
      }

      animateMove(move, function () {
        performMove(move.slice);
        if (!move.clockwise) {
          performMove(move.slice);
          performMove(move.slice);
        }
        if (own && gapi && gapi.hangout) {
          shareCube();
        }
        moving = false;
        if (cb) { global.setTimeout(cb, 1); }
      });
    }

    function moveClick(e) {
      var move;
      if (!moving && e.target.classList.contains("move") && e.target.parentElement.classList.contains("face")) {
        move = getMove(e.target.classList, e.target.parentElement.classList);
        doMove(move, true);
      }
    }

    function performMoves(moves, cb) {
      var move;
      if (moves.length > 0) {
        move = moves.shift();
        doMove(move, false, function () {
          performMoves(moves, cb);
        });
      } else {
        cb();
      }
    }

    function shuffle() {
      var button, moves, i, f;
      button = doc.getElementById("shuffle");
      button.disabled = true;
      button.innerHTML = "Everyday I'm Shufflin'";

      moves = [];
      for (i = 0; i < 20; i++) {
        f = Math.floor((Math.random() * 6));
        moves.push({slice: faces[f], clockwise: true});
      }

      performMoves(moves, function () {
        button.disabled = false;
        button.innerHTML = "Shuffle";

        if (gapi && gapi.hangout) {
          shareCube();
        }
      });
    }

    function initializeDom() {
      var vp, face, f, v, h, main, m, move, tmp, slice, controls, button, info, text;
      main = doc.getElementById(mainDiv);
      main.classList.add("cube-main");

      vp = doc.createElement("div");
      vp.classList.add("viewport");

      cube = doc.createElement("div");
      cube.id = "cube";
      cube.classList.add("cube");
      for (f = 0; f < 6; f++) {
        for (h = 0; h < 3; h++) {
          for (v = 0; v < 3; v++) {
            face = doc.createElement("div");
            face.classList.add("face");
            face.classList.add(colors[f]);
            face.classList.add(faces[f]);
            face.classList.add(verticalPos[v]);
            face.classList.add(horizontalPos[h]);
            face.setAttribute("data-col", colors[f]);
            face.setAttribute("data-face", faces[f]);
            face.setAttribute("data-vpos", verticalPos[v]);
            face.setAttribute("data-hpos", horizontalPos[h]);
            if (v !== 1 && h !== 1) {
              for (m = 0; m < 4; m++) {
                move = doc.createElement("div");
                move.classList.add("move");
                move.classList.add(moves[m]);
                move.onclick = moveClick;
                face.appendChild(move);
              }
              face.appendChild(move);
            }
            cube.appendChild(face);
          }
        }
      }

      slice = doc.createElement("div");
      slice.id = "slice";
      slice.classList.add("slice");
      cube.appendChild(slice);

      vp.appendChild(cube);
      main.appendChild(vp);

      tmp = doc.createElement("div");
      tmp.id = "debug";

      main.appendChild(tmp);

      controls = doc.createElement("div");
      controls.classList.add("controls");

      button = doc.createElement("button");
      button.id = "shuffle";
      button.innerHTML = "Shuffle";
      button.onclick = shuffle;

      controls.appendChild(button);
      main.appendChild(controls);

      info = doc.createElement("div");
      info.classList.add("info");

      tmp = doc.createElement("div");
      tmp.classList.add("info-label");
      tmp.innerHTML = "Info";
      info.appendChild(tmp);

      tmp = doc.createElement("div");
      tmp.classList.add("info-text");
      text = "<b>Hangout Cube</b><br><br>";
      if (gapi && gapi.hangout) {
        text += "<a href=\"http://www.allmyplus.com/hangout-cube/\" target=\"_blank\">\"Offline\" version</a><br><br>";
      } else {
        text += "Hangout Version <a href=\"https://plus.google.com/hangouts/_?gid=876343091946\" target=\"_blank\"><img src=\"https://ssl.gstatic.com/s2/oz/images/stars/hangout/1/gplus-hangout-24x100-normal.png\" alt=\"Start a Hangout\" style=\"vertical-align: bottom;\"></a><br><br>";
      }
      text += "Programming by <a href=\"https://plus.google.com/112336147904981294875\" target=\"_blank\">Gerwin Sturm</a>, <a href=\"http://www.foldedsoft.at/\" target=\"_blank\">FoldedSoft e.U.</a><br><br>";
      text += "<a href=\"http://www.rubiks.com\" target=\"_blank\">Rubik&#174; and Rubik's Cube&#174;</a> are registered trademarks of <a href=\"http://www.seventowns.com/\" target=\"_blank\">Seven Towns Limited</a>."
      tmp.innerHTML = text;
      info.appendChild(tmp);
      main.appendChild(info);
    }

    function onMessageReceived(eventObj) {
      var move;
      if (!moving) {
        try {
          move = JSON.parse(eventObj.message);
        } catch (e) {
          global.console.log(e);
          move = {};
        }
        if (move.hasOwnProperty("slice") && move.hasOwnProperty("clockwise")) {
          if (faceMoves.hasOwnProperty(move.slice)) {
            doMove(move, false);
          }
        }
      }
    }

    function onStateChanged(eventObj) {
      var state, cube, i, css, face;
      state = eventObj.state;
      if (state.hasOwnProperty("cube")) {
        try {
          cube = JSON.parse(state.cube);
        } catch (e) {
          global.console.log(e);
          cube = [];
        }
        for (i = 0; i < cube.length; i++) {
          if (cube[i].face && cube[i].hpos && cube[i].vpos && cube[i].col) {
            css = "." + cube[i].face + "." + cube[i].vpos + "." + cube[i].hpos;
            face = doc.querySelector(css);
            if (face) {
              face.classList.remove(face.getAttribute("data-col"));
              face.classList.add(cube[i].col);
              face.setAttribute("data-col", cube[i].col);
            }
          }
        }
      }
    }

    function initializeEvents() {
      var div;
      div = doc.querySelector("#" + mainDiv + " .viewport");
      div.onmousedown = function (e) {
        e.preventDefault();
        dragging = true;
        if (rotX > -90 && rotX < 90) {
          draggingReversed = false;
        } else {
          draggingReversed = true;
        }
      };
      div.onmouseup = function () {
        dragging = false;
      };
      div.onmouseout = function (e) {
        if (!e.toElement) {
          dragging = false;
        }
      };
      div.onmousemove = function (e) {
        if (dragging) {
          rotX -= e.webkitMovementY * 0.5;
          if (rotX > 180) { rotX -= 360; }
          if (rotX < -180) { rotX += 360; }

          if (draggingReversed) {
            rotY -= e.webkitMovementX * 0.5;
          } else {
            rotY += e.webkitMovementX * 0.5;
          }
          if (rotY > 180) { rotY -= 360; }
          if (rotY < -180) { rotY += 360; }

          cube.style.webkitTransform = "translate3d(0px, 20px, -100px) rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
        }
      };
      if (gapi && gapi.hangout) {
        gapi.hangout.data.onMessageReceived.add(onMessageReceived);
        gapi.hangout.data.onStateChanged.add(onStateChanged);
        onStateChanged({state: gapi.hangout.data.getState()});
      }
    }

    initializeDom();
    initializeEvents();
  };

}(this));
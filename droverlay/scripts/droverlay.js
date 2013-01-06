/*
 * Copyright (c) 2012-2013 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
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
  var hapi = global.gapi.hangout, window = global.window, document = global.document, console = global.console, droverlay;

  function Droverlay() {

    var mainDiv, editDiv, faceDiv, video, canvas, ctx, face, dotResource, dotOverlay, faceDataBuffer = [], cursorCanvas, cursorCtx, currentColor, drawing, lastUpdate, changed, overlay, size = 1;

    function repositionVideo() {
      var
        width = mainDiv.offsetWidth - editDiv.offsetWidth,
        height = mainDiv.offsetHeight,
        left = editDiv.offsetLeft + editDiv.offsetWidth,
        top = mainDiv.offsetTop,
        aspect = video.getAspectRatio(),
        videoWidth, videoHeight, videoTop, videoLeft;

      videoWidth = width * 0.9;
      videoHeight = videoWidth / aspect;
      if (videoHeight > height * 0.95) {
        videoHeight = height * 0.95;
        videoWidth = videoHeight * aspect;
      }
      videoTop = top + (height - videoHeight) / 2;
      videoLeft = left + (width - videoWidth) / 2;

      video.setPosition(videoLeft, videoTop);
      video.setWidth(videoWidth);
    }

    function updateFace(data) {
      var width, height, partWidth, partHeight, averageFace, i, l;

      if (data.hasFace) {
        if (faceDataBuffer.length > 5) {
          faceDataBuffer.shift();
        }

        faceDataBuffer.push(data);
        l = faceDataBuffer.length;
        averageFace = {};
        averageFace.leftEye = {x: 0, y: 0};
        averageFace.rightEye = {x: 0, y: 0};
        averageFace.mouthLeft = {x: 0, y: 0};
        averageFace.mouthRight = {x: 0, y: 0};
        averageFace.rightEye = {x: 0, y: 0};
        averageFace.noseRoot = {x: 0, y: 0};
        averageFace.noseTip = {x: 0, y: 0};
        averageFace.roll = 0;
        for (i = 0; i < l; i++) {
          averageFace.leftEye.x += faceDataBuffer[i].leftEye.x;
          averageFace.leftEye.y += faceDataBuffer[i].leftEye.y;
          averageFace.rightEye.x += faceDataBuffer[i].rightEye.x;
          averageFace.rightEye.y += faceDataBuffer[i].rightEye.y;
          averageFace.noseRoot.x += faceDataBuffer[i].noseRoot.x;
          averageFace.noseRoot.y += faceDataBuffer[i].noseRoot.y;
          averageFace.noseTip.x += faceDataBuffer[i].noseTip.x;
          averageFace.noseTip.y += faceDataBuffer[i].noseTip.y;
          averageFace.mouthLeft.x += faceDataBuffer[i].mouthLeft.x;
          averageFace.mouthLeft.y += faceDataBuffer[i].mouthLeft.y;
          averageFace.mouthRight.x += faceDataBuffer[i].mouthRight.x;
          averageFace.mouthRight.y += faceDataBuffer[i].mouthRight.y;
          averageFace.roll += faceDataBuffer[i].roll;
        }
        averageFace.leftEye.x /= l;
        averageFace.leftEye.y /= l;
        averageFace.rightEye.x /= l;
        averageFace.rightEye.y /= l;
        averageFace.noseRoot.x /= l;
        averageFace.noseRoot.y /= l;
        averageFace.noseTip.x /= l;
        averageFace.noseTip.y /= l;
        averageFace.mouthLeft.x /= l;
        averageFace.mouthLeft.y /= l;
        averageFace.mouthRight.x /= l;
        averageFace.mouthRight.y /= l;
        
        averageFace.roll /= l;

        width = faceDiv.offsetWidth;
      	height = faceDiv.offsetHeight;

        partWidth = Math.floor(Math.sqrt(Math.pow(averageFace.leftEye.x - averageFace.rightEye.x, 2) + Math.pow(averageFace.leftEye.y - averageFace.rightEye.y, 2)) * 0.7 * width);
        partHeight = Math.floor(partWidth / face.lefteye.imgwidth * face.lefteye.imgheight);
        face.lefteye.style.width = partWidth + "px";
        face.lefteye.style.height = partHeight + "px";
        face.lefteye.style.left = Math.floor((averageFace.leftEye.x + 0.5) * width - partWidth / 2) + "px";
        face.lefteye.style.top = Math.floor((averageFace.leftEye.y + 0.5) * height - partHeight / 2) + "px";
        face.lefteye.style.webkitTransform = "rotate(" + averageFace.roll + "rad)";
        face.lefteye.style.transform = "rotate(" + averageFace.roll + "rad)";

        partHeight = Math.floor(partWidth / face.righteye.imgwidth * face.righteye.imgheight);
        face.righteye.style.width = partWidth + "px";
        face.righteye.style.height = partHeight + "px";
        face.righteye.style.left = Math.floor((averageFace.rightEye.x + 0.5) * width - partWidth / 2) + "px";
        face.righteye.style.top = Math.floor((averageFace.rightEye.y + 0.5) * height - partHeight / 2) + "px";
        face.righteye.style.webkitTransform = "rotate(" + averageFace.roll + "rad)";
        face.righteye.style.transform = "rotate(" + averageFace.roll + "rad)";

        partHeight = Math.floor(Math.sqrt(Math.pow(averageFace.noseRoot.x - averageFace.noseTip.x, 2) + Math.pow(averageFace.noseRoot.y - averageFace.noseTip.y, 2)) * width);
        partWidth = Math.floor(partHeight / face.nose.imgheight * face.nose.imgwidth);
        face.nose.style.width = partWidth + "px";
        face.nose.style.height = partHeight + "px";
        face.nose.style.left = Math.floor((averageFace.noseRoot.x + 0.5) * width - partWidth / 2) + "px";
        face.nose.style.top = Math.floor((averageFace.noseRoot.y + 0.5) * height) + "px";
        face.nose.style.webkitTransform = "rotate(" + averageFace.roll + "rad)";
        face.nose.style.transform = "rotate(" + averageFace.roll + "rad)";

        partWidth = Math.floor(Math.sqrt(Math.pow(averageFace.mouthLeft.x - averageFace.mouthRight.x, 2) + Math.pow(averageFace.mouthLeft.y - averageFace.mouthRight.y, 2)) * width);
        partHeight = Math.floor(partWidth / face.mouth.imgwidth * face.mouth.imgheight);
        face.mouth.style.width = partWidth + "px";
        face.mouth.style.height = partHeight + "px";
        face.mouth.style.left = Math.floor((averageFace.mouthLeft.x + 0.5) * width) + "px";
        face.mouth.style.top = Math.floor((averageFace.mouthLeft.y + 0.5) * height - partHeight / 3) + "px";
        face.mouth.style.webkitTransform = "rotate(" + averageFace.roll + "rad)";
        face.mouth.style.transform = "rotate(" + averageFace.roll + "rad)";
        
        face.main.style.display = "block";
      } else {
        face.main.style.display = "none";
        if (faceDataBuffer.length > 0) {
          faceDataBuffer.shift();
        }
      }
    }

    function updateOverlay(force) {
      var now, oldOverlay, oldDot;
      
      now = (new Date()).getTime();
      if (now - lastUpdate > 120 || force) {
        lastUpdate = now;
        if (changed || force) {
          changed = false;
          if (overlay) {
            oldOverlay = overlay
          }
          overlay = hapi.av.effects.createImageResource(canvas.toDataURL("image/png")).showOverlay({scale: {magnitude: 1, reference: gapi.hangout.av.effects.ScaleReference.WIDTH}});
          if (oldOverlay) {
            oldOverlay.setVisible(false);
            oldOverlay.getImageResource().dispose();
          }
        }
        oldDot = dotOverlay;
        dotOverlay = dotResource.createOverlay({scale: oldDot.getScale(), position: oldDot.getPosition()});
        if(oldDot.isVisible()) {
          dotOverlay.setVisible(true);
        }
        oldDot.dispose();
      }
    }
    
    function handleMouseMove(e) {
      var x, y;
      x = e.offsetX || e.layerX || 0;
      y = e.offsetY || e.layerY || 0;
     
      if (drawing) {
        ctx.lineTo(x, y);
        ctx.stroke();
        changed = true;
        updateOverlay(false);
      }

      x = x / canvas.offsetWidth - 0.5;
      y = y / canvas.offsetHeight - 0.5;
      dotOverlay.setPosition(x, y);
      dotOverlay.setVisible(true);
    }

    function handleMouseOver(e) {
      dotOverlay.setVisible(true);
    }

    function handleMouseOut(e) {
      dotOverlay.setVisible(false);
      if (drawing) {
      	drawing = false;
        ctx.closePath();
        updateOverlay(true);
      }
    }

    function handleMouseDown(e) {
      if (e.button === 0) {
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX || e.layerX || 0, e.offsetY || e.layerY || 0);
      }
    }
    
    function handleMouseUp(e) {
      if (e.button === 0 && drawing) {
        drawing = false;
        ctx.closePath();
        updateOverlay(true);
      }
    }
    
    function drawCursor(color) {
      cursorCtx.clearRect(0, 0, 60, 60);
      cursorCtx.beginPath();
      cursorCtx.arc(30, 30, 25, 0, 2 * Math.PI, false);
      cursorCtx.fillStyle = color;
      cursorCtx.fill();
      cursorCtx.lineWidth = 2;
      cursorCtx.strokeStyle = "black";
      cursorCtx.stroke();
      cursorCtx.closePath();
      
      if (dotOverlay) {
        dotOverlay.setVisible(false);
        dotResource.dispose();
      }
      
      ctx.lineWidth = canvas.offsetWidth * 0.035 * size;
      ctx.strokeStyle = color;
      
      dotResource = hapi.av.effects.createImageResource(cursorCanvas.toDataURL("image/png")) 
      dotOverlay = dotResource.createOverlay({scale: {magnitude: 0.05 * size, reference: gapi.hangout.av.effects.ScaleReference.WIDTH}});
    }
    
    function changeSize(e) {
      size = e.target.value / 50;
      ctx.lineWidth = canvas.offsetWidth * 0.035 * size;
      dotOverlay.dispose();
      dotOverlay = dotResource.createOverlay({scale: {magnitude: 0.05 * size, reference: gapi.hangout.av.effects.ScaleReference.WIDTH}});
    }
    
    function handleColorClick(e) {
      var target = e.srcElement || e.target;
      if (target.style.backgroundColor !== currentColor) {
        currentColor = target.style.backgroundColor;
      	drawCursor(currentColor);
      }
    }

    function initialize() {
      var height, colors, i, l;
      
      lastUpdate = (new Date()).getTime();
      mainDiv = document.getElementById("droverlay");
      editDiv = document.getElementById("dredit");
      faceDiv = document.getElementById("drface");
      canvas = document.getElementById("drcanvas");
      cursorCanvas  = document.getElementById("drcursor");

      face = {};
      face.main = document.getElementById("face");
      face.lefteye = document.getElementById("lefteye");
      face.lefteye.imgwidth = 106;
      face.lefteye.imgheight = 42;
      face.righteye = document.getElementById("righteye");
      face.righteye.imgwidth = 109;
      face.righteye.imgheight = 42;
      face.nose = document.getElementById("nose");
      face.nose.imgwidth = 111;
      face.nose.imgheight = 139;
      face.mouth = document.getElementById("mouth");
      face.mouth.imgwidth = 188;
      face.mouth.imgheight = 64;      

      cursorCtx = cursorCanvas.getContext("2d");

      hapi.av.setLocalParticipantVideoMirrored(false);
      video = hapi.layout.getVideoCanvas();

      video.setVideoFeed(hapi.layout.createParticipantVideoFeed(hapi.getLocalParticipantId()));

      repositionVideo();

      height = Math.floor(canvas.offsetWidth / video.getAspectRatio())
      canvas.style.height =  height + "px";
      canvas.height = height;
      canvas.width = canvas.offsetWidth;
      ctx = canvas.getContext("2d");
      faceDiv.style.height = canvas.style.height;
      document.getElementById("drtools").style.top = (height + 20) + "px";

      currentColor = "green";
      drawCursor(currentColor);

      video.setVisible(true);

      window.onresize = repositionVideo;  
      canvas.onmousemove = handleMouseMove;
      canvas.onmouseout = handleMouseOut;
      canvas.onmouseover = handleMouseOver;
      canvas.onmousedown = handleMouseDown;
      canvas.onmouseup = handleMouseUp;

      hapi.onAppVisible.add(function (e) {
        if (e.isAppVisible) {
          hapi.av.setLocalParticipantVideoMirrored(false);
        } else {
          hapi.av.setLocalParticipantVideoMirrored(true);
          dotOverlay.setVisible(false);
        }
      });

      hapi.av.effects.onFaceTrackingDataChanged.add(updateFace);
      
      colors = document.querySelectorAll(".color");
      l = colors.length;
      for (i = 0; i < l; i++) {
        colors[i].onclick = handleColorClick; 
      }
      
      document.getElementById("drsize").onchange = changeSize;
      
      document.getElementById("drclear").onclick = function () {
        ctx.clearRect(0, 0, 500, 500);
        updateOverlay(true);
      };
    }

    hapi.onApiReady.add(function (e) {
      if (e.isApiReady) {
        window.setTimeout(initialize, 1);
      }
    });
  }

  var droverlay = new Droverlay();

}(window));
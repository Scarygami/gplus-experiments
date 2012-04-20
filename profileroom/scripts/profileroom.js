/*global $: false, Float32Array: false, mat4: false, mat3:false, Uint16Array: false, gapi: false, requestAnimFrame: false, base_url: false, API_KEY: false */

// -------------------------------------------------------------------------
// ------------------------- GLOBALS & CONSTANTS ---------------------------
// -------------------------------------------------------------------------

var profileroom;

function degToRad(degrees) {
  "use strict";
  return (degrees % 360) * Math.PI / 180;
}

// -----------------------------------------------------------------
// -------------------------- TEXTURES -----------------------------
// -----------------------------------------------------------------

function render_plusone() {
  "use strict";
  $("#plusone_td").html("<div id=\"plusone_div\"></div>");
  gapi.plusone.render("plusone_div");
}

function switch_user(user) {
  "use strict";
  profileroom.load_data(user, false);
  window.history.pushState(user, document.title, base_url + "u/" + user);
  render_plusone();
}

function ProfileRoom(canvas) {
  "use strict";
  var
    gl, // WebGL-context
    profile_texture = [],
    profilePositionBuffer = [],
    wall_texture = [],
    wallPositionBuffer = [],
    displayed_users = [],
    simple_tex_coords_buffer,
    square_index_buffer,
    SIDE_FRONT = 0, SIDE_LEFT = 1, SIDE_BACK = 2, SIDE_RIGHT = 3, SIDE_BOTTOM = 4, SIDE_TOP = 5,
    normal_buffers = [],
    lastTime = 0,
    joggingAngle = 0,
    pitch = 0, pitchRate = 0,
    yaw = 0, yawRate = 0,
    START_X = 0,
    START_Y = 1,
    START_Z = 5,
    xPos = START_X, yPos = START_Y, zPos = START_Z,
    speed = 0, strafe = 0,
    mouse_x = -1, mouse_y = -1,
    movement_x = 0, movement_y = 0,
    mouse_click = false,
    spin_rate = 0, spin_acc = 0,
    currentlyPressedKeys = {},
    current_shader,
    vertex_shader,
    fragment_shader,
    chk_jumping = false,
    real_jumping = 0,
    chk_ducking = false,
    real_ducking = 0,
    selected_profile = -1,
    selected_photowall = -1,
    selected_photo = -1,
    selected_book = -1,
    selected_bookshelf = -1,
    selected_post = -1,
    selected_world = false,
    mvMatrix = mat4.create(),
    mvMatrixStack = [],
    pMatrix = mat4.create(),
    obj_cursor = {},
    obj_user,
    USER_FRAME_COLOR,
    USER_CAPTION_BACK = "#CCCCCC",
    USER_CAPTION_COLOR = "#000000",
    obj_world,
    STAND_COLOR,
    sphereVertexNormalBuffer,
    sphereVertexTextureCoordBuffer,
    sphereVertexPositionBuffer,
    sphereVertexIndexBuffer,
    standVertexNormalBuffer = [],
    standVertexPositionBuffer = [],
    standVertexIndexBuffer = [],
    stripVertexPositionBuffer,
    boxVertexPositionBuffer = [],
    posts = [],
    word_map = {},
    words = [],
    bookshelves = [],
    bookshelf_position_buffers = [],
    bookshelf_color,
    book_position_buffer,
    book_feeds = [],
    bookshelf_rows = [0, 0, 0, 0, 0, 0, 0],
    bookshelf_row = -1,
    photowalls = [],
    photowall_position_buffers = [],
    mapwall_position_buffers = [],
    photowall_color,
    image_queue, pointerLocked;

  function handleLoadedTexture(texture, image, normal) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    if (!normal) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  image_queue = {
    IMG_TEXTURE: 1,
    IMG_OBJ: 2,
    IMG_LOCAL: 0,
    IMG_CORS: 1,
    IMG_PROXY: 2,
    MAX_PARALLEL: 2,
    MAX_RETRIES: 5,
    queue: [],
    loading: 0,
    queue_image:
      function (img_url, img_type, retry, data) {
        this.queue.push([img_url, img_type, retry, data]);
      },
    empty_queue:
      function () {
        this.queue.length = 0;
        this.loading = 0;
      },
    load_next:
      function () {
        if (this.loading < this.MAX_PARALLEL) {
          if (this.queue.length > 0) {
            var this_ref, next, image;
            this_ref = this;
            next = this.queue.shift();
            next[4] = this.IMG_PROXY;
            if (next[0].indexOf("://") >= 0) {
              if (next[0].indexOf("googleusercontent.com") >= 0) {
                if (next[0].indexOf("opensocial.googleusercontent.com") >= 0) {
                  next[4] = this.IMG_PROXY;
                } else {
                  next[4] = this.IMG_CORS;
                }
              } else {
                next[4] = this.IMG_PROXY;
              }
            } else {
              next[4] = this.IMG_LOCAL;
            }
            if (next[4] == this.IMG_PROXY) { this.loading++; }
            image = new Image();
            image.onload = function () {
              if (next[1] == this_ref.IMG_TEXTURE) {
                handleLoadedTexture(next[3][0], image, next[3][1]);
              }
              if (next[1] == this_ref.IMG_OBJ) {
                next[3][0].draw_image(image, next[3][1], next[3][2]);
                next[3][0].create_texture();
              }
              if (next[4] == this_ref.IMG_PROXY) { this_ref.loading--; }
            };
            image.onerror = function () {
              if (next[2] < this_ref.MAX_RETRIES) { this_ref.queue_image(next[0], next[1], next[2] + 1, next[3]); }
              if (next[4] == this_ref.IMG_PROXY) { this_ref.loading--; }
            };
            image.onabort = function () {
              if (next[2] < this_ref.MAX_RETRIES) { this_ref.queue_image(next[0], next[1], next[2] + 1, next[3]); }
              if (next[4] == this_ref.IMG_PROXY) { this_ref.loading--; }
            };
            if (next[4] == this.IMG_CORS) {
              image.crossOrigin = '';
            }
            if (next[4] == this.IMG_PROXY) {
              image.src = base_url + "image.php?file=" + encodeURIComponent(next[0]);
            } else {
              image.src = next[0];
            }
          }
        }
      }
  };

  function init_texture(texture, pic, normal) {
    image_queue.queue_image(pic, image_queue.IMG_TEXTURE, 0, [texture, normal]);
  }


  function initGL(canvas) {
    try {
      gl = canvas.getContext("experimental-webgl");
      gl.viewportWidth = canvas.width;
      gl.viewportHeight = canvas.height;
    } catch (e) {}
    if (!gl) {
      $("#pr_errors").html("Could not initialise WebGL.<br />Check out <a href=\"http://learningwebgl.com/blog/?p=11\">this tutorial</a> to make sure your system supports WebGL.");
      window.document.title = "ProfileRoom+ / Error";
      $("#pr_main").hide();
      $("#pr_details").hide();
      $("#pr_instructions").hide();
      $("#pr_username").html("");
      $("#pr_userform").html("");
      $("#pr_userform").hide();
    }
  }

  function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
  }

  function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
  }

  function setMatrixUniforms() {
    gl.uniformMatrix4fv(current_shader.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(current_shader.mvMatrixUniform, false, mvMatrix);
    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(current_shader.nMatrixUniform, false, normalMatrix);
  }

  // -------------------------------------------------------------------------
  // ------------------------------- SHADERS ---------------------------------
  // -------------------------------------------------------------------------

  function getShader(gl, id) {
    var
      shaderScript = document.getElementById(id),
      str = "",
      k = shaderScript.firstChild,
      shader;

    if (!shaderScript) {
      return null;
    }

    while (k) {
      if (k.nodeType == 3) {
        str += k.textContent;
      }
      k = k.nextSibling;
    }

    if (shaderScript.type == "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
      return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      $("#pr_errors").append(gl.getShaderInfoLog(shader) + "<br />");
      document.title = "ProfileRoom+ / Error";
      $("#pr_main").hide();
      $("#pr_instructions").hide();
      $("#pr_details").hide();
      $("#pr_userform").html("");
      $("#pr_username").html("");
      $("#pr_userform").hide();
      return null;
    }
    return shader;
  }

  function createProgram(fragmentShaderID, vertexShaderID) {
    var
      fragmentShader = getShader(gl, fragmentShaderID),
      vertexShader = getShader(gl, vertexShaderID),
      program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      $("#pr_errors").append("Could not initialise shaders<br>");
      document.title = "ProfileRoom+ / Error";
      $("#pr_main").hide();
      $("#pr_instructions").hide();
      $("#pr_details").hide();
      $("#pr_userform").html("");
      $("#pr_username").html("");
      $("#pr_userform").hide();
    }

    program.vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(program.vertexPositionAttribute);

    program.vertexNormalAttribute = gl.getAttribLocation(program, "aVertexNormal");
    gl.enableVertexAttribArray(program.vertexNormalAttribute);

    program.textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
    gl.enableVertexAttribArray(program.textureCoordAttribute);

    program.pMatrixUniform = gl.getUniformLocation(program, "uPMatrix");
    program.mvMatrixUniform = gl.getUniformLocation(program, "uMVMatrix");
    program.nMatrixUniform = gl.getUniformLocation(program, "uNMatrix");
    program.samplerUniform = gl.getUniformLocation(program, "uSampler");
    program.ambientColorUniform = gl.getUniformLocation(program, "uAmbientColor");
    program.useTextureUniform = gl.getUniformLocation(program, "uUseTexture");
    program.useLightingUniform = gl.getUniformLocation(program, "uUseLighting");
    program.pointLightingLocationUniform = gl.getUniformLocation(program, "uPointLightingLocation");
    program.pointLightingColorUniform = gl.getUniformLocation(program, "uPointLightingColor");
    program.colorUniform = gl.getUniformLocation(program, "uColor");

    return program;
  }

  function initShaders() {
    vertex_shader = createProgram("per-vertex-lighting-fs", "per-vertex-lighting-vs");
    fragment_shader = createProgram("per-fragment-lighting-fs", "per-fragment-lighting-vs");
  }

  function initCursor() {
    var vertices = [0.0000, -0.0005, -0.1,  0.0005, 0.0000, -0.1,  0.0000, 0.0005, -0.1,  -0.0005, 0.0000, -0.1];
    obj_cursor.position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj_cursor.position_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    obj_cursor.position_buffer.itemSize = 3;
    obj_cursor.position_buffer.numItems = 4;
    obj_cursor.normal = SIDE_FRONT;
    obj_cursor.color = new Float32Array([1.0, 1.0, 0.0, 1.0]);
  }

  function initWallBuffers() {
    var i, vertices;
    i = 0;
    // wall at the back
    wallPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallPositionBuffer[i]);
    vertices = [-27, -0.2, -27,  27, -0.2, -27,  27, 2.2, -27,  -27, 2.2, -27];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    wallPositionBuffer[i].itemSize = 3;
    wallPositionBuffer[i].numItems = 4;
    wallPositionBuffer[i].normal = SIDE_FRONT;

    wall_texture[i] = gl.createTexture();
    init_texture(wall_texture[i], base_url + "images/wall1.gif", true);

    i = 1;
    // wall at the left
    wallPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallPositionBuffer[i]);
    vertices = [-27, -0.2, 27,  -27, -0.2, -27,  -27,  2.2, -27,  -27,  2.2,  27];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    wallPositionBuffer[i].itemSize = 3;
    wallPositionBuffer[i].numItems = 4;
    wallPositionBuffer[i].normal = SIDE_LEFT;

    wall_texture[i] = gl.createTexture();
    init_texture(wall_texture[i], base_url + "images/wall1.gif", true);

    i = 2;
    // wall at the front
    wallPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallPositionBuffer[i]);
    vertices = [27, -0.2,  27,  -27, -0.2,  27,  -27,  2.2,  27,  27,  2.2,  27];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    wallPositionBuffer[i].itemSize = 3;
    wallPositionBuffer[i].numItems = 4;
    wallPositionBuffer[i].normal = SIDE_BACK;

    wall_texture[i] = gl.createTexture();
    init_texture(wall_texture[i], base_url + "images/wall1.gif", true);

    i = 3;
    // wall at the right
    wallPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallPositionBuffer[3]);
    vertices = [27, -0.2, -27,  27, -0.2, 27,  27, 2.2, 27,  27, 2.2, -27];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    wallPositionBuffer[i].itemSize = 3;
    wallPositionBuffer[i].numItems = 4;
    wallPositionBuffer[i].normal = SIDE_RIGHT;

    wall_texture[i] = gl.createTexture();
    init_texture(wall_texture[i], base_url + "images/wall1.gif", true);

    i = 4;
    // floor
    wallPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallPositionBuffer[i]);
    vertices = [-27, -0.2, 27,  27, -0.2, 27,  27, -0.2, -27,  -27, -0.2, -27];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    wallPositionBuffer[i].itemSize = 3;
    wallPositionBuffer[i].numItems = 4;
    wallPositionBuffer[i].normal = SIDE_TOP;

    wall_texture[i] = gl.createTexture();
    init_texture(wall_texture[i], base_url + "images/floor.png", true);

    i = 5;
    // ceiling
    wallPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallPositionBuffer[i]);
    vertices = [-27, 2.2, -27,  27, 2.2, -27,  27, 2.2, 27,  -27, 2.2, 27];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    wallPositionBuffer[i].itemSize = 3;
    wallPositionBuffer[i].numItems = 4;
    wallPositionBuffer[i].normal = SIDE_BOTTOM;

    wall_texture[i] = gl.createTexture();
    init_texture(wall_texture[i], base_url + "images/wall1.gif", true);
  }

  function init_normal_buffers() {
    var i, normal_coords;

    i = SIDE_FRONT;
    normal_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[i]);
    normal_coords = [0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0,  0.0,  1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal_coords), gl.STATIC_DRAW);
    normal_buffers[i].itemSize = 3;
    normal_buffers[i].numItems = 4;

    i = SIDE_LEFT;
    normal_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[i]);
    normal_coords = [1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal_coords), gl.STATIC_DRAW);
    normal_buffers[i].itemSize = 3;
    normal_buffers[i].numItems = 4;

    i = SIDE_BACK;
    normal_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[i]);
    normal_coords = [0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal_coords), gl.STATIC_DRAW);
    normal_buffers[i].itemSize = 3;
    normal_buffers[i].numItems = 4;

    i = SIDE_RIGHT;
    normal_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[i]);
    normal_coords = [-1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal_coords), gl.STATIC_DRAW);
    normal_buffers[i].itemSize = 3;
    normal_buffers[i].numItems = 4;

    i = SIDE_BOTTOM;
    normal_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[i]);
    normal_coords = [0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal_coords), gl.STATIC_DRAW);
    normal_buffers[i].itemSize = 3;
    normal_buffers[i].numItems = 4;

    i = SIDE_TOP;
    normal_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[i]);
    normal_coords = [0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal_coords), gl.STATIC_DRAW);
    normal_buffers[i].itemSize = 3;
    normal_buffers[i].numItems = 4;
  }

  function initProfilePositionBuffer(i, x, y, w, h, z) {
    var vertices;
    profilePositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, profilePositionBuffer[i]);
    vertices = [x, y, z,  x + w, y, z,  x + w, y + h, z,  x, y + h, z];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    profilePositionBuffer[i].itemSize = 3;
    profilePositionBuffer[i].numItems = 4;
    profilePositionBuffer[i].x = x;
    profilePositionBuffer[i].y = y;
    profilePositionBuffer[i].w = w;
    profilePositionBuffer[i].h = h;
  }

  // -------------------------------------------------------------------
  // ------------------------ ACTIVE USER ------------------------------
  // -------------------------------------------------------------------

  function User() {
    var vertices;
    this.txt_id = "";
    this.txt_name = "";
    this.txt_pic = "";
    this.txt_link = "";

    this.position_buffer_user = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer_user);
    vertices = [-1, 0, 0.01,  1, 0, 0.01,  1, 2, 0.01,  -1, 2, 0.01];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    this.position_buffer_user.itemSize = 3;
    this.position_buffer_user.numItems = 4;

    this.position_buffer_frame = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer_frame);
    vertices = [-1.2, -0.2, 0,  1.2, -0.2, 0,  1.2, 2.2, 0,  -1.2, 2.2, 0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    this.position_buffer_frame.itemSize = 3;
    this.position_buffer_frame.numItems = 4;

    this.position_buffer_caption = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer_caption);
    vertices = [-1.0, 2.0, 0.01,  1.0, 2.0, 0.01,  1.0, 2.2, 0.01,  -1.0, 2.2, 0.01];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    this.position_buffer_caption.itemSize = 3;
    this.position_buffer_caption.numItems = 4;

    this.caption_canvas  = document.createElement("canvas");
    this.caption_canvas.width = 200;
    this.caption_canvas.height = 20;
    this.caption_ctx = this.caption_canvas.getContext("2d");

    this.set_user("", "No user selected", "", "");
  }

  User.prototype.set_user = function (txt_id, txt_name, txt_pic, txt_link) {
    var ctx, left;

    this.txt_id = "";
    this.txt_name = txt_name;
    this.txt_pic = txt_pic;
    this.txt_link = txt_link;

    try { gl.deleteTexture(this.user_texture); } catch (e1) { }
    try { gl.deleteTexture(this.caption_texture); } catch (e2) { }

    if (this.txt_pic != "") {
      this.user_texture = gl.createTexture();
      init_texture(this.user_texture, this.txt_pic, false);
    }

    this.caption_texture = gl.createTexture();
    ctx = this.caption_ctx;

    ctx.fillStyle = USER_CAPTION_BACK;
    ctx.fillRect(0, 0, this.caption_canvas.width, this.caption_canvas.height);
    ctx.fillStyle = USER_CAPTION_COLOR;
    ctx.font = "16px sans-serif";
    ctx.textBaseline = "top";
    left = (this.caption_canvas.width - ctx.measureText(this.txt_name).width) / 2;
    if (left < 1) { left = 1; }
    ctx.fillText(this.txt_name, left, 2);

    gl.bindTexture(gl.TEXTURE_2D, this.caption_texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.caption_canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.txt_id = txt_id;
  };

  User.prototype.draw = function () {
    var profile_rot = 0;
    if (zPos != 0) {
      profile_rot = Math.atan2(xPos, zPos);
    } else {
      if (xPos < 0) {
        profile_rot = degToRad(-90);
      } else {
        profile_rot = degToRad(90);
      }
    }
    current_shader = fragment_shader;
    gl.useProgram(current_shader);
    mat4.rotate(mvMatrix, profile_rot, [0, 1, 0]);
    setMatrixUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[SIDE_FRONT]);
    gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[SIDE_FRONT].itemSize, gl.FLOAT, false, 0, 0);

    // Frame
    gl.uniform1i(current_shader.useTextureUniform, false);
    gl.uniform4fv(current_shader.colorUniform, USER_FRAME_COLOR);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer_frame);
    gl.vertexAttribPointer(current_shader.vertexPositionAttribute, this.position_buffer_frame.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);

    // Caption
    gl.uniform1i(current_shader.useTextureUniform, true);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer_caption);
    gl.vertexAttribPointer(current_shader.vertexPositionAttribute, this.position_buffer_caption.itemSize, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.caption_texture);
    gl.uniform1i(current_shader.samplerUniform, 0);
    gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);

    if (this.txt_id != "") {
      // User
      gl.uniform1i(current_shader.useTextureUniform, true);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer_user);
      gl.vertexAttribPointer(current_shader.vertexPositionAttribute, this.position_buffer_user.itemSize, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.user_texture);
      gl.uniform1i(current_shader.samplerUniform, 0);
      gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    mat4.rotate(mvMatrix, -profile_rot, [0, 1, 0]);
  };

  // -------------------------------------------------------------------
  // --------------------------- WORLD ---------------------------------
  // -------------------------------------------------------------------

  function World(x, z, r) {
    this.x = x;
    this.y = 0.8;
    this.z = z;
    this.r = r;
    this.loaded = false;
    this.locations = [];

    this.texture = gl.createTexture();
    this.texture_canvas  = document.createElement("canvas");
    this.texture_canvas.width = 1024;
    this.texture_canvas.height = 512;
    this.texture_ctx = this.texture_canvas.getContext("2d");
    this.image = new Image();
    var this_world = this;

    this.image.onload = function () {
      this_world.loaded = true;
      this_world.refresh_texture();
    };
    this.image.src = base_url + "images/earth.jpg";
  }

  World.prototype.refresh_texture = function () {
    var marker_size, l;
    if (this.texture_ctx != undefined) {
      if (this.loaded == true) {
        this.texture_ctx.drawImage(this.image, 0, 0);
        marker_size = 5;
        for (l = 0; l < this.locations.length; l++) {
          if (this.locations[l][2] == 1) {
            this.texture_ctx.fillStyle = "#FFFF00";
            marker_size = 3;
          } else {
            this.texture_ctx.fillStyle = "#FF0000";
            marker_size = 5;
          }
          this.texture_ctx.beginPath();
          this.texture_ctx.arc(512 + this.locations[l][1] / 360 * 1024, 256 - this.locations[l][0] / 180 * 512, marker_size, 0, Math.PI * 2, true);
          this.texture_ctx.closePath();
          this.texture_ctx.fill();
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.texture_canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
    }
  };

  World.prototype.add_location = function (latlng, t) {
    this.locations[this.locations.length] = latlng.split(" ");
    this.locations[this.locations.length - 1][2] = t;
  };

  World.prototype.clear_locations = function () {
    var i;
    for (i = 0; i < this.locations.length; i++) {
      this.locations[i].length = 0;
    }
    this.locations.length = 0;
  };

  World.prototype.spin = function (s) {
    this.r += s;
    if (this.r > 360) { this.r -= 360; }
    if (this.r < -360) { this.r += 360; }
  };

  World.prototype.draw = function () {
    var i;
    mvPushMatrix();
    mat4.translate(mvMatrix, [this.x, this.y, this.z]);
    mvPushMatrix();
    mat4.rotate(mvMatrix, degToRad(-15), [0, 0, 1]);
    mvPushMatrix();
    mat4.rotate(mvMatrix, degToRad(this.r), [0, 1, 0]);
    current_shader = vertex_shader;
    gl.useProgram(current_shader);
    setMatrixUniforms();
    gl.uniform1i(current_shader.useTextureUniform, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(current_shader.samplerUniform, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(current_shader.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexTextureCoordBuffer);
    gl.vertexAttribPointer(current_shader.textureCoordAttribute, sphereVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.vertexAttribPointer(current_shader.vertexNormalAttribute, sphereVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.drawElements(gl.TRIANGLES, sphereVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    mvPopMatrix();
    setMatrixUniforms();
    gl.uniform1i(current_shader.useTextureUniform, false);
    gl.uniform4fv(current_shader.colorUniform, STAND_COLOR);

    for (i = 0; i < standVertexPositionBuffer.length; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, standVertexPositionBuffer[i]);
      gl.vertexAttribPointer(current_shader.vertexPositionAttribute, standVertexPositionBuffer[i].itemSize, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, standVertexNormalBuffer[i]);
      gl.vertexAttribPointer(current_shader.vertexNormalAttribute, standVertexNormalBuffer[i].itemSize, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, standVertexIndexBuffer[i]);
      gl.drawElements(gl.TRIANGLES, standVertexIndexBuffer[i].numItems, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, stripVertexPositionBuffer);
    gl.vertexAttribPointer(current_shader.vertexPositionAttribute, stripVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[SIDE_FRONT]);
    gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[SIDE_FRONT].itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, square_index_buffer);

    for (i = 0; i < 4; i++) {
      mat4.rotate(mvMatrix, degToRad(i * 90), [0, 1, 0]);
      setMatrixUniforms();
      gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    mvPopMatrix();
    setMatrixUniforms();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, square_index_buffer);
    for (i = 0; i < boxVertexPositionBuffer.length; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer[i]);
      gl.vertexAttribPointer(current_shader.vertexPositionAttribute, boxVertexPositionBuffer[i].itemSize, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[boxVertexPositionBuffer[i].normal]);
      gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[boxVertexPositionBuffer[i].normal].itemSize, gl.FLOAT, false, 0, 0);
      gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    mvPopMatrix();
  };

  World.prototype.check_collision = function (x, z) {
    var
      test_x = x - this.x,
      test_z = z - this.z;
    if (test_x * test_x + test_z * test_z < 1) {
      return true;
    } else {
      return false;
    }
  };

  World.prototype.check_cursor = function (x, y, z, yaw, pitch) {
    var
      test_x = x - this.x,
      test_y = y - this.y,
      test_z = z - this.z,
      test_x1 = -0.6,
      test_x2 =  0.6,
      test_y1 = -0.6,
      test_y2 =  0.6,
      test_yaw = degToRad(yaw),
      test_pitch = pitch,
      chk_found = false,
      dist = Math.sqrt(test_x * test_x + test_z * test_z),
      max_angle = Math.atan2(0.7, dist),
      angle = Math.atan2(test_x, test_z),
      test_angle1 = angle + Math.abs(max_angle),
      test_angle2 = angle - Math.abs(max_angle);

    if (test_angle1 < -Math.PI) { test_angle1 += 2 * Math.PI; }
    if (test_angle2 < -Math.PI) { test_angle2 += 2 * Math.PI; }
    if (test_angle1 > Math.PI) { test_angle1 -= 2 * Math.PI; }
    if (test_angle2 > Math.PI) { test_angle2 -= 2 * Math.PI; }
    if (test_angle1 < 0 && test_angle2 > 0) {
      if (test_yaw > 0) {
        test_angle1 += 2 * Math.PI;
      } else {
        test_angle2 -= 2 * Math.PI;
      }
    }

    if (dist < 3) {
      if (test_yaw < test_angle1 && test_yaw > test_angle2) {
        if (Math.abs(degToRad(pitch)) < Math.abs(max_angle * 1.5)) {
          chk_found = true;
        }
      }
    }

    return chk_found;
  };

  function initWorld() {
    var
      latitudeBands, longitudeBands, radius, vertexPositionData, normalData, indexData, textureCoordData, latNumber, longNumber,
      theta, sinTheta, cosTheta, phi, sinPhi, cosPhi, x, y, z, u, v, first, second, i, vertices;

    latitudeBands = 30;
    longitudeBands = 30;
    radius = 0.7;
    vertexPositionData = [];
    normalData = [];
    textureCoordData = [];
    for (latNumber = 0; latNumber <= latitudeBands; latNumber++) {
      theta = latNumber * Math.PI / latitudeBands;
      sinTheta = Math.sin(theta);
      cosTheta = Math.cos(theta);

      for (longNumber = 0; longNumber <= longitudeBands; longNumber++) {
        phi = longNumber * 2 * Math.PI / longitudeBands;
        sinPhi = Math.sin(phi);
        cosPhi = Math.cos(phi);

        x = cosPhi * sinTheta;
        y = cosTheta;
        z = sinPhi * sinTheta;
        u = 1 - (longNumber / longitudeBands);
        v = 1 - (latNumber / latitudeBands);

        normalData.push(x);
        normalData.push(y);
        normalData.push(z);
        textureCoordData.push(u);
        textureCoordData.push(v);
        vertexPositionData.push(radius * x);
        vertexPositionData.push(radius * y);
        vertexPositionData.push(radius * z);
      }
    }

    indexData = [];
    for (latNumber = 0; latNumber < latitudeBands; latNumber++) {
      for (longNumber = 0; longNumber < longitudeBands; longNumber++) {
        first = (latNumber * (longitudeBands + 1)) + longNumber;
        second = first + longitudeBands + 1;
        indexData.push(first);
        indexData.push(second);
        indexData.push(first + 1);

        indexData.push(second);
        indexData.push(second + 1);
        indexData.push(first + 1);
      }
    }

    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = normalData.length / 3;

    sphereVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
    sphereVertexTextureCoordBuffer.itemSize = 2;
    sphereVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    sphereVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    sphereVertexIndexBuffer.itemSize = 1;
    sphereVertexIndexBuffer.numItems = indexData.length;


    latitudeBands = 30;
    longitudeBands = 2;
    radius = 0.75;

    vertexPositionData = [];
    normalData = [];
    for (latNumber = 0; latNumber <= latitudeBands; latNumber++) {
      theta = latNumber * Math.PI / latitudeBands;
      sinTheta = Math.sin(theta);
      cosTheta = Math.cos(theta);

      for (longNumber = 0; longNumber <= longitudeBands; longNumber++) {
        phi = longNumber * 2 * Math.PI / longitudeBands / 20;
        sinPhi = Math.sin(phi);
        cosPhi = Math.cos(phi);

        x = cosPhi * sinTheta;
        y = cosTheta;
        z = sinPhi * sinTheta;

        normalData.push(x);
        normalData.push(y);
        normalData.push(z);
        vertexPositionData.push(radius * x);
        vertexPositionData.push(radius * y);
        vertexPositionData.push(radius * z);
      }
    }

    indexData = [];
    for (latNumber = 0; latNumber < latitudeBands; latNumber++) {
      for (longNumber = 0; longNumber < longitudeBands; longNumber++) {
        first = (latNumber * (longitudeBands + 1)) + longNumber;
        second = first + longitudeBands + 1;
        indexData.push(first);
        indexData.push(second);
        indexData.push(first + 1);

        indexData.push(second);
        indexData.push(second + 1);
        indexData.push(first + 1);
      }
    }

    standVertexNormalBuffer[0] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, standVertexNormalBuffer[0]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    standVertexNormalBuffer[0].itemSize = 3;
    standVertexNormalBuffer[0].numItems = normalData.length / 3;

    standVertexPositionBuffer[0] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, standVertexPositionBuffer[0]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    standVertexPositionBuffer[0].itemSize = 3;
    standVertexPositionBuffer[0].numItems = vertexPositionData.length / 3;

    standVertexIndexBuffer[0] = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, standVertexIndexBuffer[0]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    standVertexIndexBuffer[0].itemSize = 1;
    standVertexIndexBuffer[0].numItems = indexData.length;

    latitudeBands = 30;
    longitudeBands = 30;
    radius = 0.75;

    vertexPositionData = [];
    normalData = [];
    for (latNumber = 0; latNumber <= 2; latNumber++) {
      theta = latNumber * Math.PI / latitudeBands;
      sinTheta = Math.sin(theta);
      cosTheta = Math.cos(theta);

      for (longNumber = 0; longNumber <= longitudeBands; longNumber++) {
        phi = longNumber * 2 * Math.PI / longitudeBands;
        sinPhi = Math.sin(phi);
        cosPhi = Math.cos(phi);

        x = cosPhi * sinTheta;
        y = cosTheta;
        z = sinPhi * sinTheta;

        normalData.push(x);
        normalData.push(y);
        normalData.push(z);
        vertexPositionData.push(radius * x);
        vertexPositionData.push(radius * y);
        vertexPositionData.push(radius * z);
      }
    }

    indexData = [];
    for (latNumber = 0; latNumber < 2; latNumber++) {
      for (longNumber = 0; longNumber < longitudeBands; longNumber++) {
        first = (latNumber * (longitudeBands + 1)) + longNumber;
        second = first + longitudeBands + 1;
        indexData.push(first);
        indexData.push(second);
        indexData.push(first + 1);

        indexData.push(second);
        indexData.push(second + 1);
        indexData.push(first + 1);
      }
    }

    standVertexNormalBuffer[1] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, standVertexNormalBuffer[1]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    standVertexNormalBuffer[1].itemSize = 3;
    standVertexNormalBuffer[1].numItems = normalData.length / 3;

    standVertexPositionBuffer[1] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, standVertexPositionBuffer[1]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    standVertexPositionBuffer[1].itemSize = 3;
    standVertexPositionBuffer[1].numItems = vertexPositionData.length / 3;

    standVertexIndexBuffer[1] = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, standVertexIndexBuffer[1]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    standVertexIndexBuffer[1].itemSize = 1;
    standVertexIndexBuffer[1].numItems = indexData.length;

    vertexPositionData = [];
    normalData = [];
    for (latNumber = latitudeBands - 2; latNumber <= latitudeBands; latNumber++) {
      theta = latNumber * Math.PI / latitudeBands;
      sinTheta = Math.sin(theta);
      cosTheta = Math.cos(theta);

      for (longNumber = 0; longNumber <= longitudeBands; longNumber++) {
        phi = longNumber * 2 * Math.PI / longitudeBands;
        sinPhi = Math.sin(phi);
        cosPhi = Math.cos(phi);

        x = cosPhi * sinTheta;
        y = cosTheta;
        z = sinPhi * sinTheta;

        normalData.push(x);
        normalData.push(y);
        normalData.push(z);
        vertexPositionData.push(radius * x);
        vertexPositionData.push(radius * y);
        vertexPositionData.push(radius * z);
      }
    }

    indexData = [];
    for (latNumber = 0; latNumber < 2; latNumber++) {
      for (longNumber = 0; longNumber < longitudeBands; longNumber++) {
        first = (latNumber * (longitudeBands + 1)) + longNumber;
        second = first + longitudeBands + 1;
        indexData.push(first);
        indexData.push(second);
        indexData.push(first + 1);

        indexData.push(second);
        indexData.push(second + 1);
        indexData.push(first + 1);
      }
    }

    standVertexNormalBuffer[2] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, standVertexNormalBuffer[2]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    standVertexNormalBuffer[2].itemSize = 3;
    standVertexNormalBuffer[2].numItems = normalData.length / 3;

    standVertexPositionBuffer[2] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, standVertexPositionBuffer[2]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    standVertexPositionBuffer[2].itemSize = 3;
    standVertexPositionBuffer[2].numItems = vertexPositionData.length / 3;

    standVertexIndexBuffer[2] = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, standVertexIndexBuffer[2]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    standVertexIndexBuffer[2].itemSize = 1;
    standVertexIndexBuffer[2].numItems = indexData.length;

    stripVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, stripVertexPositionBuffer);
    vertices = [-0.01, -0.749, 0.01,  0.01, -0.749, 0.01,  0.01, 0.749, 0.01,  -0.01, 0.749, 0.01];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    stripVertexPositionBuffer.itemSize = 3;
    stripVertexPositionBuffer.numItems = 4;

    i = 0;

    boxVertexPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer[i]);
    vertices = [-0.5, -0.751, 0.5,  0.5, -0.751, 0.5,  0.5, -0.751, -0.5,  -0.5, -0.751, -0.5];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    boxVertexPositionBuffer[i].itemSize = 3;
    boxVertexPositionBuffer[i].numItems = 4;
    boxVertexPositionBuffer[i].normal = SIDE_TOP;

    i++;
    boxVertexPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer[i]);
    vertices = [-0.5, -0.799, 0.5,  0.5, -0.799, 0.5,  0.5, -0.751, 0.5,  -0.5, -0.751, 0.5];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    boxVertexPositionBuffer[i].itemSize = 3;
    boxVertexPositionBuffer[i].numItems = 4;
    boxVertexPositionBuffer[i].normal = SIDE_FRONT;

    i++;
    boxVertexPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer[i]);
    vertices = [0.5, -0.799, -0.5,  -0.5, -0.799, -0.5,  -0.5, -0.751, -0.5,  0.5, -0.751, -0.5];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    boxVertexPositionBuffer[i].itemSize = 3;
    boxVertexPositionBuffer[i].numItems = 4;
    boxVertexPositionBuffer[i].normal = SIDE_BACK;

    i++;
    boxVertexPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer[i]);
    vertices = [0.5, -0.799, 0.5,  0.5, -0.799, -0.5,  0.5, -0.751, -0.5,  0.5, -0.751, 0.5];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    boxVertexPositionBuffer[i].itemSize = 3;
    boxVertexPositionBuffer[i].numItems = 4;
    boxVertexPositionBuffer[i].normal = SIDE_RIGHT;

    i++;
    boxVertexPositionBuffer[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer[i]);
    vertices = [-0.5, -0.799, -0.5,  -0.5, -0.799, 0.5,  -0.5, -0.751, 0.5,  -0.5, -0.751, -0.5];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    boxVertexPositionBuffer[i].itemSize = 3;
    boxVertexPositionBuffer[i].numItems = 4;
    boxVertexPositionBuffer[i].normal = SIDE_LEFT;

    obj_world = new World(-13, -13, 90);
  }

  // -------------------------------------------------------------------
  // --------------------------- POSTS ---------------------------------
  // -------------------------------------------------------------------

  function Post(y, z, link, text, date, image) {
    var vertices, ctx, y_row, str_text, lines, l, w, word, count, line_words;

    this.x = 26.99;
    this.y = y;
    this.z = z;
    this.w = 0.8;
    this.h = 1.0;
    this.link = link;
    this.text = text;
    this.date = date;
    this.image = image;
    this.texture = gl.createTexture();

    this.texture_canvas = document.createElement("canvas");
    this.texture_canvas.width = 400;
    this.texture_canvas.height = 500;
    this.texture_ctx = this.texture_canvas.getContext("2d");

    this.position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
    vertices = [
      this.x, this.y,           this.z,
      this.x, this.y,           this.z + this.w,
      this.x, this.y + this.h,  this.z + this.w,
      this.x, this.y + this.h,  this.z
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    this.position_buffer.itemSize = 3;
    this.position_buffer.numItems = 4;

    // write post to canvas
    ctx = this.texture_ctx;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(2, 2, this.texture_canvas.width - 4, this.texture_canvas.height - 4);
    ctx.fillStyle = "#000000";
    ctx.font = "16px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(this.date, this.texture_canvas.width - ctx.measureText(this.date).width - 5, 5);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(5, 25);
    ctx.lineTo(this.texture_canvas.width - 5, 25);
    ctx.stroke();
    ctx.closePath();

    y_row = 30;

    ctx.fillStyle = "#000000";
    ctx.font = "20px sans-serif";

    str_text = this.text;
    str_text = str_text.replace(/<br>/gi, "\n");
    str_text = str_text.replace(/<br \/>/gi, "\n");
    str_text = str_text.replace(/<br\/>/gi, "\n");
    str_text = $("<div/>").html(str_text).text();

    lines = str_text.split("\n");
    for (l = 0; l < lines.length; l++) {
      line_words = lines[l].split(" ");
      for (w = 0; w < line_words.length; w++) {
        word = line_words[w].toLowerCase();
        count = word_map[word];
        if (count == null) { count = 0; }
        count++;
        word_map[word] = count;
      }
      ctx.fillText(lines[l], 5, y_row);
      y_row += 25;
    }

    if (this.image != "") {
      image_queue.queue_image(this.image, image_queue.IMG_OBJ, 0, [this, 5, y_row]);
      this.create_texture();
    } else {
      this.create_texture();
    }
  }

  Post.prototype.draw_image = function (img, x, y) {
    var
      ctx = this.texture_ctx,
      can = this.texture_canvas,
      y_row, str_text, lines, l;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(2, 2, can.width - 4, can.height - 4);
    ctx.fillStyle = "#000000";
    ctx.font = "16px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(this.date, can.width - ctx.measureText(this.date).width - 5, 5);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(5, 25);
    ctx.lineTo(can.width - 5, 25);
    ctx.stroke();
    ctx.closePath();

    y_row = 30;

    ctx.fillStyle = "#000000";
    ctx.font = "20px sans-serif";

    str_text = this.text;
    str_text = str_text.replace(/<br>/gi, "\n");
    str_text = str_text.replace(/<br \/>/gi, "\n");
    str_text = str_text.replace(/<br\/>/gi, "\n");
    str_text = $("<div/>").html(str_text).text();

    lines = str_text.split("\n");
    for (l = 0; l < lines.length; l++) {
      ctx.fillText(lines[l], 5, y_row);
      y_row += 25;
    }

    ctx.drawImage(img, x, y, 380, 380 * img.height / img.width);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(0, can.height - 1);
    ctx.lineTo(can.width, can.height - 1);
    ctx.stroke();
    ctx.closePath();
  };

  Post.prototype.create_texture = function () {
    // bind canvas to texture
    try { gl.deleteTexture(this.texture); } catch (e) { }
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.texture_canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  Post.prototype.get_html = function () {
    var str_text = "";
    str_text += "<div style=\"text-align:left; word-wrap:break-word;\">";
    str_text += "<a href=\"" + this.link + "\">Post from " + this.date + "</a><br /><br />";
    str_text += this.text;
    if (this.image != "") {
      str_text += "<br /><br /><img src=\"" + this.image + "\">";
    }
    str_text += "</div>";
    return str_text;
  };

  Post.prototype.check_cursor = function (y_wall, z_wall) {
    var test_y1, test_y2, test_z1, test_z2;
    test_y1 = this.y;
    test_y2 = this.y + this.h;
    test_z1 = this.z;
    test_z2 = this.z + this.w;
    if (z_wall >= test_z1 && z_wall <= test_z2 && y_wall >= test_y1 && y_wall <= test_y2) {
      return true;
    } else {
      return false;
    }
  };

  Post.prototype.clean_buffers = function () {
    var i;
    gl.deleteBuffer(this.position_buffer);

    for (i = 0; i < this.texture.length; i++) {
      gl.deleteTexture(this.texture[i]);
    }
    this.texture.length = 0;
  };

  function fetch_posts(user) {
    var feed_url;
    feed_url = "https://www.googleapis.com/plus/v1/people/" + user + "/activities/public?maxResults=100&key=" + API_KEY;

    $.get(feed_url, function (data) {
      if (data.items != undefined) {
        $.each(data.items, function (i, item) {
          var post_date, post_link, post_text, post_image, p, u, x, y, z, user_thumb, user_name, user_id, user_profile, a;
          post_date = item.published.substring(0, 10) + " " + item.published.substring(11, 19);
          post_link = item.url;
          post_text = item.object.content;
          post_image = "";

          if (item.object.actor != undefined) {
            post_text = "Reshared post by " + item.object.actor.displayName + ":<br>" + post_text;
            if (item.annotation != undefined) {
              post_text = item.annotation + "<br><br>" + post_text;
            }

            p = profilePositionBuffer.length;
            user_thumb = "";
            user_name = "";
            user_id = "";
            user_profile = "";

            if (item.object.actor.id != undefined) {
              user_id = item.object.actor.id;
            }

            if (displayed_users[user_id] == undefined && user_id != user) {
              displayed_users[user_id] = 1;
              u = p;
              while (u >= 50) { u -= 50; }
              if (u % 2 == 0) {
                y = 0;
              } else {
                y = 1;
                u--;
              }
              u = u / 2;
              x = u;

              initProfilePositionBuffer(p, x + 0.1, y + 0.1, 0.8, 0.8, -26.99);

              if (item.object.actor.image != undefined) {
                user_thumb = item.object.actor.image.url;
              } else {
                user_thumb = base_url + "images/noimage.jpg";
              }
              if (user_thumb == "") {
                user_thumb = base_url + "images/noimage.jpg";
              }
              if (user_thumb == "http://www.google.com/friendconnect/scs/images/NoPictureDark65.jpg") {
                user_thumb = base_url + "images/noimage.jpg";
              } else {
                user_thumb = user_thumb.replace("http://www.google.com/s2/", "https://www.google.com/s2/");
                user_thumb = user_thumb.replace("?sz=50", "?sz=200");
              }
              if (item.object.actor.displayName != undefined) {
                user_name = item.object.actor.displayName;
              }
              if (item.object.actor.url != undefined) {
                user_profile = item.object.actor.url;
              }
              profile_texture[p] = gl.createTexture();
              init_texture(profile_texture[p], user_thumb, false);
              profilePositionBuffer[p].user_name = user_name;
              profilePositionBuffer[p].user_id = user_id;
              profilePositionBuffer[p].user_profile = user_profile;
              profilePositionBuffer[p].user_thumb = user_thumb;
            }
          }

          if (item.object.attachments != undefined) {
            for (a = 0; a < item.object.attachments.length; a++) {
              if (item.object.attachments[a].objectType == "photo") {
                post_image = item.object.attachments[a].fullImage.url;
                break;
              }
            }
          }

          y = 1.05 - 1.05 * (i % 2);
          z = -26 + 1.05 * Math.floor(i / 2);

          if (item.geocode != undefined) {
            if (item.object.actor == undefined) {
              obj_world.add_location(item.geocode, 2);
            }
          }

          posts.push(new Post(y, z, post_link, post_text, post_date, post_image));
        });
        obj_world.refresh_texture();
        var w;
        for (w in word_map) {
          if (word_map.hasOwnProperty(w)) {
            words.push([word_map[w], w]);
          }
        }
        words.sort(function (a, b) {
          return b[0] - a[0];
        });
      }
    }, "jsonp");
  }

  // -------------------------------------------------------------------
  // --------------------------- BOOKS ---------------------------------
  // -------------------------------------------------------------------

  function init_bookshelf_position_buffers() {
    var i, vertices;
    i = 0;
    bookshelf_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bookshelf_position_buffers[i]);
    vertices = [-0.8, 0.0, 0.0,  0.8, 0.0, 0.0,  0.8, 2.2, 0.0,  -0.8, 2.2, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bookshelf_position_buffers[i].itemSize = 3;
    bookshelf_position_buffers[i].numItems = 4;
    bookshelf_position_buffers[i].normal = SIDE_FRONT;

    i = bookshelf_position_buffers.length;
    bookshelf_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bookshelf_position_buffers[i]);
    vertices = [-0.8, 0.0, 0.0,  -0.8, 2.2, 0.0,  -0.8, 2.2, 0.4,  -0.8, 0.0, 0.4];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bookshelf_position_buffers[i].itemSize = 3;
    bookshelf_position_buffers[i].numItems = 4;
    bookshelf_position_buffers[i].normal = SIDE_RIGHT;

    i = bookshelf_position_buffers.length;
    bookshelf_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bookshelf_position_buffers[i]);
    vertices = [0.8, 0.0, 0.0,  0.8, 2.2, 0.0,  0.8, 2.2, 0.4,  0.8, 0.0, 0.4];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bookshelf_position_buffers[i].itemSize = 3;
    bookshelf_position_buffers[i].numItems = 4;
    bookshelf_position_buffers[i].normal = SIDE_LEFT;

    i = bookshelf_position_buffers.length;
    bookshelf_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bookshelf_position_buffers[i]);
    vertices = [-0.8, 2.2, 0.0,  0.8, 2.2, 0.0,  0.8, 2.2, 0.4,  -0.8, 2.2, 0.4];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bookshelf_position_buffers[i].itemSize = 3;
    bookshelf_position_buffers[i].numItems = 4;
    bookshelf_position_buffers[i].normal = SIDE_TOP;

    i = bookshelf_position_buffers.length;
    bookshelf_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bookshelf_position_buffers[i]);
    vertices = [-0.8, 0.001, 0.0,  0.8, 0.001, 0.0,  0.8, 0.001, 0.4,  -0.8, 0.001, 0.4];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bookshelf_position_buffers[i].itemSize = 3;
    bookshelf_position_buffers[i].numItems = 4;
    bookshelf_position_buffers[i].normal = SIDE_BOTTOM;

    i = bookshelf_position_buffers.length;
    bookshelf_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bookshelf_position_buffers[i]);
    vertices = [-0.8, 0.55, 0.0,  0.8, 0.55, 0.0,  0.8, 0.55, 0.4,  -0.8, 0.55, 0.4];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bookshelf_position_buffers[i].itemSize = 3;
    bookshelf_position_buffers[i].numItems = 4;
    bookshelf_position_buffers[i].normal = SIDE_BOTTOM;

    i = bookshelf_position_buffers.length;
    bookshelf_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bookshelf_position_buffers[i]);
    vertices = [-0.8, 1.1, 0.0,  0.8, 1.1, 0.0,  0.8, 1.1, 0.4,  -0.8, 1.1, 0.4];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bookshelf_position_buffers[i].itemSize = 3;
    bookshelf_position_buffers[i].numItems = 4;
    bookshelf_position_buffers[i].normal = SIDE_BOTTOM;

    i = bookshelf_position_buffers.length;
    bookshelf_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bookshelf_position_buffers[i]);
    vertices = [-0.8, 1.65, 0.0,  0.8, 1.65, 0.0,  0.8, 1.65, 0.4,  -0.8, 1.65, 0.4];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bookshelf_position_buffers[i].itemSize = 3;
    bookshelf_position_buffers[i].numItems = 4;
    bookshelf_position_buffers[i].normal = SIDE_TOP;
  }

  function init_book_position_buffer() {
    var vertices;
    book_position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, book_position_buffer);
    vertices = [0.0, 0.0, 0.0,  0.4, 0.0, 0.0,  0.4, 0.5, 0.0,  0.0, 0.5, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    book_position_buffer.itemSize = 3;
    book_position_buffer.numItems = 4;
    book_position_buffer.normal = SIDE_FRONT;
  }

  function Book(x, y, thumb, title, subtitle, author, link) {
    this.x = x;
    this.y = y;
    this.w = 0.4;
    this.h = 0.5;
    this.z = 0.2;
    this.thumb = thumb;
    this.title = title;
    this.subtitle = subtitle;
    this.author = author;
    this.link = link;

    this.texture = gl.createTexture();
    init_texture(this.texture, this.thumb, false);
  }

  Book.prototype.draw = function () {
    mat4.translate(mvMatrix, [this.x, this.y, this.z]);
    setMatrixUniforms();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(current_shader.samplerUniform, 0);

    gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);

    mat4.translate(mvMatrix, [-this.x, -this.y, -this.z]);
    setMatrixUniforms();
  };

  Book.prototype.check_cursor = function (x_wall, y_wall) {
    var test_x1, test_x2, test_y1, test_y2;
    test_x1 = this.x;
    test_x2 = this.x + this.w;
    test_y1 = this.y;
    test_y2 = this.y + this.h;
    if (x_wall >= test_x1 && x_wall <= test_x2 && y_wall >= test_y1 && y_wall <= test_y2) {
      return true;
    } else {
      return false;
    }
  };

  Book.prototype.clean_buffers = function () {
    gl.deleteTexture(this.texture);
  };

  function Bookshelf(x, z, r, id, title) {
    this.x = x;
    this.y = -0.2;
    this.z = z;
    this.r = r;
    this.w = 1.6;
    this.clip_w = 2.0;
    this.t = 0.4;
    this.clip_t1 = -0.6;
    this.clip_t2 = 0.2;
    this.h = 2.2;
    this.id = id;
    this.title = title;
    this.books = [];
  }

  Bookshelf.prototype.add_book = function (books_thumb, books_title, books_subtitle, books_author, books_link) {
    var v, x, y;
    v = this.books.length;
    if (v < 12) {
      x = this.w / 2 - 0.5 * (v % 3 + 1);
      y = 1.652 - 0.55 * (Math.floor(v / 3));
      this.books.push(new Book(x, y, books_thumb, books_title, books_subtitle, books_author, books_link));
    }
  };

  Bookshelf.prototype.draw = function () {
    var i;
    current_shader = fragment_shader;
    gl.useProgram(current_shader);

    mvPushMatrix();
    mat4.translate(mvMatrix, [this.x, this.y, this.z]);
    mat4.rotate(mvMatrix, degToRad(this.r), [0, 1, 0]);

    setMatrixUniforms();

    gl.uniform1i(current_shader.useTextureUniform, false);
    gl.uniform4fv(current_shader.colorUniform, bookshelf_color);

    for (i = 0; i < bookshelf_position_buffers.length; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bookshelf_position_buffers[i]);
      gl.vertexAttribPointer(current_shader.vertexPositionAttribute, bookshelf_position_buffers[i].itemSize, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[bookshelf_position_buffers[i].normal]);
      gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[bookshelf_position_buffers[i].normal].itemSize, gl.FLOAT, false, 0, 0);

      gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    current_shader = vertex_shader;
    gl.useProgram(current_shader);
    gl.uniform1i(current_shader.useTextureUniform, true);
    gl.bindBuffer(gl.ARRAY_BUFFER, book_position_buffer);
    gl.vertexAttribPointer(current_shader.vertexPositionAttribute, book_position_buffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[book_position_buffer.normal]);
    gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[book_position_buffer.normal].itemSize, gl.FLOAT, false, 0, 0);

    for (i = 0; i < this.books.length; i++) {
      this.books[i].draw();
    }

    mvPopMatrix();
  };

  Bookshelf.prototype.clean_buffers = function () {
    var i;
    for (i = 0; i < this.books.length; i++) {
      this.books[i].clean_buffers();
    }
    this.books.length = 0;
  };

  Bookshelf.prototype.check_collision = function (x_pos, z_pos) {
    var test_vec, test_mat;
    test_vec = [x_pos, 0, z_pos];
    test_mat = mat4.create();
    mat4.identity(test_mat);
    mat4.rotate(test_mat, degToRad(-this.r), [0, 1, 0]);
    mat4.translate(test_mat, [-this.x, 0, -this.z]);
    mat4.multiplyVec3(test_mat, test_vec);
    if (test_vec[0] > -this.clip_w / 2 && test_vec[0] < this.clip_w / 2 && test_vec[2] > this.clip_t1 && test_vec[2] < this.clip_t2) {
      return true;
    } else {
      return false;
    }
  };

  Bookshelf.prototype.check_cursor = function (x_pos, y_pos, z_pos, yaw, pitch) {
    var test_vec, test_mat, test_x1, test_x2, test_y1, test_y2, test_yaw, test_pitch, d_wall, found, x_wall, y_wall, i;

    test_vec = [x_pos, y_pos, z_pos];
    test_mat = mat4.create();
    test_x1 = -this.w / 2;
    test_x2 =  this.w / 2;
    test_y1 = -0.2;
    test_y2 =  2.2;
    test_yaw = yaw - this.r;
    test_pitch = pitch;

    mat4.identity(test_mat);
    mat4.rotate(test_mat, degToRad(-this.r), [0, 1, 0]);
    mat4.translate(test_mat, [-this.x, 0, -this.z]);
    mat4.multiplyVec3(test_mat, test_vec);

    found = [-1, -1];
    if (Math.cos(degToRad(test_yaw)) != 0) {
      d_wall = (test_vec[2] - 0.2) / Math.cos(degToRad(test_yaw));
      x_wall = test_vec[0] - Math.sin(degToRad(test_yaw)) * d_wall;
      y_wall = test_vec[1] + Math.sin(degToRad(test_pitch)) * d_wall;

      if (d_wall > 0 && d_wall < 3 && test_vec[2] > 0 && x_wall >= test_x1 && x_wall <= test_x2 && y_wall >= test_y1 && y_wall <= test_y2) {
        for (i = 0; i < this.books.length; i++) {
          if (this.books[i].check_cursor(x_wall, y_wall)) {
            found[0] = i;
            found[1] = d_wall;
            break;
          }
        }
      }
    }
    return found;
  };

  function fetch_books(book_feed_nr) {
    if (book_feed_nr < book_feeds.length) {
      $.get(book_feeds[book_feed_nr][0], function (volumes) {
        var bookshelf_nr;
        if (volumes.items != undefined) {
          $.each(volumes.items, function (v, volume) {
            var books_title, books_author, books_thumb, books_link, books_subtitle, chk_find_row, r, min_row_value;

            books_title = volume.volumeInfo.title;
            books_author = "Unknown Author";
            if (volume.volumeInfo.authors != undefined) {
              books_author = volume.volumeInfo.authors[0];
            }
            books_thumb = "http://books.google.com/googlebooks/images/no_cover_thumb.gif";
            if (volume.volumeInfo.imageLinks != undefined) {
              books_thumb = volume.volumeInfo.imageLinks.thumbnail;
            }
            books_link = volume.volumeInfo.infoLink;
            books_subtitle = "";
            if (volume.volumeInfo.subtitle != undefined) {
              books_subtitle = volume.volumeInfo.subtitle;
            }

            if (v == 0 || v == 12 || v == 24) {
              bookshelf_nr = bookshelves.length;
              chk_find_row = false;
              if (v == 0) {
                if (book_feed_nr == 0) {
                  chk_find_row = true;
                } else {
                  if (book_feeds[book_feed_nr - 1][1] != book_feeds[book_feed_nr][1]) {
                    chk_find_row = true;
                  }
                }
              }
              if (!chk_find_row) {
                if (bookshelf_row >= 0) {
                  if (bookshelf_rows[bookshelf_row] >= 24) {
                    chk_find_row = true;
                  }
                }
              }

              if (chk_find_row) {
                bookshelf_row = -1;
                for (r = 0; r < bookshelf_rows.length; r++) {
                  if (bookshelf_rows[r] == 0) {
                    bookshelf_row = r;
                    break;
                  }
                }
                if (bookshelf_row == -1) {
                  min_row_value = 21;
                  for (r = 0; r < bookshelf_rows.length; r++) {
                    if (bookshelf_rows[r] < min_row_value) {
                      min_row_value = bookshelf_rows[r];
                      bookshelf_row = r;
                    }
                  }
                  if (bookshelf_row >= 0) {
                    if (bookshelf_rows[bookshelf_row] % 2 == 1) {
                      bookshelf_rows[bookshelf_row]++;
                    }
                    bookshelf_rows[bookshelf_row] += 2;
                  }
                }
              }
              if (bookshelf_row >= 0) {
                bookshelves.push(new Bookshelf(5 + bookshelf_row * 3, 24.5 - Math.floor(bookshelf_rows[bookshelf_row] / 2) * 1.8, -((bookshelf_row % 2) * 2 - 1) * ((bookshelf_rows[bookshelf_row] % 2) * 2 - 1) * 90, book_feeds[book_feed_nr][1], book_feeds[book_feed_nr][2]));
                bookshelf_rows[bookshelf_row]++;
              } else {
                return false;
              }
            }
            if (v < 36) {
              bookshelves[bookshelf_nr].add_book(books_thumb, books_title, books_subtitle, books_author, books_link);
            }
          });
        }
        fetch_books(book_feed_nr + 1);
      }, "jsonp");
    }
  }

  function fetch_bookshelves(user) {
    var feed_url = "https://www.googleapis.com/books/v1/users/" + user + "/bookshelves?key=" + API_KEY;

    $.get(feed_url, function (data) {
      if (data.items != undefined) {
        $.each(data.items, function (i, item) {
          var bookshelf, bookshelf_title, volume_feed_url, b;
          if (item.volumeCount > 0) {
            bookshelf = item.id;
            bookshelf_title = item.title;
            for (b = 0; b <= item.volumeCount / 36; b++) {
              volume_feed_url = "https://www.googleapis.com/books/v1/users/" + user + "/bookshelves/" + bookshelf + "/volumes?maxResults=40&startIndex=" + (b * 36) + "&key=" + API_KEY;
              book_feeds[book_feeds.length] = [];
              book_feeds[book_feeds.length - 1][0] = volume_feed_url;
              book_feeds[book_feeds.length - 1][1] = bookshelf;
              book_feeds[book_feeds.length - 1][2] = bookshelf_title;
            }
          }
        });
        fetch_books(0);
      }
    }, "jsonp");
  }

  // -------------------------------------------------------------------
  // --------------------------- PHOTOS ---------------------------------
  // -------------------------------------------------------------------

  function init_photowall_position_buffers() {
    var i, vertices;

    i = 0;
    photowall_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, photowall_position_buffers[i]);
    vertices = [
      -2.0, -0.2,  0.1,
      2.0, -0.2,  0.1,
      2.0,  2.2,  0.1,
      -2.0,  2.2,  0.1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    photowall_position_buffers[i].itemSize = 3;
    photowall_position_buffers[i].numItems = 4;
    photowall_position_buffers[i].normal = SIDE_BACK;

    i = photowall_position_buffers.length;
    photowall_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, photowall_position_buffers[i]);
    vertices = [
      -2.0,  2.2, -0.1,
      2.0,  2.2, -0.1,
      2.0, -0.2, -0.1,
      -2.0, -0.2, -0.1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    photowall_position_buffers[i].itemSize = 3;
    photowall_position_buffers[i].numItems = 4;
    photowall_position_buffers[i].normal = SIDE_FRONT;

    i = photowall_position_buffers.length;
    photowall_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, photowall_position_buffers[i]);
    vertices = [
      2.0, -0.2,  0.1,
      2.0,  2.2,  0.1,
      2.0,  2.2, -0.1,
      2.0, -0.2, -0.1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    photowall_position_buffers[i].itemSize = 3;
    photowall_position_buffers[i].numItems = 4;
    photowall_position_buffers[i].normal = SIDE_RIGHT;

    i = photowall_position_buffers.length;
    photowall_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, photowall_position_buffers[i]);
    vertices = [
      -2.0, -0.2,  0.1,
      -2.0,  2.2,  0.1,
      -2.0,  2.2, -0.1,
      -2.0, -0.2, -0.1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    photowall_position_buffers[i].itemSize = 3;
    photowall_position_buffers[i].numItems = 4;
    photowall_position_buffers[i].normal = SIDE_LEFT;
  }

  function init_mapwall_position_buffers() {
    var i, vertices;

    i = 0;
    mapwall_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mapwall_position_buffers[i]);
    vertices = [
      -6.0, -0.2,  0.1,
      6.0, -0.2,  0.1,
      6.0,  2.2,  0.1,
      -6.0,  2.2,  0.1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    mapwall_position_buffers[i].itemSize = 3;
    mapwall_position_buffers[i].numItems = 4;
    mapwall_position_buffers[i].normal = SIDE_BACK;

    i = mapwall_position_buffers.length;
    mapwall_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mapwall_position_buffers[i]);
    vertices = [
      -6.0,  2.2, -0.1,
      6.0,  2.2, -0.1,
      6.0, -0.2, -0.1,
      -6.0, -0.2, -0.1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    mapwall_position_buffers[i].itemSize = 3;
    mapwall_position_buffers[i].numItems = 4;
    mapwall_position_buffers[i].normal = SIDE_FRONT;

    i = mapwall_position_buffers.length;
    mapwall_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mapwall_position_buffers[i]);
    vertices = [
      6.0, -0.2,  0.1,
      6.0,  2.2,  0.1,
      6.0,  2.2, -0.1,
      6.0, -0.2, -0.1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    mapwall_position_buffers[i].itemSize = 3;
    mapwall_position_buffers[i].numItems = 4;
    mapwall_position_buffers[i].normal = SIDE_RIGHT;

    i = mapwall_position_buffers.length;
    mapwall_position_buffers[i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mapwall_position_buffers[i]);
    vertices = [
      -6.0, -0.2,  0.1,
      -6.0,  2.2,  0.1,
      -6.0,  2.2, -0.1,
      -6.0, -0.2, -0.1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    mapwall_position_buffers[i].itemSize = 3;
    mapwall_position_buffers[i].numItems = 4;
    mapwall_position_buffers[i].normal = SIDE_LEFT;
  }

  function Photo(x, y, z, w, h, f, picasa_thumb, picasa_title, picasa_link, map) {
    var vertices;
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    this.h = h;
    this.chk_front = f;
    this.chk_map = map;

    this.thumb = picasa_thumb;
    this.title = picasa_title;
    this.link = picasa_link;

    this.position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
    if (this.chk_front) {
      vertices = [
        0,   0,  0,
        w,   0,  0,
        w,   h,  0,
        0,   h,  0
      ];
    } else {
      vertices = [
        w,   0,  0,
        0,   0,  0,
        0,   h,  0,
        w,   h,  0
      ];
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    this.position_buffer.itemSize = 3;
    this.position_buffer.numItems = 4;

    this.texture = gl.createTexture();
    init_texture(this.texture, this.thumb, false);
  }

  Photo.prototype.draw = function () {
    mat4.translate(mvMatrix, [this.x, this.y, this.z]);
    setMatrixUniforms();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(current_shader.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
    gl.vertexAttribPointer(current_shader.vertexPositionAttribute, this.position_buffer.itemSize, gl.FLOAT, false, 0, 0);
    if (this.chk_front) {
      gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[SIDE_BACK]);
      gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[SIDE_BACK].itemSize, gl.FLOAT, false, 0, 0);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[SIDE_FRONT]);
      gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[SIDE_BACK].itemSize, gl.FLOAT, false, 0, 0);
    }

    gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);

    mat4.translate(mvMatrix, [-this.x, -this.y, -this.z]);
    setMatrixUniforms();
  };

  Photo.prototype.check_cursor = function (x_wall, y_wall, chk_f) {
    var test_x1, test_x2, test_y1, test_y2;
    if (this.chk_map) {
      return false;
    }
    test_x1 = this.x;
    test_x2 = this.x + this.w;
    test_y1 = this.y;
    test_y2 = this.y + this.h;
    if (chk_f == this.chk_front) {
      if (x_wall >= test_x1 && x_wall <= test_x2 && y_wall >= test_y1 && y_wall <= test_y2) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  };

  Photo.prototype.get_html = function () {
    var str_text = "";
    str_text += "<div style=\"text-align:center;\">";
    str_text += "<a href=\"" + this.link + "\"><img src=\"" + this.thumb + "\"></a><br><br>";
    str_text += "<b>" + this.title + "</b>";
    str_text += "</div>";
    return str_text;
  };

  Photo.prototype.clean_buffers = function () {
    gl.deleteTexture(this.texture);
  };

  function Photowall(x, z, rot, true_wall, map_wall) {
    this.x = x;
    this.y = 0;
    this.h = 2.4;
    if (map_wall) {
      this.w = 12.0;
      this.clip_w = 12.4;
    } else {
      this.w = 4.0;
      this.clip_w = 4.4;
    }
    this.t = 0.2;
    this.clip_t = 0.5;
    this.z = z;
    this.r = rot;
    this.true_wall = true_wall;
    this.map_wall = map_wall;
    this.photos = [];
  }

  Photowall.prototype.add_photo = function (picasa_thumb, picasa_width, picasa_height, picasa_title, picasa_link, map) {
    var w, h, y, dif, x, z;
    if (this.map_wall) {
      z = 0.11;
      if (map) {
        w = 2.85;
        h = 1.9;
        y = 1 - h / 2;
        x = -w / 2;
      } else {
        w = 1.9 - Math.random() * 0.25;
        h = w / picasa_width * picasa_height;
        if (h > 0.9) {
          h = 0.9 - Math.random() * 0.25;
          w = h / picasa_height * picasa_width;
        }
        if (this.photos.length % 4 < 2) {
          y = 1.5 - h / 2;
        } else {
          y = 0.5 - h / 2;
        }
        dif = 0.9 - h;
        y += dif * (Math.random() * 2 - 1) / 3;

        if (this.photos.length < 4) {
          x = -5 + (2 * (this.photos.length % 2)) - w / 2;
        } else {
          x = 3 + (2 * (this.photos.length % 2)) - w / 2;
        }
      }
    } else {
      w = 1.9 - Math.random() * 0.5;
      h = w / picasa_width * picasa_height;
      if (h > 1.9) {
        h = 1.9 - Math.random() * 0.5;
        w = h / picasa_height * picasa_width;
      }
      y = 1 - h / 2;
      dif = 1.9 - h;
      y += dif * (Math.random() * 2 - 1) / 3;

      x = -1 + (2 * (this.photos.length % 2)) - w / 2;

      z = 0.11;
      if (this.photos.length > 1) {
        z = -0.11;
      }
    }
    this.photos.push(new Photo(x, y, z, w, h, (z > 0), picasa_thumb, picasa_title, picasa_link, map));
  };

  Photowall.prototype.draw = function () {
    var i;
    mvPushMatrix();
    mat4.translate(mvMatrix, [this.x, this.y, this.z]);
    mat4.rotate(mvMatrix, degToRad(this.r), [0, 1, 0]);

    if (this.true_wall) {
      current_shader = fragment_shader;
      gl.useProgram(current_shader);
      setMatrixUniforms();
      gl.uniform1i(current_shader.useTextureUniform, false);
      gl.uniform4fv(current_shader.colorUniform, photowall_color);

      if (this.map_wall) {
        for (i = 0; i < mapwall_position_buffers.length; i++) {
          gl.bindBuffer(gl.ARRAY_BUFFER, mapwall_position_buffers[i]);
          gl.vertexAttribPointer(current_shader.vertexPositionAttribute, mapwall_position_buffers[i].itemSize, gl.FLOAT, false, 0, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[mapwall_position_buffers[i].normal]);
          gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[mapwall_position_buffers[i].normal].itemSize, gl.FLOAT, false, 0, 0);

          gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
        }
      } else {
        for (i = 0; i < photowall_position_buffers.length; i++) {
          gl.bindBuffer(gl.ARRAY_BUFFER, photowall_position_buffers[i]);
          gl.vertexAttribPointer(current_shader.vertexPositionAttribute, photowall_position_buffers[i].itemSize, gl.FLOAT, false, 0, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[photowall_position_buffers[i].normal]);
          gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[photowall_position_buffers[i].normal].itemSize, gl.FLOAT, false, 0, 0);

          gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
        }
      }
    }

    current_shader = fragment_shader;
    gl.useProgram(current_shader);
    gl.uniform1i(current_shader.useTextureUniform, true);

    for (i = 0; i < this.photos.length; i++) {
      this.photos[i].draw();
    }

    mvPopMatrix();
  };

  Photowall.prototype.clean_buffers = function () {
    var i;
    for (i = 0; i < this.photos.length; i++) {
      this.photos[i].clean_buffers();
    }
    this.photos.length = 0;
  };

  Photowall.prototype.check_cursor = function (x_pos, y_pos, z_pos, yaw, pitch) {
    var test_vec, test_mat, test_x1, test_x2, test_y1, test_y2, test_yaw, test_pitch, d_wall, found, x_wall, y_wall, z_wall, i;

    test_vec = [x_pos, y_pos, z_pos];
    test_mat = mat4.create();
    test_x1 = -this.w / 2;
    test_x2 =  this.w / 2;
    test_y1 = -0.2;
    test_y2 =  2.2;
    test_yaw = yaw - this.r;
    test_pitch = pitch;

    mat4.identity(test_mat);
    mat4.rotate(test_mat, degToRad(-this.r), [0, 1, 0]);
    mat4.translate(test_mat, [-this.x, 0, -this.z]);
    mat4.multiplyVec3(test_mat, test_vec);

    found = [-1, -1];
    if (Math.cos(degToRad(test_yaw)) != 0) {
      if (test_vec[2] > 0) {
        d_wall = (test_vec[2] - 0.1) / Math.cos(degToRad(test_yaw));
      } else {
        d_wall = (test_vec[2] + 0.1) / Math.cos(degToRad(test_yaw));
      }
      x_wall = test_vec[0] - Math.sin(degToRad(test_yaw)) * d_wall;
      y_wall = test_vec[1] + Math.sin(degToRad(test_pitch)) * d_wall;
      z_wall = test_vec[2] - Math.cos(degToRad(test_yaw)) * d_wall;

      if (d_wall > 0 && d_wall < 5 && x_wall >= test_x1 && x_wall <= test_x2 && y_wall >= test_y1 && y_wall <= test_y2) {
        for (i = 0; i < this.photos.length; i++) {
          if (this.photos[i].check_cursor(x_wall, y_wall, (z_wall > 0))) {
            found[0] = i;
            found[1] = d_wall;
            break;
          }
        }
      }
    }
    return found;
  };

  Photowall.prototype.check_collision = function (x_pos, z_pos) {
    var test_vec, test_mat;
    test_vec = [x_pos, 0, z_pos];
    test_mat = mat4.create();
    mat4.identity(test_mat);
    mat4.rotate(test_mat, degToRad(-this.r), [0, 1, 0]);
    mat4.translate(test_mat, [-this.x, 0, -this.z]);
    mat4.multiplyVec3(test_mat, test_vec);
    if (test_vec[0] > -this.clip_w / 2 && test_vec[0] < this.clip_w / 2 && test_vec[2] > -this.clip_t / 2 && test_vec[2] < this.clip_t / 2) {
      return true;
    } else {
      return false;
    }
  };

  function fetch_photos(user) {
    $.get("https://picasaweb.google.com/data/feed/api/user/" + user + "?kind=photo&alt=json&thumbsize=512&max-results=120", function (data) {
      var num_pics, current_wall, feed_url, latlng, str_locs;
      num_pics = 0;
      current_wall = -1;
      if (data.feed != undefined) {
        $.each(data.feed.entry, function (i, entry) {
          var picasa_thumb, picasa_width, picasa_height, picasa_title, picasa_link;
          num_pics++;
          switch (num_pics) {
          case 1: photowalls.push(new Photowall(-23, 23, 45, true, false)); break;   // 4
          case 5: photowalls.push(new Photowall(-25, 27.1, 180, false, false)); break;   // 6
          case 7: photowalls.push(new Photowall(-27.1, 25, 90, false, false)); break;   // 8
          case 9: photowalls.push(new Photowall(-20, 20, -45, true, false)); break;   // 12
          case 13: photowalls.push(new Photowall(-21, 27, 180, false, false)); break;   // 14
          case 15: photowalls.push(new Photowall(-27, 21, 90, false, false)); break;   // 16
          case 17: photowalls.push(new Photowall(-23, 17, 45, true, false)); break;   // 20
          case 21: photowalls.push(new Photowall(-17, 23, 45, true, false)); break;   // 24
          case 25: photowalls.push(new Photowall(-17, 27.1, 180, false, false)); break;   // 26
          case 27: photowalls.push(new Photowall(-27.1, 17, 90, false, false)); break;   // 28
          case 29: photowalls.push(new Photowall(-17, 17, 45, true, false)); break;   // 32
          case 33: photowalls.push(new Photowall(-20, 14, -45, true, false)); break;   // 36
          case 37: photowalls.push(new Photowall(-14, 20, -45, true, false)); break;   // 40
          case 41: photowalls.push(new Photowall(-13, 27.1, 180, false, false)); break;   // 42
          case 43: photowalls.push(new Photowall(-27.1, 13, 90, false, false)); break;   // 44
          case 45: photowalls.push(new Photowall(-23, 11, 45, true, false)); break;   // 48
          case 49: photowalls.push(new Photowall(-11, 23, 45, true, false)); break;   // 52
          case 53: photowalls.push(new Photowall(-17, 11, 45, true, false)); break;   // 56
          case 57: photowalls.push(new Photowall(-11, 17, 45, true, false)); break;   // 60
          case 61: photowalls.push(new Photowall(-14, 14, -45, true, false)); break;   // 64
          case 65: photowalls.push(new Photowall(-8, 20, -45, true, false)); break;   // 68
          case 69: photowalls.push(new Photowall(-20,  8, -45, true, false)); break;   // 72
          case 73: photowalls.push(new Photowall(-9, 27.1, 180, false, false)); break;   // 74
          case 75: photowalls.push(new Photowall(-27.1,  9, 90, false, false)); break;   // 76
          case 77: photowalls.push(new Photowall(-11, 11, 45, true, false)); break;   // 80
          case 81: photowalls.push(new Photowall(-8, 14, -45, true, false)); break;   // 84
          case 85: photowalls.push(new Photowall(-14,  8, -45, true, false)); break;   // 88
          case 89: photowalls.push(new Photowall(-5, 27.1, 180, false, false)); break;   // 90
          case 91: photowalls.push(new Photowall(-27.1,  5, 90, false, false)); break;   // 92
          case 93: photowalls.push(new Photowall(-23,  5, 45, true, false)); break;   // 96
          case 97: photowalls.push(new Photowall(-5, 23, 45, true, false)); break;   // 100
          case 101: photowalls.push(new Photowall(-17,  5, 45, true, false)); break;   // 104
          case 105: photowalls.push(new Photowall(-5, 17, 45, true, false)); break;   // 108
          case 109: photowalls.push(new Photowall(-11,  5, 45, true, false)); break;   // 112
          case 113: photowalls.push(new Photowall(-5, 11, 45, true, false)); break;   // 116
          case 117: photowalls.push(new Photowall(-8,  8, -45, true, false)); break;   // 120
          }
          current_wall = photowalls.length - 1;
          picasa_thumb = entry.media$group.media$thumbnail[0].url;
          picasa_width = entry.media$group.media$thumbnail[0].width;
          picasa_height = entry.media$group.media$thumbnail[0].height;
          picasa_title = entry.summary.$t;
          picasa_link = "";
          $.each(entry.link, function (j, link) {
            if (link.rel == "alternate") {
              picasa_link = link.href;
            }
          });
          photowalls[current_wall].add_photo(picasa_thumb, picasa_width, picasa_height, picasa_title, picasa_link, false);
        });

        num_pics = 0;
        current_wall = -1;
        str_locs = "";
        feed_url = "https://picasaweb.google.com/data/feed/api/user/" + user + "?kind=photo&alt=json&thumbsize=512&max-results=5000";
        $.get(feed_url, function (data) {
          if (data.feed != undefined) {
            $.each(data.feed.entry, function (i, entry) {
              var picasa_thumb, picasa_width, picasa_height, picasa_title, picasa_link;
              if (entry.georss$where != undefined) {
                if (entry.georss$where.gml$Point != undefined) {
                  if (entry.georss$where.gml$Point.gml$pos != undefined) {
                    obj_world.add_location(entry.georss$where.gml$Point.gml$pos.$t, 1);
                    latlng = entry.georss$where.gml$Point.gml$pos.$t.split(" ");
                    num_pics++;
                    if (num_pics <= 64) {
                      switch (num_pics) {
                      case 1: photowalls.push(new Photowall(-13, -3, 180, true, true)); break;
                      case 9: photowalls.push(new Photowall(-3, -13, 270, true, true)); break;
                      case 17: photowalls.push(new Photowall(-13, -23, 0, true, true)); break;
                      case 25: photowalls.push(new Photowall(-23, -13, 90, true, true)); break;
                      case 33: photowalls.push(new Photowall(-13, -3, 0, false, true)); break;
                      case 41: photowalls.push(new Photowall(-3, -13, 90, false, true)); break;
                      case 49: photowalls.push(new Photowall(-13, -23, 180, false, true)); break;
                      case 57: photowalls.push(new Photowall(-23, -13, 270, false, true)); break;
                      }
                      str_locs += "%7C" + latlng[0].trim() + "," + latlng[1].trim();
                      current_wall = photowalls.length - 1;
                      picasa_thumb = entry.media$group.media$thumbnail[0].url;
                      picasa_width = entry.media$group.media$thumbnail[0].width;
                      picasa_height = entry.media$group.media$thumbnail[0].height;
                      picasa_title = entry.summary.$t;
                      picasa_link = "";
                      $.each(entry.link, function (j, link) {
                        if (link.rel == "alternate") {
                          picasa_link = link.href;
                        }
                      });
                      photowalls[current_wall].add_photo(picasa_thumb, picasa_width, picasa_height, picasa_title, picasa_link, false);
                      if (num_pics % 8 === 0) {
                        photowalls[current_wall].add_photo("https://maps.googleapis.com/maps/api/staticmap" + encodeURIComponent("?size=300x200&maptype=roadmap&markers=color:red" + str_locs + "&sensor=false"), 300, 200, "map", "", true);
                        str_locs = "";
                      }
                    }
                  }
                }
              }
            });
            if (str_locs != "") {
              photowalls[current_wall].add_photo("https://maps.googleapis.com/maps/api/staticmap" + encodeURIComponent("?size=300x200&maptype=roadmap&markers=color:red" + str_locs + "&sensor=false"), 300, 200, "map", "", true);
            }
            obj_world.refresh_texture();
          }
        }, "jsonp");
      }
    }, "jsonp");
  }


  // TESTING
  //user_thumb = "https://maps.googleapis.com/maps/api/staticmap" + encodeURIComponent("?size=512x512&maptype=roadmap&markers=color:red%7C40.737102,-73.990318%7C40.749825,-73.987963%7C40.752946,-73.987384&sensor=false");

  // ------------------------------------------------------------------------
  // --------------------------- INITIALIZE ---------------------------------
  // ------------------------------------------------------------------------

  function load_data(user, first) {
    var i, feed_url;

    if (!first) {
      image_queue.empty_queue();
      pitch = 0;
      yaw = 0;
      zPos = START_Z;
      xPos = START_X;
    }

    obj_world.clear_locations();
    obj_world.refresh_texture();

    for (i = 0; i < book_feeds.length; i++) {
      book_feeds[i].length = 0;
    }
    book_feeds.length = 0;
    bookshelf_rows = [0, 0, 0, 0, 0, 0, 0];

    for (i = 0; i < profile_texture.length; i++) {
      gl.deleteTexture(profile_texture[i]);
    }
    profile_texture.length = 0;

    displayed_users.length = 0;

    for (i = 0; i < bookshelves.length; i++) {
      bookshelves[i].clean_buffers();
    }
    bookshelves.length = 0;

    for (i = 0; i < photowalls.length; i++) {
      photowalls[i].clean_buffers();
    }
    photowalls.length = 0;

    for (i = 0; i < posts.length; i++) {
      posts[i].clean_buffers();
    }
    posts.length = 0;

    words.length = 0;
    word_map = {};

    for (i = 0; i < profilePositionBuffer.length; i++) {
      gl.deleteBuffer(profilePositionBuffer[i]);
    }
    profilePositionBuffer.length = 0;

    selected_profile = -1;
    selected_post = -1;
    selected_bookshelf = -1;
    selected_book = -1;
    selected_photowall = -1;
    selected_photo = -1;
    selected_world = false;

    document.title = "ProfileRoom+ of " + user;
    $("#pr_details").html("Loading data for " + user + "...");
    $("#pr_username").html("ProfileRoom+ of " + user);

    feed_url = "https://www.googleapis.com/plus/v1/people/" + user + "?key=" + API_KEY;

    $.get(feed_url, function (data) {
      var user_thumb, user_name, user_id, user_profile;
      if (data.error != undefined) {
        $("#pr_errors").html("Error loading data: <br />");
        $.each(data.error.errors, function (i, item) {
          $("#pr_errors").append(item.message + "<br");
        });
        document.title = "ProfileRoom+ / Error";
        $("#pr_username").html("");
      } else {
        $("#pr_userform").html("");
        $("#pr_userform").hide();
        user_thumb = "";
        user_name = "";
        user_id = "";
        user_profile = "";
        if (data.image != undefined) {
          user_thumb = data.image.url;
        } else {
          user_thumb = base_url + "images/noimage.jpg";
        }
        if (user_thumb == "") { user_thumb = base_url + "images/noimage.jpg"; }
        if (user_thumb == "http://www.google.com/friendconnect/scs/images/NoPictureDark65.jpg") {
          user_thumb = base_url + "images/noimage.jpg";
        } else {
          user_thumb = user_thumb.replace("http://www.google.com/s2/", "https://www.google.com/s2/");
          user_thumb = user_thumb.replace("?sz=50", "?sz=200");
        }
        if (data.id != undefined) {
          user_id = data.id;
        }
        if (data.displayName != undefined) {
          user_name = data.displayName;
        }
        if (data.url != undefined) {
          user_profile = data.url;
        }
        obj_user.set_user(user_id, user_name, user_thumb, user_profile);
        document.title = "ProfileRoom+ of " + user_name;
        $("#pr_username").html("ProfileRoom+ of " + user_name);

        fetch_photos(user);
        fetch_posts(user);

        if (data.urls != undefined) {
          $.each(data.urls, function (i, item) {
            var url, p, books_id;
            url = String(item.value);
            if (url.search(/books\.google\.com/i) >= 0) {
              if (url.indexOf("uid") >= 0) {
                books_id = url.substring(34);
                p = books_id.indexOf("&");
                if (p > 0) {
                  books_id = books_id.substring(0, p);
                }
                fetch_bookshelves(books_id);
                return false;
              }
            }
          });
        }

        $("#pr_details").html("No user or photo selected.");
        selected_profile = -1;
        selected_post = -1;
        selected_bookshelf = -1;
        selected_book = -1;
        selected_photowall = -1;
        selected_photo = -1;
        selected_world = false;
      }
    }, "jsonp");
  }

  function initBuffers() {
    var textureCoords, squareVertexIndices;

    bookshelf_color = new Float32Array([0.4, 0.2, 0.0, 1.0]);
    photowall_color = new Float32Array([0.8, 0.8, 0.8, 1.0]);
    STAND_COLOR = new Float32Array([0.6, 0.4, 0.2, 1.0]);
    USER_FRAME_COLOR = new Float32Array([0.8, 0.8, 0.8, 1.0]);

    init_normal_buffers();

    initWallBuffers();
    initCursor();
    initWorld();
    obj_user = new User();

    init_bookshelf_position_buffers();
    init_book_position_buffer();
    init_photowall_position_buffers();
    init_mapwall_position_buffers();

    simple_tex_coords_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, simple_tex_coords_buffer);
    textureCoords = [0, 0,  1, 0,  1, 1,  0, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    simple_tex_coords_buffer.itemSize = 2;
    simple_tex_coords_buffer.numItems = 4;

    square_index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, square_index_buffer);
    squareVertexIndices = [0, 1, 2,  0, 2, 3];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(squareVertexIndices), gl.STATIC_DRAW);
    square_index_buffer.itemSize = 1;
    square_index_buffer.numItems = 6;
  }

  function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;
    if (event.keyCode == 67) { //C
      if (chk_jumping == false) {
        chk_ducking = !chk_ducking;
      }
    }
    if (event.keyCode == 32) { // Space
      if (chk_jumping == false) {
        real_ducking = 0;
        chk_ducking = false;
        chk_jumping = true;
      }
    }
    if (event.keyCode == 13 || event.keyCode == 69) { //Enter
      if (selected_profile > 0) {
        switch_user(profilePositionBuffer[selected_profile].user_id);
        pitch = 0;
        yaw = 0;
        zPos = START_Z;
        xPos = START_X;
      }
    }
  }

  function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
  }

  function draw_scene() {
    var i;
    gl.viewportWidth = $("#profileroom").width();
    gl.viewportHeight = $("#profileroom").height();
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    /*jslint bitwise: true*/
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    /*jslint bitwise: false*/

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    mat4.identity(mvMatrix);

    current_shader = vertex_shader;
    gl.useProgram(current_shader);
    setMatrixUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, simple_tex_coords_buffer);
    gl.vertexAttribPointer(current_shader.textureCoordAttribute, simple_tex_coords_buffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, square_index_buffer);

    gl.uniform3f(current_shader.ambientColorUniform, 0.2, 0.2, 0.2);
    gl.uniform3f(current_shader.pointLightingColorUniform, 1.0, 1.0, 1.0);
    gl.uniform3f(current_shader.pointLightingLocationUniform, 0.0, 0.0, 0.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj_cursor.position_buffer);
    gl.vertexAttribPointer(current_shader.vertexPositionAttribute, obj_cursor.position_buffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[obj_cursor.normal]);
    gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[obj_cursor.normal].itemSize, gl.FLOAT, false, 0, 0);
    gl.uniform1i(current_shader.useTextureUniform, false);
    gl.uniform1i(current_shader.useLightingUniform, false);
    gl.uniform4fv(current_shader.colorUniform, obj_cursor.color);
    gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    gl.uniform1i(current_shader.useLightingUniform, true);

    mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
    mat4.translate(mvMatrix, [-xPos, -yPos, -zPos]);

    current_shader = fragment_shader;
    gl.useProgram(current_shader);
    gl.uniform3f(current_shader.ambientColorUniform, 0.2, 0.2, 0.2);
    gl.uniform3f(current_shader.pointLightingColorUniform, 1.0, 1.0, 1.0);
    gl.uniform3f(current_shader.pointLightingLocationUniform, 0.0, 0.0, 0.0);
    gl.uniform1i(current_shader.useTextureUniform, true);
    gl.bindBuffer(gl.ARRAY_BUFFER, simple_tex_coords_buffer);
    gl.vertexAttribPointer(current_shader.textureCoordAttribute, simple_tex_coords_buffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, square_index_buffer);
    setMatrixUniforms();

    current_shader = vertex_shader;
    gl.useProgram(current_shader);
    gl.uniform3f(current_shader.ambientColorUniform, 0.2, 0.2, 0.2);
    gl.uniform3f(current_shader.pointLightingColorUniform, 1.0, 1.0, 1.0);
    gl.uniform3f(current_shader.pointLightingLocationUniform, 0.0, 0.0, 0.0);
    gl.uniform1i(current_shader.useTextureUniform, true);
    gl.bindBuffer(gl.ARRAY_BUFFER, simple_tex_coords_buffer);
    gl.vertexAttribPointer(current_shader.textureCoordAttribute, simple_tex_coords_buffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, square_index_buffer);
    setMatrixUniforms();

    obj_user.draw();

    current_shader = fragment_shader;
    gl.useProgram(current_shader);
    gl.uniform1i(current_shader.useTextureUniform, true);
    gl.uniform1i(current_shader.useLightingUniform, true);

    setMatrixUniforms();

    gl.uniform3f(current_shader.ambientColorUniform, 0.2, 0.2, 0.2);
    gl.uniform3f(current_shader.pointLightingColorUniform, 1.0, 1.0, 1.0);
    gl.uniform3f(current_shader.pointLightingLocationUniform, 0.0, 0.0, 0.0);

    for (i = 0; i < wallPositionBuffer.length; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, wallPositionBuffer[i]);
      gl.vertexAttribPointer(current_shader.vertexPositionAttribute, wallPositionBuffer[i].itemSize, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[wallPositionBuffer[i].normal]);
      gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[wallPositionBuffer[i].normal].itemSize, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, wall_texture[i]);
      gl.uniform1i(current_shader.samplerUniform, 0);

      gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    for (i = 0; i < bookshelves.length; i++) {
      bookshelves[i].draw();
    }

    for (i = 0; i < photowalls.length; i++) {
      photowalls[i].draw();
    }

    current_shader = vertex_shader;
    gl.useProgram(current_shader);
    setMatrixUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[SIDE_FRONT]);
    gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[SIDE_FRONT].itemSize, gl.FLOAT, false, 0, 0);


    for (i = 0; i < profilePositionBuffer.length; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, profilePositionBuffer[i]);
      gl.vertexAttribPointer(current_shader.vertexPositionAttribute, profilePositionBuffer[i].itemSize, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, profile_texture[i]);
      gl.uniform1i(current_shader.samplerUniform, 0);

      gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffers[SIDE_RIGHT]);
    gl.vertexAttribPointer(current_shader.vertexNormalAttribute, normal_buffers[SIDE_RIGHT].itemSize, gl.FLOAT, false, 0, 0);

    for (i = 0; i < posts.length; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, posts[i].position_buffer);
      gl.vertexAttribPointer(current_shader.vertexPositionAttribute, posts[i].position_buffer.itemSize, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, posts[i].texture);
      gl.uniform1i(current_shader.samplerUniform, 0);

      gl.drawElements(gl.TRIANGLES, square_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    obj_world.draw();
  }

  function handleKeys() {
    var int_width, int_height, int_x1, int_x2, int_y1, int_y2;
    int_width = $("#profileroom").width();
    int_height = $("#profileroom").height();
    int_x1 = 0.4 * int_width;
    int_x2 = 0.6 * int_width;
    int_y1 = 0.4 * int_height;
    int_y2 = 0.6 * int_height;

    if (mouse_click) {
      mouse_click = false;
      if (selected_profile > 0) {
        switch_user(profilePositionBuffer[selected_profile].user_id);
        pitch = 0;
        yaw = 0;
        zPos = START_Z;
        xPos = START_X;
      }
    }
    if (currentlyPressedKeys[38]) {
      // Cursor up
      pitchRate = 0.1;
    } else if (currentlyPressedKeys[40]) {
      // Cursor down
      pitchRate = -0.1;
    } else {
      pitchRate = 0;
    }
    if (!(pointerLocked() && (document.webkitIsFullScreen || document.mozFullScreen))) {
      if (mouse_y > 0 && mouse_y < int_y1) {
        pitchRate = 0.1 * (int_y1 - mouse_y) / int_y1;
      }
      if (mouse_y > int_y2 && mouse_y <= int_height) {
        pitchRate = -0.1 * (mouse_y - int_y2) / int_y1;
      }
    }
    if (currentlyPressedKeys[37]) {
      // Left cursor key
      yawRate = 0.1;
    } else if (currentlyPressedKeys[39]) {
      // Right cursor key
      yawRate = -0.1;
    } else {
      yawRate = 0;
    }
    if (!(pointerLocked() && (document.webkitIsFullScreen || document.mozFullScreen))) {
      if (mouse_x > 0 && mouse_x < int_x1) {
        yawRate = 0.1 * (int_x1 - mouse_x) / int_x1;
      }
      if (mouse_x > int_x2 && mouse_x <= int_width) {
        yawRate = -0.1 * (mouse_x - int_x2) / int_x1;
      }
    }
    if (currentlyPressedKeys[65]) {
      //  A
      strafe = 0.004;
    } else if (currentlyPressedKeys[68]) {
      // D
      strafe = -0.004;
    } else {
      strafe = 0;
    }

    spin_acc = 0;
    if (currentlyPressedKeys[81]) {
      //  Q
      if (selected_world) { spin_acc = -0.001; }
    } else if (currentlyPressedKeys[69]) {
      // E
      if (selected_world) { spin_acc = 0.001; }
    }

    if (currentlyPressedKeys[87]) {
      // W
      speed = 0.004;
    } else if (currentlyPressedKeys[83]) {
      // S
      speed = -0.004;
    } else {
      speed = 0;
    }
    if (currentlyPressedKeys[16] && chk_ducking == false) {
      speed *= 2;
    }
    if (chk_ducking) {
      speed /= 2;
    }
  }

  function animate() {
    var timeNow, elapsed, dif_x, dif_z, int_stop_wall, int_stop_shelf, i;
    timeNow = new Date().getTime();
    if (lastTime != 0) {
      elapsed = timeNow - lastTime;
      dif_x = 0;
      dif_z = 0;
      if (speed != 0 || strafe != 0) {
        dif_x -= Math.sin(degToRad(yaw)) * speed * elapsed;
        dif_z -= Math.cos(degToRad(yaw)) * speed * elapsed;

        dif_x -= Math.sin(degToRad(yaw + 90)) * strafe * elapsed;
        dif_z -= Math.cos(degToRad(yaw + 90)) * strafe * elapsed;

        if (currentlyPressedKeys[16] && speed != 0 && chk_ducking == false) {
          joggingAngle += elapsed;
        } else {
          joggingAngle += elapsed * 0.6;
        }
      }
      // check for clipping with gallery
      if (xPos + dif_x < 0) {
        int_stop_wall = -1;
        for (i = 0; i < photowalls.length; i++) {
          if (photowalls[i].check_collision(xPos + dif_x, zPos + dif_z)) {
            int_stop_wall = i;
            break;
          }
        }
        if (int_stop_wall >= 0) {
          if (photowalls[int_stop_wall].check_collision(xPos + dif_x, zPos)) {
            dif_x = 0;
          }
          if (photowalls[int_stop_wall].check_collision(xPos, zPos + dif_z)) {
            dif_z = 0;
          }
        }
      }
      // check for clipping with library
      if (xPos + dif_x > 0 && zPos + dif_z > 0) {
        int_stop_shelf = -1;
        for (i = 0; i < bookshelves.length; i++) {
          if (bookshelves[i].check_collision(xPos + dif_x, zPos + dif_z)) {
            int_stop_shelf = i;
            break;
          }
        }
        if (int_stop_shelf >= 0) {
          if (bookshelves[int_stop_shelf].check_collision(xPos + dif_x, zPos)) {
            dif_x = 0;
          }
          if (bookshelves[int_stop_shelf].check_collision(xPos, zPos + dif_z)) {
            dif_z = 0;
          }
        }
      }

      // check for clipping with globe
      if (obj_world.check_collision(xPos + dif_x, zPos + dif_z)) {
        if (obj_world.check_collision(xPos + dif_x, zPos)) {
          dif_x = 0;
        }
        if (obj_world.check_collision(xPos, zPos + dif_z)) {
          dif_z = 0;
        }
      }

      // check for clipping with profile pic
      if (xPos + dif_x > -1 && xPos + dif_x < 1 && zPos + dif_z > -1 && zPos + dif_z < 1) {
        if ((xPos + dif_x) * (xPos + dif_x) + (zPos + dif_z) * (zPos + dif_z) < 1) {
          if ((xPos + dif_x) * (xPos + dif_x) + zPos * zPos < 1) {
            dif_x = 0;
          }
          if (xPos * xPos + (zPos + dif_z) * (zPos + dif_z) < 1) {
            dif_z = 0;
          }
        }
      }
      xPos += dif_x;
      zPos += dif_z;

      if (chk_jumping) {
        real_jumping += elapsed * 0.5;
        if (real_jumping > 180) {
          chk_jumping = false;
          real_jumping = 0;
        }
        yPos = 1 + Math.sin(degToRad(joggingAngle)) / 30 + Math.sin(degToRad(real_jumping)) * 0.6;
      } else {
        if (chk_ducking) { real_ducking += elapsed * 0.005; }
        if (!chk_ducking) { real_ducking -= elapsed * 0.005; }
        if (real_ducking < 0) { real_ducking = 0; }
        if (real_ducking > 0.6) { real_ducking = 0.6; }
        if (chk_ducking) {
          yPos = 1 + Math.sin(degToRad(joggingAngle)) / 40 - real_ducking;
        } else {
          yPos = 1 + Math.sin(degToRad(joggingAngle)) / 25 - real_ducking;
        }
      }

      if (pointerLocked() && (document.webkitIsFullScreen || document.mozFullScreen)) {
        if (movement_x > 180) { movement_x -= 360; }
        if (movement_x < -180) { movement_x += 360; }
        if (movement_y < -60) { movement_y = -60; }
        if (movement_y > 60) { movement_y = 60; }
        yaw = movement_x;
        pitch = movement_y;
      } else {
        yaw += yawRate * elapsed;
        pitch += pitchRate * elapsed;
      }

      if (yaw > 180) { yaw -= 360; }
      if (yaw < -180) { yaw += 360; }
      if (zPos < -26) { zPos = -26; }
      if (zPos > 26) { zPos = 26; }
      if (xPos < -26) { xPos = -26; }
      if (xPos > 26) { xPos = 26; }
      if (pitch < -60) { pitch = -60; }
      if (pitch > 60) { pitch = 60; }

      if (spin_acc == 0) {
        if (spin_rate > 0) {
          spin_rate -= 0.001 * spin_rate * elapsed;
          if (spin_rate < 0.05) { spin_rate = 0; }
        }
        if (spin_rate < 0) {
          spin_rate += 0.001 * (-spin_rate) * elapsed;
          if (spin_rate > -0.05) { spin_rate = 0; }
        }
      } else {
        spin_rate += spin_acc * elapsed;
        if (spin_rate > 0.8) { spin_rate = 0.8; }
        if (spin_rate < -0.8) { spin_rate = -0.8; }
      }
      obj_world.spin(spin_rate * elapsed);
    }
    lastTime = timeNow;
  }

  function check_cursor() {
    var d, x_wall, y_wall, z_wall, new_profile, i, str_text, ph, test_ph, bo, test_bo, new_post;
    //check profile pictures
    if (Math.cos(degToRad(yaw)) != 0) {
      d = (zPos + 26.99) / Math.cos(degToRad(yaw));
      x_wall = xPos - Math.sin(degToRad(yaw)) * d;
      y_wall = yPos + Math.sin(degToRad(pitch)) * d;
      z_wall = zPos - Math.cos(degToRad(yaw)) * d;
      new_profile = -1;

      if (d > 0 && d <= 10) {
        if (x_wall >= -27 && x_wall <= 27 && y_wall >= 0 && y_wall <= 2) {
          for (i = 0; i < profilePositionBuffer.length; i++) {
            if (x_wall >= profilePositionBuffer[i].x && x_wall <= profilePositionBuffer[i].x + profilePositionBuffer[i].w) {
              if (y_wall >= profilePositionBuffer[i].y && y_wall <= profilePositionBuffer[i].y + profilePositionBuffer[i].h) {
                new_profile = i;
                break;
              }
            }
          }
        }
      }
      if (new_profile != selected_profile) {
        if (new_profile >= 0) {
          str_text = "";
          str_text += "<b>" + profilePositionBuffer[new_profile].user_name + "</b><br />";
          if (profilePositionBuffer[new_profile].user_profile != "") {
            str_text += "<a href=\"" + profilePositionBuffer[new_profile].user_profile + "\">";
          }
          str_text += "<img src=\"" + profilePositionBuffer[new_profile].user_thumb + "\">";
          if (profilePositionBuffer[new_profile].user_profile != "") {
            str_text += "</a>";
          }
          str_text += "<br />";
          if (profilePositionBuffer[new_profile].user_profile != "") {
            str_text += "<a href=\"" + profilePositionBuffer[new_profile].user_profile + "\">Google Profile</a><br />";
          }
          str_text += "<a href=\"" + base_url + "u/" + profilePositionBuffer[new_profile].user_id + "\">ProfileRoom+ for this user</a>";
          $("#pr_details").html(str_text);
        }
        selected_profile = new_profile;
      }
    }

    //check photos
    ph = [-1, -1, 5];
    for (i = 0; i < photowalls.length; i++) {
      test_ph = photowalls[i].check_cursor(xPos, yPos, zPos, yaw, pitch);
      if (test_ph[0] >= 0) {
        if (test_ph[1] < ph[2]) {
          ph[0] = i;
          ph[1] = test_ph[0];
          ph[2] = test_ph[1];
        }
      }
    }
    if (ph[0] != selected_photowall || ph[1] != selected_photo) {
      if (ph[0] >= 0 && ph[1] >= 0) {
        $("#pr_details").html(photowalls[ph[0]].photos[ph[1]].get_html());
      }
      selected_photowall = ph[0];
      selected_photo = ph[1];
    }

    //check books
    bo = [-1, -1, 5];
    for (i = 0; i < bookshelves.length; i++) {
      test_bo = bookshelves[i].check_cursor(xPos, yPos, zPos, yaw, pitch);
      if (test_bo[0] >= 0) {
        if (test_bo[1] < bo[2]) {
          bo[0] = i;
          bo[1] = test_bo[0];
          bo[2] = test_bo[1];
        }
      }
    }
    if (bo[0] != selected_bookshelf || bo[1] != selected_book) {
      selected_bookshelf = bo[0];
      selected_book = bo[1];
      if (selected_bookshelf >= 0 && selected_book >= 0) {
        str_text = "";
        str_text += bookshelves[selected_bookshelf].title + "<hr />";
        str_text += "<b>" + bookshelves[selected_bookshelf].books[selected_book].title;
        if (bookshelves[selected_bookshelf].books[selected_book].subtitle != "") {
          str_text += " - " + bookshelves[selected_bookshelf].books[selected_book].subtitle;
        }
        str_text += "</b><br />by <b>" + bookshelves[selected_bookshelf].books[selected_book].author + "</b><br />";

        if (bookshelves[selected_bookshelf].books[selected_book].link != "") {
          str_text += "<a href=\"" + bookshelves[selected_bookshelf].books[selected_book].link + "\">";
        }
        str_text += "<img src=\"" + bookshelves[selected_bookshelf].books[selected_book].thumb + "\">";
        if (bookshelves[selected_bookshelf].books[selected_book].link != "") {
          str_text += "</a>";
        }
        str_text += "<br />";
        if (bookshelves[selected_bookshelf].books[selected_book].link != "") {
          str_text += "<a href=\"" + bookshelves[selected_bookshelf].books[selected_book].link + "\">Info on Google Books</a><br />";
        }
        $("#pr_details").html(str_text);
      }
    }

    //check posts
    if (Math.sin(degToRad(yaw)) != 0) {
      d = (xPos - 26.99) / Math.sin(degToRad(yaw));
      x_wall = xPos - Math.sin(degToRad(yaw)) * d;
      y_wall = yPos + Math.sin(degToRad(pitch)) * d;
      z_wall = zPos - Math.cos(degToRad(yaw)) * d;
      new_post = -1;

      if (d > 0 && d <= 5) {
        if (z_wall >= -27 && z_wall <= 27 && y_wall >= -0.2 && y_wall <= 2.2) {
          for (i = 0; i < posts.length; i++) {
            if (posts[i].check_cursor(y_wall, z_wall)) {
              new_post = i;
              break;
            }
          }
        }
      }
      if (new_post != selected_post) {
        if (new_post >= 0) {
          $("#pr_details").html(posts[new_post].get_html());
        }
        selected_post = new_post;
      }
    }

    //check world
    if (obj_world.check_cursor(xPos, yPos, zPos, yaw, pitch)) {
      selected_world = true;
      $("#pr_details").html("Use Q and E to spin the globe.");
    } else {
      selected_world = false;
    }

    if (selected_profile < 0 && selected_photo < 0 && selected_book < 0 && selected_post < 0 && selected_world == false) {
      $("#pr_details").html("No user, photo or book selected.");
    }
  }


  function tick() {
    requestAnimFrame(tick);
    image_queue.load_next();
    handleKeys();
    draw_scene();
    animate();
    check_cursor();
  }

  function onPointerLockLost(e) {
    console.log('Mouse lock lost');
  }

  function lockMouse() {
    if (navigator.pointer && !pointerLocked()) {
      navigator.pointer.lock(canvas, function () {
        console.log("Mouse locked!");
      }, function () {
        console.log("Mouse lock failure!");
      });
    }
  }

  function onFullScreenChange(e) {
    console.log("=== Full Screen mode changed ===");
    if (document.webkitIsFullScreen || document.mozFullScreen) {
      lockMouse();
    }
  }

  initGL(canvas);

  if (gl) {
    initShaders();
    initBuffers();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    navigator.pointer = navigator.pointer || navigator.webkitPointer;

    pointerLocked = (function () {
      if (navigator.pointer) {
        if (typeof (navigator.pointer.isLocked) === "boolean") {
          return function () { return navigator.pointer.isLocked; };
        } else if (typeof (navigator.pointer.isLocked) === "function") {
          return function () { return navigator.pointer.isLocked(); };
        } else if (typeof (navigator.pointer.islocked) === "function") {
          return function () { return navigator.pointer.islocked(); };
        }
      }
      return function () { return false; };
    }());

    if (canvas.webkitRequestFullScreen || canvas.mozRequestFullScreen) {
      document.cancelFullScreen = document.webkitCancelFullScreen || document.mozCancelFullScreen;
      $("#pr_instructions").append("<br><button type=\"button\" id=\"go_fullscreen\">Fullscreen!</button>");
      $("#go_fullscreen").click(function (e) {
        if (!(document.webkitIsFullScreen || document.mozFullScreen)) {
          if (canvas.webkitRequestFullScreen) {
            canvas.webkitRequestFullScreen(canvas.ALLOW_KEYBOARD_INPUT);
          } else {
            canvas.mozRequestFullScreen();
          }
        } else if (pointerLocked()) {
          navigator.pointer.unlock();
        } else {
          document.cancelFullScreen();
        }
      });
    }

    canvas.addEventListener("mousemove", function (e) {
      var pos = $("#profileroom").offset();
      if (pointerLocked() && (document.webkitIsFullScreen || document.mozFullScreen)) {
        e.movementX = e.movementX || e.webkitMovementX;
        e.movementY = e.movementY || e.webkitMovementY;
        movement_x -= e.movementX * 0.1;
        movement_y -= e.movementY * 0.2;
      } else {
        mouse_x = e.pageX - pos.left;
        mouse_y = e.pageY - pos.top;
      }
    }, false);



    document.addEventListener('webkitfullscreenchange', onFullScreenChange, false);
    document.addEventListener('mozfullscreenchange', onFullScreenChange, false);

    canvas.addEventListener('webkitpointerlocklost', onPointerLockLost, false);
    canvas.addEventListener('mozpointerlocklost', onPointerLockLost, false);

    $("#profileroom").mouseout(function (e) {
      mouse_x = -1;
      mouse_y = -1;
    });

    $("#profileroom").click(function (e) {
      mouse_click = true;
    });

    tick();
  }

  return {
    load_data: load_data
  };
}

function profileRoomStart() {
  "use strict";
  var canvas, url, p, user;
  canvas = document.getElementById("profileroom");

  url = String(window.location);
  p = url.lastIndexOf("/");
  user = url.slice(p + 1);

  profileroom = new ProfileRoom(canvas);

  if (user == "") {
    $("#pr_details").html("No user or photo selected.");
    render_plusone();
  } else {
    profileroom.load_data(user, true);
    window.history.replaceState(user, document.title, base_url + "u/" + user);
    render_plusone();
  }
}

window.onpopstate = function (user) {
  "use strict";
  if (user.state != null) {
    profileroom.load_data(user.state, false);
    render_plusone();
  }
};

function form_submit() {
  "use strict";
  var user;
  user = $.trim($("#userid").val());
  if (user != "") {
    switch_user(user);
  }
}
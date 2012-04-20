<?php
/*
 * Copyright 2011-2012 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

  include "config.php";

  $user_ip = $_SERVER["REMOTE_ADDR"];
  if(!$user_ip||$user_ip=="") {
    $user_ip = $_SERVER["SERVER_ADDR"];
  }
  require_once $gapi_client_path . "apiClient.php";
  require_once $gapi_client_path . "contrib/apiPlusService.php";
  session_start();
  $client = new apiClient();
  $client->setApplicationName("ProfileRoom+");
  $client->setClientId($client_id);
  $client->setClientSecret($client_secret);
  $client->setRedirectUri($base_url . "index.php");
  $client->setDeveloperKey($developer_key);
  $client->setScopes(array("https://www.googleapis.com/auth/plus.me"));
  $plus = new apiPlusService($client);

  if (isset($_GET["code"])) {
    $client->authenticate();
    $_SESSION["access_token"] = $client->getAccessToken();
    header("Location: ".$base_url."check.php");
  }
  if (isset($_GET["error"])) {
    unset($_SESSION["access_token"]);
    header("Location: ".$base_url);
  }

  if (isset($_REQUEST["logout"])) {
    unset($_SESSION["access_token"]);
    header("Location: ".$base_url);
  }

  $request = $_SERVER["REQUEST_URI"];
  $path = $_SERVER["PHP_SELF"];
  $p = strrpos($path,"/");
  if(!($p === false)) {
    $request = substr($request,$p+1);
    $path = substr($path,0,$p);
  }

  $q_user = "";
  if(substr($request,0,1) == "u") {
    $q_user = substr($request,2);
  }

  if (isset($_SESSION["access_token"])) {
    $client->setAccessToken($_SESSION["access_token"]);
  }

  if ($client->getAccessToken()) {
    try {
      $me = $plus->people->get('me');
      $_SESSION["access_token"] = $client->getAccessToken();
      if($q_user=="") {
        header("Location: ".$base_url."u/".$me["id"]);
      }
      $login_id = $me["id"];
      $login_name = $me["displayName"];
    } catch (Exception $e) {
      unset($_SESSION["access_token"]);
      $authUrl = $client->createAuthUrl();
      $authUrl = str_replace("&amp;","&",$authUrl);
      $authUrl = str_replace("&","&amp;",$authUrl);
    }
  } else {
    $authUrl = $client->createAuthUrl();
    $authUrl = str_replace("&amp;","&",$authUrl);
    $authUrl = str_replace("&","&amp;",$authUrl);
  }

  $user_name = "";
  $user_pic = "";
  if($q_user!="") {
    try {
      $user = $plus->people->get($q_user);
      if(isset($user["displayName"])) {
        $user_name = $user["displayName"];
        if(isset($user["image"])) {
          $user_pic = $user["image"]["url"];
        } else {
          $user_pic = $base_url . "images/noimage.jpg";
        }
      }
    } catch (Exception $e) {}
  }
?>
<!DOCTYPE html>
<html itemscope itemtype="http://schema.org/Person">
<head>
  <meta charset="UTF-8">
<?php
  if($user_name!="") {
    printf("  <title>ProfileRoom+ / %s</title>\n",$user_name);
    printf("  <meta itemprop=\"name\" content=\"ProfileRoom+ / %s\">\n",$user_name);
    printf("  <meta itemprop=\"description\" content=\"The Google+ profile of %s, visualized in WebGL.\">\n",$user_name);
    printf("  <meta itemprop=\"image\" content=\"%s\">\n",$user_pic);
  } else {
    printf("  <title>ProfileRoom+</title>\n");
    printf("  <meta itemprop=\"name\" content=\"ProfileRoom+\">\n");
    printf("  <meta itemprop=\"description\" content=\"Google+ profiles visualized in WebGL.\">\n");
    printf("  <meta itemprop=\"image\" content=\"%simages/profileroom+.png\">\n", $base_url);
  }
?>
<!--
  Copyright 2011-2012 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
  <link rel="stylesheet" type="text/css" href="/style.css">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="icon" href="/favicon.ico">

  <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
  <script type="text/javascript" src="https://apis.google.com/js/plusone.js">
    {"parsetags": "explicit"}
  </script>
  <script type="text/javascript" src="<?php echo $base_url; ?>scripts/glMatrix-0.9.5.min.js"></script>
  <script type="text/javascript" src="<?php echo $base_url; ?>scripts/webgl-utils.js"></script>
  <script type="text/javascript" src="<?php echo $base_url; ?>scripts/profileroom.js"></script>

  <script id="per-vertex-lighting-fs" type="x-shader/x-fragment">
    #ifdef GL_ES
      precision highp float;
    #endif

    varying vec2 vTextureCoord;
    varying vec3 vLightWeighting;

    uniform bool uUseTexture;
    uniform sampler2D uSampler;
    uniform vec4 uColor;

    void main(void) {
      vec4 fColor;
      if(uUseTexture) {
        fColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));
      } else {
        fColor = uColor;
      }
      gl_FragColor = vec4(fColor.rgb * vLightWeighting, 1.0);
    }
  </script>

  <script id="per-vertex-lighting-vs" type="x-shader/x-vertex">
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    uniform mat3 uNMatrix;

    uniform vec3 uAmbientColor;

    uniform bool uUseLighting;
    uniform vec3 uPointLightingLocation;
    uniform vec3 uPointLightingColor;

    varying vec2 vTextureCoord;
    varying vec3 vLightWeighting;

    void main(void) {
      vec4 mvPosition = uMVMatrix * vec4(aVertexPosition, 1.0);
      gl_Position = uPMatrix * mvPosition;
      vTextureCoord = aTextureCoord;
      if(uUseLighting) {
        vec4 cameraPosition = vec4(uPointLightingLocation,1.0);
        vec3 lightDirection = cameraPosition.xyz - mvPosition.xyz;
        float distance = length(lightDirection);
        distance = (60.0 - abs(distance))/60.0;
        distance = min(max(distance,0.1),1.2);
        lightDirection = normalize(lightDirection);
        vec3 transformedNormal = uNMatrix * aVertexNormal;
        float directionalLightWeighting = abs(dot(transformedNormal, lightDirection));
        vLightWeighting = (uAmbientColor + uPointLightingColor * directionalLightWeighting)*distance;
      } else {
        vLightWeighting = vec3(1.0,1.0,1.0);
      }
    }
  </script>

  <script id="per-fragment-lighting-fs" type="x-shader/x-fragment">
    #ifdef GL_ES
      precision highp float;
    #endif

    varying vec2 vTextureCoord;
    varying vec3 vTransformedNormal;
    varying vec4 vPosition;

    uniform vec3 uAmbientColor;
    uniform mat4 uMVMatrix;

    uniform vec3 uPointLightingColor;
    uniform vec3 uPointLightingLocation;
    uniform vec4 uColor;

    uniform bool uUseLighting;
    uniform bool uUseTexture;
    uniform sampler2D uSampler;

    void main(void) {
      vec3 lightWeighting;
      if(uUseLighting) {
        vec4 cameraPosition = vec4(uPointLightingLocation,1.0);
        vec3 lightDirection = cameraPosition.xyz - vPosition.xyz;
        float distance = length(lightDirection);
        distance = (60.0 - abs(distance))/60.0;
        distance = min(max(distance,0.1),1.2);
        lightDirection = normalize(lightDirection);
        float directionalLightWeighting = abs(dot(normalize(vTransformedNormal), lightDirection));
        lightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;
        lightWeighting = lightWeighting*distance;
      } else {
        lightWeighting = vec3(1.0,1.0,1.0);
      }
      vec4 fColor;
      if(uUseTexture) {
        fColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));
      } else {
        fColor = uColor;
      }
      gl_FragColor = vec4(fColor.rgb * lightWeighting, 1.0);
    }
  </script>

  <script id="per-fragment-lighting-vs" type="x-shader/x-vertex">
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    uniform mat3 uNMatrix;

    varying vec2 vTextureCoord;
    varying vec3 vTransformedNormal;
    varying vec4 vPosition;

    void main(void) {
      vPosition = uMVMatrix * vec4(aVertexPosition, 1.0);
      gl_Position = uPMatrix * vPosition;
      vTextureCoord = aTextureCoord;
      vTransformedNormal = uNMatrix * aVertexNormal;
    }
  </script>

  <script type="text/javascript">
    var base_url = "<?php echo $base_url; ?>";
    var API_KEY = "<?php echo $developer_key; ?>";
  </script>
</head>
<body onload="profileRoomStart();">
  <div id="header" class="ds_header">
    <div id="header1">
      <table><tr>
<?php
  if(isset($authUrl)) {
    printf("        <td style=\"height: 25px; text-align: right;\"><a class=\"login\" href=\"%s\" title=\"Read the privacy statement for details.\">Login via Google</a> / <a href=\"%sinfo.html\">Privacy Statement &amp; Info</a></td>\n",$authUrl,$base_url);
  } else {
    printf("        <td style=\"height: 25px; text-align: right;\">Logged in as <a href=\"%su/%s\">%s</a> / <a class=\"logout\" href=\"?logout\">Logout</a> / <a href=\"%sinfo.html\">Privacy Statement &amp; Info</a></td>\n",$base_url,$login_id,$login_name,$base_url,$base_url);
  }?>
      </tr></table>
    </div>
    <div id="header2">
      <div id="header2_info" style="width:965px; max-width:965px; min-width:965px;">
        <table>
          <tr>
            <td style="width:80px;"><a href="<?php echo $base_url; ?>"><img src="<?php echo $base_url; ?>images/profileroom+.png" alt="ProfileRoom+" style="border: 0px;" /></a></td>
            <td id="pr_username">
              ProfileRoom+<br>
              <div id="pr_userform"><form>Profile ID: <input id="userid" name="userid" title="Go to a Google+ profile and copy the long number from the URL into this field."><input type="submit" onclick="form_submit(); return false;"></form></div>
            </td>
            <td style="width:120px;text-align:right;" id="plusone_td"><div id="plusone_div"></div></td>
            <td style="width:140px;text-align:right;"><a href="http://www.w3.org/html/logo/"><img src="<?php echo $base_url; ?>images/html5-badge-h-graphics.png" width="133" height="64" style="border: 0px;" alt="HTML5 Powered with Graphics, 3D &amp; Effects" title="HTML5 Powered with Graphics, 3D &amp; Effects"></a></td>
          </tr>
        </table>
      </div>
    </div>
  </div>
  <div id="main" style="width:965px; max-width:965px; min-width:965px;">
    <div id="pr_main">
      <canvas id="profileroom" style="border: none;" width="640" height="400"></canvas>
    </div>
    <div id="pr_details"></div>
    <div id="pr_errors"></div>
    <div id="pr_instructions">
      <br>
      Move with W/A/S/D, look around with cursor keys or by moving the mouse to the edges.<br />
      Approach a profile photo and press ENTER to go into this person's room. Use BACKSPACE/Back-Button to return to previous room.
    </div><br>
    <a href="<?php echo $base_url; ?>info.html">More information about this project</a><br>
  </div>
  <div id="footer" class="footer_ds">
    Programming by <a href="https://profiles.google.com/scarygami" rel="author">Gerwin Sturm</a>, <a href="http://www.foldedsoft.at/">FoldedSoft e.U.</a> / <a href="<?php echo $base_url; ?>info.html">Privacy Statement &amp; Info</a>
  </div>
</body>
</html>
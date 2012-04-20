<?php
/*
 * Copyright 2011-2012 Gerwin Sturm
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

  function handle_activity($a) {
    global $num_activities, $activities;
    $activities[$num_activities] = $a;
    $num_activities++;
  }

  $user_ip = $_SERVER["REMOTE_ADDR"];
  if(!$user_ip||$user_ip=="") {
    $user_ip = $_SERVER["SERVER_ADDR"];
  }
  require_once $gapi_client_path . "apiClient.php";
  require_once $gapi_client_path . "contrib/apiPlusService.php";
  session_start();
  $client = new apiClient();
  $client->setApplicationName("All my +");
  $client->setClientId($client_id);
  $client->setClientSecret($client_secret);
  $client->setRedirectUri($base_url."index.php");
  $client->setDeveloperKey($developer_key);
  $client->setScopes(array("https://www.googleapis.com/auth/plus.me"));
  $plus = new apiPlusService($client);
  $maxresults = 100;

  header('Cache-Control : no-cache, must-revalidate');
  $then = gmstrftime("%a, %d %b %Y %H:%M:%S GMT");
  header("Expires: " . $then);
  header('Content-type: application/json');

  if (isset($_REQUEST["userid"])) {
    $q_user = $_REQUEST["userid"];
    if (isset($_SESSION["access_token"])) {
      $client->setAccessToken($_SESSION["access_token"]);
    }
    $q_token = "";
    $request = $_SERVER["REQUEST_URI"];
    $p = strrpos($request, "&token=");
    if (!($p === false)) {
      $q_token = substr($request, $p + 7);
    }
    $num_activities = 0;
    $activities = array();
    $next_page_token = "";
    $chk_more = true;
    if ($q_token != "") {
      $optParams = array("maxResults" => $maxresults, "userIp" => $user_ip, "pageToken" => $q_token);
    } else {
      $optParams = array("maxResults" => $maxresults, "userIp" => $user_ip);
    }
    $errors = 0;
    while($chk_more) {
      try {
        $activity_list = $plus->activities->listActivities($q_user, "public", $optParams);
        if(isset($activity_list["items"])) {
          foreach($activity_list["items"] as $activity) {
            handle_activity($activity);
          }
        }
        $errors = 0;
        $chk_more = false;
        if(isset($activity_list["nextPageToken"])) {
          $next_page_token = $activity_list["nextPageToken"];
        }
        unset($activity_list);
      } catch (Exception $e) {
        $errors++;
        if($errors>3) {
          $str_errors = $str_errors.$e->getMessage()."<br>";
          $chk_more = false;
          $chk_error = true;
        }
      }
    }
    if($num_activities > 0) {
      echo "{\"count\": " . $num_activities;
      if($q_token != "") {
        echo ", \"pageToken\": \"" . $q_token . "\"";
      }
      if($next_page_token != "") {
        echo ", \"nextPageToken\": \"" . $next_page_token . "\"";
      }
      echo ", \"items\": ";
      echo json_encode($activities);
      echo "}";
    } else {
      echo "{\"count\": 0";
      if($q_token != "") {
        echo ", \"pageToken\": \"" . $q_token . "\"";
      }
      echo "}";
    }
  } else {
    echo "{\"count\": 0";
    if($q_token != "") {
      echo ", \"pageToken\": \"" . $q_token . "\"";
    }
    echo "}";
  }
?>
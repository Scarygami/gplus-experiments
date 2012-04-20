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

  function handle_person($p) {
    global $num_people, $people;
    $people[$num_people] = $p;
    $num_people++;
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

  header('Cache-Control: no-cache, must-revalidate');
  $then = gmstrftime("%a, %d %b %Y %H:%M:%S GMT");
  header("Expires: " . $then);
  header('Content-type: application/json');

  if (isset($_REQUEST["activity"]) && isset($_REQUEST["type"])) {
    $q_activity = $_REQUEST["activity"];
    $q_type = $_REQUEST["type"];
    if($q_type == "replies" || $q_type == "plusoners" || $q_type == "resharers") {
      if (isset($_SESSION["access_token"])) {
        $client->setAccessToken($_SESSION["access_token"]);
      }
      $num_people = 0;
      $people = array();

      $optParams = array("maxResults" => $maxresults, "userIp" => $user_ip);
      $errors = 0;
      $chk_more = true;
      while($chk_more) {
        try {
          if($q_type == "replies") {
            $people_list = $plus->comments->listComments($q_activity, $optParams);
            if(isset($people_list["items"])) {
              foreach($people_list["items"] as $person) {
                handle_person($person["actor"]);
              }
            }
          } else {
            $people_list = $plus->people->listByActivity($q_activity, $q_type, $optParams);
            if(isset($people_list["items"])) {
              foreach($people_list["items"] as $person) {
                handle_person($person);
              }
            }
          }
          $errors = 0;
          $chk_more = false;
          unset($people_list);
        } catch (Exception $e) {
          $errors++;
          if($errors>3) {
            $str_errors = $str_errors.$e->getMessage()."<br>";
            $chk_more = false;
            $chk_error = true;
          }
        }
      }
    } else {
      $num_people = 0;
    }
    if($num_people > 0) {
      echo "{\"count\": " . $num_people . ", \"items\": ";
      echo json_encode($people);
      echo "}";
    } else {
      echo "{\"count\": 0}";
    }
  } else {
    echo "{\"count\": 0}";
  }
?>
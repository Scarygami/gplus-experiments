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
  $client->setRedirectUri($base_url."comp.php"); 
  $client->setDeveloperKey($developer_key);
  $client->setScopes(array("https://www.googleapis.com/auth/plus.me"));
  $plus = new apiPlusService($client);

  if (isset($_REQUEST["logout"])) {
    unset($_SESSION["access_token"]);
    header("Location: ".$base_url."compare/");
  }

  if (isset($_GET["code"])) {
    $client->authenticate();
    $_SESSION["access_token"] = $client->getAccessToken();
    try {
      $me = $plus->people->get("me");
      header("Location: ".$base_url."compare/".$me["id"]);
    } catch (Exception $e) {
      unset($_SESSION["access_token"]);
      header("Location: ".$base_url."compare/?quota_exceeded");
    }
  }

  if (isset($_GET["error"])) {
    unset($_SESSION["access_token"]);
    header("Location: ".$base_url."compare/");
  }

  if($_POST["userid"]&&$_POST["userid"]!=""&&$_POST["userid2"]&&$_POST["userid2"]!="") {
    header("Location: ".$base_url."compare/".$_POST["userid"]."/".$_POST["userid2"]);
    exit();
  }

  $request = $_SERVER["REQUEST_URI"];
  $p = strrpos($request,"/compare/");
  if(!($p === false)) {
    $request = substr($request,$p+9);
    $path = substr($path,0,$p);
  }
  $q_user = array("","");
  if($request=="?quota_exceeded") {
  } else {
    $p = strrpos($request,"?");
    if(!($p === false)) {
      $request = substr($request,0,$p);
    }
    $p = strrpos($request,"/");
    if(!($p === false)) {
      $q_user[0] = substr($request,0,$p);
      $q_user[1] = substr($request,$p+1);
    } else {
      $q_user[0] = $request;
      $q_user[1] = "";
    }
  }

  if (isset($_SESSION["access_token"])) {
    $client->setAccessToken($_SESSION["access_token"]);
  }

  if ($client->getAccessToken()) {
    try {
      $me = $plus->people->get("me");
      $_SESSION["access_token"] = $client->getAccessToken();
      if($q_user[0]=="") {
        header("Location: ".$base_url."compare/".$me["id"]);
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

  $num_activities = array(0,0);
  $activities = array();
  $activities[0] = array();
  $activities[1] = array();
  $str_author_id = array("","");
  $str_author_name = array("","");
  $str_author_url = array("","");
  $str_author_pic = array("","");

  function set_author($a,$i) {
    global $str_author_id, $str_author_name, $str_author_url, $str_author_pic;
    $str_author_id[$i] = $a["actor"]["id"];
    $str_author_name[$i] = $a["actor"]["displayName"];
    $str_author_url[$i] = $a["actor"]["url"];
    if(isset($a["actor"]["image"])){
      if(isset($a["actor"]["image"]["url"])){
        $str_author_pic[$i] = $a["actor"]["image"]["url"];
        $str_author_pic[$i] = str_replace("?sz=50","?sz=200",$str_author_pic[$i]);
      }
    }
  }

  function handle_activity($a,$i) {
    global $num_activities, $activities, $str_author_id;
    $activities[$i][$num_activities[$i]] = $a;
    $num_activities[$i]++;
    if($str_author_id[$i]=="") {
      set_author($a,$i);
    }
  }

  function empty_string($l) {
    $str = "";
    for($i=0;$i<$l;$i++) $str = $str." ";
    return $str;
  }

  function print_activity($a,$ws,$no_annotation) {
    $post_published = substr($a["published"],0,10)." ".substr($a["published"],11,8);
    $post_updated = substr($a["updated"],0,10)." ".substr($a["updated"],11,8);
    $post_link = $a["url"];
    $chk_reshares = false;

    if($no_annotation==false) {
      printf("%s<p class=\"smallr\"><a href=\"%s\">%s</a>",empty_string($ws),$post_link,$post_published);
      if($post_published!=$post_updated) {
        printf(" (updated %s)",$post_updated);
      }
      printf("</p>\n");
    }

    if(isset($a["object"]["actor"])) {
      $chk_reshare = true;
      if($no_annotation==false) {
        if(isset($a["annotation"])) {
          if($a["annotation"]!="") {
            $annotation = preg_replace("/ oid=\".*?\"/","",$a["annotation"]);
            printf("%s%s<br>\n",empty_string($ws),$annotation);
          }
        }
      }
      printf("%s<p class=\"smalll\">Reshared <a href=\"%s\">post</a> by <a href=\"%s\">%s</a></p>\n",empty_string($ws),$a["object"]["url"],$a["object"]["actor"]["url"],$a["object"]["actor"]["displayName"]);
      printf("%s<table><tr>\n",empty_string($ws));

      $str_reshare_pic = "";
      if(isset($a["object"]["actor"]["image"])) {
        if(isset($a["object"]["actor"]["image"]["url"])) {
          $str_reshare_pic = $a["object"]["actor"]["image"]["url"];
        }
      }
      if($str_reshare_pic=="") $str_reshare_pic = $base_url . "images/noimage.png";
      printf("%s  <td style=\"border: 1px solid black\"><a href=\"%s\"><img src=\"%s\" style=\"max-width:100px;max-height:100px\" alt=\"%s\"></a></td>\n",empty_string($ws),$a["object"]["actor"]["url"],$str_reshare_pic,$a["object"]["actor"]["displayName"]);
      printf("%s  <td style=\"border: 1px solid black\">\n",empty_string($ws));
      $ws = $ws + 4;
    }
    $content = $a["object"]["content"];
    $content = preg_replace("/ oid=\".*?\"/","",$content);
    printf("%s%s<br>\n",empty_string($ws),$content);
    $chk_pic = false;

    if(isset($a["object"]["attachments"])) {
      foreach($a["object"]["attachments"] as $att) {
        $att_link = "";
        $att_preview = "";
        $att_title = "";
        if(isset($att["url"])) $att_link = $att["url"];
        if(isset($att["image"])) $att_preview = $att["image"]["url"];
        if(isset($att["displayName"])) $att_title = $att["displayName"];
        if($att_link=="") {
          if(isset($att["fullImage"])) $att_link = $att["fullImage"]["url"];
        }
        if($att_title==""&&$att_preview=="") $att_title = $att_link;
        if($att_link!="") {
          $att_link = str_replace("&amp;","&",$att_link);
          $att_link = str_replace("&","&amp;",$att_link);
          if(!($att_preview!=""&&$chk_pic==true)) {
            printf("%s<br><br>\n",empty_string($ws));
          }
          printf("%s<a href=\"%s\">",empty_string($ws),$att_link);
          if($att_preview!="") {
            $chk_pic = true;
            $att_preview = str_replace("&amp;","&",$att_preview);
            $att_preview = str_replace("&","&amp;",$att_preview);
            $att_preview = str_replace("http://images0-focus-opensocial.googleusercontent.com","https://images0-focus-opensocial.googleusercontent.com",$att_preview);
            printf("<img src=\"%s\" alt=\"%s\" style=\"border:1px solid black; max-width:800px;\">",$att_preview,(($att_title!="")?$att_title:"preview"));
          } else {
            printf("%s",$att_title);
          }
          printf("</a>\n");
        }
      }
    }

    if($chk_reshare==true) {
      $ws = $ws - 4;
      printf("%s  </td>\n",empty_string($ws));
      printf("%s</tr></table>\n",empty_string($ws));
    }
  }

  function print_photos($a,$ws) {
    if(isset($a["object"]["attachments"])) {
      foreach($a["object"]["attachments"] as $att) {
        if($att["objectType"]=="photo") {
          $att_link = "";
          $att_preview = "";
          $att_title = "";
          if(isset($att["url"])) $att_link = $att["url"];
          if(isset($att["image"])) $att_preview = $att["image"]["url"];
          if(isset($att["displayName"])) $att_title = $att["displayName"];
          if($att_link=="") {
            if(isset($att["fullImage"])) $att_link = $att["fullImage"]["url"];
          }
          if($att_title==""&&$att_preview=="") $att_title = $att_link;
          if($att_preview!="") {
            $att_link = str_replace("&amp;","&",$att_link);
            $att_link = str_replace("&","&amp;",$att_link);
            $att_preview = str_replace("&amp;","&",$att_preview);
            $att_preview = str_replace("&","&amp;",$att_preview);
            $att_preview = str_replace("http://images0-focus-opensocial.googleusercontent.com","https://images0-focus-opensocial.googleusercontent.com",$att_preview);
            printf("%s<a href=\"%s\">",empty_string($ws),$att_link);
            printf("<img src=\"%s\" alt=\"%s\" style=\"border:1px solid black; max-height:100px; max-width:900px;\">",$att_preview,(($att_title!="")?$att_title:"preview"));
            printf("</a>\n");
          }
        }
      }
    }
  }

  $chk_error = false;
  $str_errors = "";
  $maxresults = 100;
  if($q_user[0]!=""&&$q_user[1]!="") {
    for($i=0;$i<2;$i++) {
      $chk_more = true;
      $optParams = array("maxResults" => $maxresults, "userIp" => $user_ip);
      while($chk_more) {
        try {
          $activity_list = $plus->activities->listActivities($q_user[$i], "public", $optParams);
          if(isset($activity_list["items"])) {
            foreach($activity_list["items"] as $activity) {
              if($num_activities[$i]<300) {
                handle_activity($activity,$i);
              }
            }
          }
          $errors = 0;
          if(isset($activity_list["nextPageToken"])) {
            $str_errors = $str_errors.$activity_list["nextPageToken"]."<br>";
            $optParams = array("maxResults" => $maxresults, "userIp" => $user_ip, "pageToken" => $activity_list["nextPageToken"]);
            if($num_activities[$i]>=300) {
              $chk_more = false;
            }
          } else {
            $chk_more = false;
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
    }
  }
?>
<!DOCTYPE html>
<html itemscope itemtype="http://schema.org/Person" style="overflow-y: scroll;">
<head>
  <meta charset="UTF-8">
<?php
  if($str_author_name[0]==""||$str_author_name[1]=="") {
    printf("  <title>All my + comparison</title>\n");
    printf("  <meta itemprop=\"name\" content=\"All my + comparison\">\n");
    printf("  <meta itemprop=\"description\" content=\"Compare your g+ statistics with other users.\">\n");
  } else {
    printf("  <title>All my + comparison of %s and %s</title>\n",$str_author_name[0],$str_author_name[1]);
    printf("  <meta itemprop=\"name\" content=\"All my + comparison of %s and %s\">\n",$str_author_name[0],$str_author_name[1]);
    printf("  <meta itemprop=\"description\" content=\"A comparison of g+ statistics of %s and %s.\">\n",$str_author_name[0],$str_author_name[1]);
  }
?>
  <link rel="stylesheet" type="text/css" href="/style.css">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="icon" href="/favicon.ico">
  <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
  <script type="text/javascript" src="https://www.google.com/jsapi?key=<?php echo $jsapi_key; ?>"></script>
  <script type="text/javascript">
    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-16652516-7']);
    _gaq.push(['_trackPageview']);

    (function() {
      var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
      ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();
  </script>
  <script type="text/javascript">

    function menu_click(name) {
      $(".menue").removeClass("menue_sel");
      $(".menue").addClass("menue_unsel");
      $("#men_"+name).removeClass("menue_unsel");
      $("#men_"+name).addClass("menue_sel");
      $(".contents").hide();
      $("#d_"+name).show();
    }

    function check_menu() {
      str_hash = document.location.hash.substring(1)
      if(!str_hash) { str_hash="overview"; }
      if(str_hash!="overview"&&str_hash!="behaviour"&&str_hash!="reshares") { str_hash="overview"; }
      menu_click(str_hash);
    }

    $(function() {
      check_menu();
<?php
  if($str_author_id[0]!=""&&$str_author_id[1]!="") {
    $stats = array();
    $day_stats = array();
    for($auth=0;$auth<2;$auth++) {
      $stats[$auth] = array();
      $day_stats[$auth] = array();
      for($d=0;$d<=31;$d++) {
        $stats[$auth][$d]=array();
        $stats[$auth][$d]["posts"] = array();
        $stats[$auth][$d]["comments"] = array();
        $stats[$auth][$d]["plusones"] = array();
        $stats[$auth][$d]["reshares"] = array();
        $stats[$auth][$d]["cpp"] = array();
        $stats[$auth][$d]["ppp"] = array();
        $stats[$auth][$d]["rpp"] = array();
        $stats[$auth][$d]["photos"] = array();
        $stats[$auth][$d]["videos"] = array();
        $stats[$auth][$d]["links"] = array();
        $stats[$auth][$d]["gifs"] = array();
        for($i=0;$i<3;$i++) {
          $stats[$auth][$d]["posts"][$i] = 0;
          $stats[$auth][$d]["comments"][$i] = 0;
          $stats[$auth][$d]["plusones"][$i] = 0;
          $stats[$auth][$d]["reshares"][$i] = 0;
          $stats[$auth][$d]["cpp"][$i] = 0;
          $stats[$auth][$d]["ppp"][$i] = 0;
          $stats[$auth][$d]["rpp"][$i] = 0;
          $stats[$auth][$d]["location"][$i] = 0;
          $stats[$auth][$d]["photos"][$i] = 0;
          $stats[$auth][$d]["gifs"][$i] = 0;
          $stats[$auth][$d]["videos"][$i] = 0;
          $stats[$auth][$d]["links"][$i] = 0;
        }
      }

      for($i=0;$i<$num_activities[$auth];$i++) {
        $a = $activities[$auth][$i];
        $post_published =  substr($a["published"],0,10)." ".substr($a["published"],11,8);
        $post_date = new DateTime($post_published);
        $day = (int)($post_date->format("N"));
        $date = $post_date->format("Y-m-d");
        $hour = (int)($post_date->format("G"))+8;
        $tmp_date = new DateTime($date);
        if(isset($min_date)) {
          if($tmp_date<$min_date) {
            unset($min_date);
            $min_date = new DateTime($date);
          }
        } else {
          $min_date = new DateTime($date);
        }
        if(isset($max_date)) {
          if($tmp_date>$max_date) {
            unset($max_date);
            $max_date = new DateTime($date);
          }
        } else {
          $max_date = new DateTime($date);
        }
        unset($tmp_date);
        unset($post_date);
        if(!isset($day_stats[$auth][$date])) {
          $day_stats[$auth][$date]=array();
          $day_stats[$auth][$date]["posts"] = array();
          $day_stats[$auth][$date]["comments"] = array();
          $day_stats[$auth][$date]["plusones"] = array();
          $day_stats[$auth][$date]["reshares"] = array();
          $day_stats[$auth][$date]["cpp"] = array();
          $day_stats[$auth][$date]["ppp"] = array();
          $day_stats[$auth][$date]["rpp"] = array();
          $day_stats[$auth][$date]["photos"] = array();
          $day_stats[$auth][$date]["videos"] = array();
          $day_stats[$auth][$date]["links"] = array();
          $day_stats[$auth][$date]["gifs"] = array();
          for($j=0;$j<3;$j++) {
            $day_stats[$auth][$date]["posts"][$j] = 0;
            $day_stats[$auth][$date]["comments"][$j] = 0;
            $day_stats[$auth][$date]["plusones"][$j] = 0;
            $day_stats[$auth][$date]["reshares"][$j] = 0;
            $day_stats[$auth][$date]["cpp"][$j] = 0;
            $day_stats[$auth][$date]["ppp"][$j] = 0;
            $day_stats[$auth][$date]["rpp"][$j] = 0;
            $day_stats[$auth][$date]["location"][$j] = 0;
            $day_stats[$auth][$date]["photos"][$j] = 0;
            $day_stats[$auth][$date]["gifs"][$j] = 0;
            $day_stats[$auth][$date]["videos"][$j] = 0;
            $day_stats[$auth][$date]["links"][$j] = 0;
          }
        }
        $chk_r = false;
        if(isset($a["object"]["actor"])) $chk_r = true;
        $stats[$auth][0]["posts"][0]++;
        $stats[$auth][0]["posts"][$chk_r?2:1]++;
        $stats[$auth][$day]["posts"][0]++;
        $stats[$auth][$day]["posts"][$chk_r?2:1]++;
        $stats[$auth][$hour]["posts"][0]++;
        $stats[$auth][$hour]["posts"][$chk_r?2:1]++;
        $day_stats[$auth][$date]["posts"][0]++;
        $day_stats[$auth][$date]["posts"][$chk_r?2:1]++;
        if(isset($a["object"]["replies"])) {
          $stats[$auth][0]["comments"][0]+=$a["object"]["replies"]["totalItems"];
          $stats[$auth][0]["comments"][$chk_r?2:1]+=$a["object"]["replies"]["totalItems"];
          $stats[$auth][$day]["comments"][0]+=$a["object"]["replies"]["totalItems"];
          $stats[$auth][$day]["comments"][$chk_r?2:1]+=$a["object"]["replies"]["totalItems"];
          $stats[$auth][$hour]["comments"][0]+=$a["object"]["replies"]["totalItems"];
          $stats[$auth][$hour]["comments"][$chk_r?2:1]+=$a["object"]["replies"]["totalItems"];
          $day_stats[$auth][$date]["comments"][0]+=$a["object"]["replies"]["totalItems"];
          $day_stats[$auth][$date]["comments"][$chk_r?2:1]+=$a["object"]["replies"]["totalItems"];
        }
        if(isset($a["object"]["plusoners"])) {
          $stats[$auth][0]["plusones"][0]+=$a["object"]["plusoners"]["totalItems"];
          $stats[$auth][0]["plusones"][$chk_r?2:1]+=$a["object"]["plusoners"]["totalItems"];
          $stats[$auth][$day]["plusones"][0]+=$a["object"]["plusoners"]["totalItems"];
          $stats[$auth][$day]["plusones"][$chk_r?2:1]+=$a["object"]["plusoners"]["totalItems"];
          $stats[$auth][$hour]["plusones"][0]+=$a["object"]["plusoners"]["totalItems"];
          $stats[$auth][$hour]["plusones"][$chk_r?2:1]+=$a["object"]["plusoners"]["totalItems"];
          $day_stats[$auth][$date]["plusones"][0]+=$a["object"]["plusoners"]["totalItems"];
          $day_stats[$auth][$date]["plusones"][$chk_r?2:1]+=$a["object"]["plusoners"]["totalItems"];
        }
        if(isset($a["object"]["resharers"])) {
          $stats[$auth][0]["reshares"][0]+=$a["object"]["resharers"]["totalItems"];
          $stats[$auth][0]["reshares"][$chk_r?2:1]+=$a["object"]["resharers"]["totalItems"];
          $stats[$auth][$day]["reshares"][0]+=$a["object"]["resharers"]["totalItems"];
          $stats[$auth][$day]["reshares"][$chk_r?2:1]+=$a["object"]["resharers"]["totalItems"];
          $stats[$auth][$hour]["reshares"][0]+=$a["object"]["resharers"]["totalItems"];
          $stats[$auth][$hour]["reshares"][$chk_r?2:1]+=$a["object"]["resharers"]["totalItems"];
          $day_stats[$auth][$date]["reshares"][0]+=$a["object"]["resharers"]["totalItems"];
          $day_stats[$auth][$date]["reshares"][$chk_r?2:1]+=$a["object"]["resharers"]["totalItems"];
        }
        if(isset($a["geocode"])) {
          $stats[$auth][0]["location"][0]++;
          $stats[$auth][0]["location"][$chk_r?2:1]++;
          $stats[$auth][$day]["location"][0]++;
          $stats[$auth][$day]["location"][$chk_r?2:1]++;
          $stats[$auth][$hour]["location"][0]++;
          $stats[$auth][$hour]["location"][$chk_r?2:1]++;
          $day_stats[$auth][$date]["location"][0]++;
          $day_stats[$auth][$date]["location"][$chk_r?2:1]++;
        }
        if(isset($a["object"]["attachments"])) {
          foreach($a["object"]["attachments"] as $at) {
            if($at["objectType"]=="article") {
              $stats[$auth][0]["links"][0]++;
              $stats[$auth][0]["links"][$chk_r?2:1]++;
              $stats[$auth][$day]["links"][0]++;
              $stats[$auth][$day]["links"][$chk_r?2:1]++;
              $stats[$auth][$hour]["links"][0]++;
              $stats[$auth][$hour]["links"][$chk_r?2:1]++;
              $day_stats[$auth][$date]["links"][0]++;
              $day_stats[$auth][$date]["links"][$chk_r?2:1]++;
            }
            if($at["objectType"]=="photo") {
              $stats[$auth][0]["photos"][0]++;
              $stats[$auth][0]["photos"][$chk_r?2:1]++;
              $stats[$auth][$day]["photos"][0]++;
              $stats[$auth][$day]["photos"][$chk_r?2:1]++;
              $stats[$auth][$hour]["photos"][0]++;
              $stats[$auth][$hour]["photos"][$chk_r?2:1]++;
              $day_stats[$auth][$date]["photos"][0]++;
              $day_stats[$auth][$date]["photos"][$chk_r?2:1]++;
            }
            if($at["objectType"]=="video") {
              $stats[$auth][0]["videos"][0]++;
              $stats[$auth][0]["videos"][$chk_r?2:1]++;
              $stats[$auth][$day]["videos"][0]++;
              $stats[$auth][$day]["videos"][$chk_r?2:1]++;
              $stats[$auth][$hour]["videos"][0]++;
              $stats[$auth][$hour]["videos"][$chk_r?2:1]++;
              $day_stats[$auth][$date]["videos"][0]++;
              $day_stats[$auth][$date]["videos"][$chk_r?2:1]++;
            }
            if(isset($at["image"])) {
              if(isset($at["image"]["url"])) {
                if(strtoupper(substr($at["image"]["url"],-4))==".GIF") {
                  $stats[$auth][0]["gifs"][0]++;
                  $stats[$auth][0]["gifs"][$chk_r?2:1]++;
                  $stats[$auth][$day]["gifs"][0]++;
                  $stats[$auth][$day]["gifs"][$chk_r?2:1]++;
                  $stats[$auth][$hour]["gifs"][0]++;
                  $stats[$auth][$hour]["gifs"][$chk_r?2:1]++;
                  $day_stats[$auth][$date]["gifs"][0]++;
                  $day_stats[$auth][$date]["gifs"][$chk_r?2:1]++;
                }
              }
            }
          }
        }
      }

      for($d=0;$d<=31;$d++) {
        for($i=0;$i<3;$i++) {
          if($stats[$auth][$d]["posts"][$i]!=0) {
            $stats[$auth][$d]["cpp"][$i] = $stats[$auth][$d]["comments"][$i] / $stats[$auth][$d]["posts"][$i];
            $stats[$auth][$d]["rpp"][$i] = $stats[$auth][$d]["reshares"][$i] / $stats[$auth][$d]["posts"][$i];
            $stats[$auth][$d]["ppp"][$i] = $stats[$auth][$d]["plusones"][$i] / $stats[$auth][$d]["posts"][$i];
          }
        }
      }
      $num_days = 0;
      if(isset($min_date)) {
        $tmp_date = new DateTime($min_date->format("Y-m-d"));
        $tmp_date_max = new DateTime($max_date->format("Y-m-d"));
        while($tmp_date <= $tmp_date_max) {
          $num_days++;
          $date = $tmp_date->format("Y-m-d");
          if(isset($day_stats[$date])) {
            for($i=0;$i<3;$i++) {
              if($day_stats[$auth][$date]["posts"][$i]!=0) {
                $day_stats[$auth][$date]["cpp"][$i] = $day_stats[$auth][$date]["comments"][$i] / $day_stats[$auth][$date]["posts"][$i];
                $day_stats[$auth][$date]["rpp"][$i] = $day_stats[$auth][$date]["reshares"][$i] / $day_stats[$auth][$date]["posts"][$i];
                $day_stats[$auth][$date]["ppp"][$i] = $day_stats[$auth][$date]["plusones"][$i] / $day_stats[$auth][$date]["posts"][$i];
              }
            }
          }
          $tmp_date->add(new DateInterval("P1D"));
        }
      }
    }

?>
      google.load("visualization", "1", {packages:["corechart"], callback: prepare_charts});
      google.load("maps", "3", {other_params:'sensor=false', callback: draw_map});

<?php } ?>
    });
<?php
  if($str_author_id[0]!=""&&$str_author_id[1]!="") { ?>

    var day_data;
    var day_view;
    var day_chart;
    var weekday_data;
    var weekday_view;
    var weekday_chart;
    var hour_data;
    var hour_view;
    var hour_chart;

    function prepare_charts() {
<?php
    $str_author_name[0] = str_replace("'","&#39;",$str_author_name[0]);
    $str_author_name[1] = str_replace("'","&#39;",$str_author_name[1]);
    $data_array = "[['Date','".$str_author_name[0]."','".$str_author_name[1]."']";
    if(isset($min_date)) {
      $tmp_date = new DateTime($min_date->format("Y-m-d"));
      $tmp_date_max = new DateTime($max_date->format("Y-m-d"));
      while($tmp_date <= $tmp_date_max) {
        $date = $tmp_date->format("Y-m-d");
        $data_array = $data_array.",['".$date."'";
        if(isset($day_stats[0][$date])) {
          $data_array = $data_array.",".$day_stats[0][$date]["posts"][0];
        } else {
          $data_array = $data_array.",0";
        }
        if(isset($day_stats[1][$date])) {
          $data_array = $data_array.",".$day_stats[1][$date]["posts"][0];
        } else {
          $data_array = $data_array.",0";
        }
        $data_array = $data_array . "]";
        $tmp_date->add(new DateInterval("P1D"));
      }
    }
    $data_array = $data_array . "]";
    printf("      day_data = google.visualization.arrayToDataTable(%s);\n",$data_array);

    $data_array = "[['Date','".$str_author_name[0]."','".$str_author_name[1]."']";
    for($d=1;$d<=7;$d++) {
      if($d==1) $data_array = $data_array.",['Mon'";
      if($d==2) $data_array = $data_array.",['Tue'";
      if($d==3) $data_array = $data_array.",['Wed'";
      if($d==4) $data_array = $data_array.",['Thu'";
      if($d==5) $data_array = $data_array.",['Fri'";
      if($d==6) $data_array = $data_array.",['Sat'";
      if($d==7) $data_array = $data_array.",['Sun'";
      $data_array = $data_array.",".$stats[0][$d]["posts"][0];
      $data_array = $data_array.",".$stats[1][$d]["posts"][0];
      $data_array = $data_array . "]";
    }
    $data_array = $data_array . "]";
    printf("      weekday_data = google.visualization.arrayToDataTable(%s);\n",$data_array);

    $data_array = "[['Date','".$str_author_name[0]."','".$str_author_name[1]."']";
    for($h=8;$h<=31;$h++) {
      $data_array = $data_array.sprintf(",['%s'",$h-8);
      $data_array = $data_array.",".$stats[0][$h]["posts"][0];
      $data_array = $data_array.",".$stats[1][$h]["posts"][0];
      $data_array = $data_array . "]";
    }
    $data_array = $data_array . "]";
    printf("      hour_data = google.visualization.arrayToDataTable(%s);\n",$data_array);
?>
      day_view = new google.visualization.DataView(day_data);
      day_view.setColumns([0,1,2]);
      day_chart = new google.visualization.AreaChart($("#day_chart")[0]);

      weekday_view = new google.visualization.DataView(weekday_data);
      weekday_view.setColumns([0,1,2]);
      weekday_chart = new google.visualization.ColumnChart($("#weekday_chart")[0]);

      hour_view = new google.visualization.DataView(hour_data);
      hour_view.setColumns([0,1,2]);
      hour_chart = new google.visualization.ColumnChart($("#hour_chart")[0]);

      day_chart.draw(day_view,
        {width:950,
         height:250,
         title:"Timeline",
         hAxis:{textStyle:{fontSize:10}},
         legendTextStyle:{fontSize:10}}
      );
      weekday_chart.draw(weekday_view,
        {width:950,
         height:250,
         title:"Posting behaviour per weekday",
         hAxis:{textStyle:{fontSize:10}},
         legendTextStyle:{fontSize:10}}
      );
      hour_chart.draw(hour_view,
        {width:950,
         height:250,
         title:"Posting behaviour per hour (UTC)",
         hAxis:{textStyle:{fontSize:10}},
         legendTextStyle:{fontSize:10}}
      );
    }

    function draw_map () {
      var latlng = new google.maps.LatLng(0, 0);
      var myOptions = {
        zoom: 0,
        center: latlng,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
      var llbounds = new google.maps.LatLngBounds();
      var wp;
      var maps_marker;
      var pinImage0 = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|8888FF",
        new google.maps.Size(21, 34),
        new google.maps.Point(0,0),
        new google.maps.Point(10, 34));
      var pinImage1 = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|FE7569",
        new google.maps.Size(21, 34),
        new google.maps.Point(0,0),
        new google.maps.Point(10, 34));
      var pinShadow = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_shadow",
        new google.maps.Size(40, 37),
        new google.maps.Point(0, 0),
        new google.maps.Point(12, 35));
<?php
    $chk_locations=false;
    for($auth=0;$auth<2;$auth++) {
      for($i=0;$i<$num_activities[$auth];$i++) {
        if(!isset($activities[$auth][$i]["object"]["actor"])) {
          if(isset($activities[$auth][$i]["geocode"])) {
            $chk_locations=true;
            list($lat,$lng) = explode(" ",$activities[$auth][$i]["geocode"]);
            printf("      wp = new google.maps.LatLng(%s, %s);\n",$lat,$lng);
            printf("      var maps_marker = new google.maps.Marker({position: wp, map: map,icon: pinImage%s,shadow: pinShadow});\n",$auth);
            printf("      llbounds.extend(wp);\n");
          }
        }
      }
    }
    if($chk_locations==true) {
      printf("      map.fitBounds(llbounds);\n");
    }
?>
    }

 <?php } ?>

  </script>
</head>
<body>
  <div id="header">
    <div id="header1">
      <table><tr>
        <td><form method="post" action="<?php echo $base_url; ?>comp.php">Compare Profile ID <input id="userid" name="userid" value="<?php echo $q_user[0]; ?>" title="Go to a Google+ profile and copy the long number from the URL into this field."> with Profile ID: <input id="userid2" name="userid2" value="<?php echo $q_user[1]; ?>" title="Go to a Google+ profile and copy the long number from the URL into this field."><input type="submit"></form></td>
<?php
  if(isset($authUrl)) {
    printf("        <td style=\"text-align: right;\"><a class=\"login\" href=\"%s\" title=\"Read the privacy statement for details.\">Login via Google</a> / <a href=\"%sinfo.html\">Privacy Statement &amp; Info</a></td>\n",$authUrl,$base_url);
  } else {
    printf("        <td style=\"text-align: right;\">Logged in as <a href=\"%scompare/%s/%s\">%s</a> / <a class=\"logout\" href=\"?logout\">Logout</a> / <a href=\"%sinfo.html\">Privacy Statement &amp; Info</a></td>\n",$base_url,$login_id,$q_user[1],$login_name,$base_url);
  }?>
      </tr></table>
    </div>
    <div id="header2">
      <div id="header2_info">
        <table><tr>
          <td style="width: 70px;"><img src="<?php echo $base_url; ?>images/allmy+.png" alt="All my +"></td>
          <td>
<?php
  if($str_author_name[0]==""||$str_author_name[1]=="") {
    if($q_user[0]!=""||$q_user[1]!="") {
      printf("            <h1>No data found.</h1>\n");
      printf("            Please check the profile IDs and note that for now only public data can be accessed via the API.<br>Possibly the API quota for today was exceeded. Maybe try again later.<br>\n");
    } else {
      printf("            <h1>No profiles chosen.</h1>\n");
      printf("            Use the form above to look up a specific profiles.<br>Read the <a href=\"%sinfo.html\">Privacy Statement &amp; Info</a> to learn more about this project.\n",$base_url);
    }
  } else {
    printf("            <h1>Comparison of %s and %s</h1>\n",$str_author_name[0],$str_author_name[1]); ?>
            <div>
              <a class="menue menue_sel" id="men_overview" href="#overview" onclick="menu_click('overview');return true;">Overview</a>
              <a class="menue menue_unsel" id="men_behaviour" href="#behaviour" onclick="menu_click('behaviour');return true;">Posting behaviour</a>
              <a class="menue menue_unsel" id="men_reshares" href="#reshares" onclick="menu_click('reshares');return true;">Reshares</a>
            </div>
<?php
  }
?>
          </td>
          <td style="text-align:right;">
        </td>
        </tr></table>
      </div>
    </div>
  </div>
  <div id="main">
<?php
  if($str_author_name[0]!=""&&$str_author_name[1]!="") {
?>
  <div id="overview" class="anchor"></div>
  <div id="behaviour" class="anchor"></div>
  <div id="reshares" class="anchor"></div>

  <div id="d_overview" class="contents">
    <table style="width: 100%;"><tr>
      <td style="text-align: center; border: 2px solid #8888FF;">
<?php
    if($str_author_pic[0]=="") $str_author_pic[0] = $base_url . "images/noimage.png";
    printf("        <br><a href=\"%s\"><img src=\"%s\" alt=\"%s\" style=\"max-width:200px; max-height:200px\"></a><br>\n",$str_author_url[0],$str_author_pic[0],$str_author_name[0]);
    printf("        <a href=\"%s\" style=\"font-weight: bold;\">%s</a>\n",$str_author_url[0],$str_author_name[0]);
?>
      </td>
<?php
    for($auth=0;$auth<2;$auth++) {
      printf("      <td>\n");
      printf("        <table style=\"margin-left: auto; margin-right:auto;\">\n");
      printf("          <tr><th></th><th>&nbsp;&nbsp;&nbsp;Total</th><th>&nbsp;&nbsp;&nbsp;Original</th><th>&nbsp;&nbsp;&nbsp;Reshared</th></tr>\n");
      printf("          <tr><th>%s</th><td class=\"stats\">%s</td><td class=\"stats\">%s</td><td class=\"stats\">%s</td></tr>",($auth==0)?"Posts":"",$stats[$auth][0]["posts"][0],$stats[$auth][0]["posts"][1],$stats[$auth][0]["posts"][2]);
      printf("          <tr><th>%s</th><td class=\"stats\">%s</td><td class=\"stats\">%s</td><td class=\"stats\">%s</td></tr>",($auth==0)?"Location":"",$stats[$auth][0]["location"][0],$stats[$auth][0]["location"][1],$stats[$auth][0]["location"][2]);
      printf("          <tr><th>%s</th><td class=\"stats\">%s</td><td class=\"stats\">%s</td><td class=\"stats\">%s</td></tr>",($auth==0)?"Photos":"",$stats[$auth][0]["photos"][0],$stats[$auth][0]["photos"][1],$stats[$auth][0]["photos"][2]);
      printf("          <tr><th>%s</th><td class=\"stats\">%s</td><td class=\"stats\">%s</td><td class=\"stats\">%s</td></tr>",($auth==0)?"GIFs":"",$stats[$auth][0]["gifs"][0],$stats[$auth][0]["gifs"][1],$stats[$auth][0]["gifs"][2]);
      printf("          <tr><th>%s</th><td class=\"stats\">%s</td><td class=\"stats\">%s</td><td class=\"stats\">%s</td></tr>",($auth==0)?"Videos":"",$stats[$auth][0]["videos"][0],$stats[$auth][0]["videos"][1],$stats[$auth][0]["videos"][2]);
      printf("          <tr><th>%s</th><td class=\"stats\">%s</td><td class=\"stats\">%s</td><td class=\"stats\">%s</td></tr>",($auth==0)?"Links":"",$stats[$auth][0]["links"][0],$stats[$auth][0]["links"][1],$stats[$auth][0]["links"][2]);
      printf("          <tr><th>%s</th><td class=\"stats\">%s</td><td class=\"stats\">%s</td><td class=\"stats\">%s</td></tr>",($auth==0)?"Comments":"",$stats[$auth][0]["comments"][0],$stats[$auth][0]["comments"][1],$stats[$auth][0]["comments"][2]);
      printf("          <tr><td class=\"stats noborder\">%s</td><td class=\"stats\">%01.2f</td><td class=\"stats\">%01.2f</td><td class=\"stats\">%01.2f</td></tr>",($auth==0)?"per post":"",$stats[$auth][0]["cpp"][0],$stats[$auth][0]["cpp"][1],$stats[$auth][0]["cpp"][2]);
      printf("          <tr><th>%s</th><td class=\"stats\">%s</td><td class=\"stats\">%s</td><td class=\"stats\">%s</td></tr>",($auth==0)?"+1's":"",$stats[$auth][0]["plusones"][0],$stats[$auth][0]["plusones"][1],$stats[$auth][0]["plusones"][2]);
      printf("          <tr><td class=\"stats noborder\">%s</td><td class=\"stats\">%01.2f</td><td class=\"stats\">%01.2f</td><td class=\"stats\">%01.2f</td></tr>",($auth==0)?"per post":"",$stats[$auth][0]["ppp"][0],$stats[$auth][0]["ppp"][1],$stats[$auth][0]["ppp"][2]);
      printf("          <tr><th>%s</th><td class=\"stats\">%s</td><td class=\"stats\">%s</td><td class=\"stats\">%s</td></tr>",($auth==0)?"Reshares":"",$stats[$auth][0]["reshares"][0],$stats[$auth][0]["reshares"][1],$stats[$auth][0]["reshares"][2]);
      printf("          <tr><td class=\"stats noborder\">%s</td><td class=\"stats\">%01.2f</td><td class=\"stats\">%01.2f</td><td class=\"stats\">%01.2f</td></tr>",($auth==0)?"per post":"",$stats[$auth][0]["rpp"][0],$stats[$auth][0]["rpp"][1],$stats[$auth][0]["rpp"][2]);
      printf("        </table>\n");
      printf("      </td>\n");
      for($d=0;$d<=31;$d++) {
        unset($stats[$auth][$d]["posts"]);
        unset($stats[$auth][$d]["comments"]);
        unset($stats[$auth][$d]["plusones"]);
        unset($stats[$auth][$d]["reshares"]);
        unset($stats[$auth][$d]["cpp"]);
        unset($stats[$auth][$d]["ppp"]);
        unset($stats[$auth][$d]["rpp"]);
        unset($stats[$auth][$d]["photos"]);
        unset($stats[$auth][$d]["videos"]);
        unset($stats[$auth][$d]["links"]);
        unset($stats[$auth][$d]["gifs"]);
        unset($stats[$auth][$d]);
      }
      if(isset($min_date)) {
        $tmp_date = new DateTime($min_date->format("Y-m-d"));
        $tmp_date_max = new DateTime($max_date->format("Y-m-d"));
        while($tmp_date <= $tmp_date_max) {
          if(isset($day_stats[$auth][$tmp_date->format("Y-m-d")])) {
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["posts"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["comments"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["plusones"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["reshares"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["cpp"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["ppp"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["rpp"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["photos"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["videos"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["links"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]["gifs"]);
            unset($day_stats[$auth][$tmp_date->format("Y-m-d")]);
          }
          $tmp_date->add(new DateInterval("P1D"));
        }
      }
      unset($stats[$auth]);
    }
    unset($stats);
?>
      <td style="text-align: center; border: 2px solid #FE7569;">
<?php
    if($str_author_pic[1]=="") $str_author_pic[1] = $base_url . "images/noimage.png";
    printf("        <br><a href=\"%s\"><img src=\"%s\" alt=\"%s\" style=\"max-width:200px; max-height:200px\"></a><br>\n",$str_author_url[1],$str_author_pic[1],$str_author_name[1]);
    printf("        <a href=\"%s\" style=\"font-weight: bold;\">%s</a>\n",$str_author_url[1],$str_author_name[1]);
?>
      </td>
    </tr></table><br>
    <table style="margin-left: auto; margin-right: auto;">
      <tr><th style="text-align:center;">Locations of posts</th></tr>
      <tr><td class="stats noborder"><div id="map_canvas" style="width:400px; height:250px; margin-left:auto; border:1px solid black;"></div></td></tr>
    </table>
  </div>
  <div id="d_behaviour" class="contents">
    <p class="smalll">Note: The API delivers post date and time in UTC.</p>
    <hr>
    <div id="day_chart"></div>
    <div id="weekday_chart"></div>
    <div id="hour_chart"></div>
  </div>
  <div id="d_reshares" class="contents">
<?php
    for($auth=0;$auth<2;$auth++) {
      printf("    <h1>Posts by %s reshared by %s</h1><br>\n",$str_author_name[$auth],$str_author_name[1-$auth]);
      for($i=0;$i<$num_activities[1-$auth];$i++) {
        $a = $activities[1-$auth][$i];
        if(isset($a["object"]["actor"])) {
          if($a["object"]["actor"]["id"]==$str_author_id[$auth]) {
            $post_published = substr($a["published"],0,10)." ".substr($a["published"],11,8);
            $post_updated = substr($a["updated"],0,10)." ".substr($a["updated"],11,8);
            $post_link = $a["url"];
            printf("    <p class=\"smalll\"><a href=\"%s\">%s</a>",$post_link,$post_published);
            if($post_published!=$post_updated) {
              printf(" (updated %s)",$post_updated);
            }
            printf("</p>\n");
            printf("    <b>%s:</b>\n",$str_author_name[1-$auth]);
            if($a["annotation"]!="") {
              $annotation = preg_replace("/ oid=\".*?\"/","",$a["annotation"]);
              printf("    %s\n",$annotation);
            }
            printf("    <br>\n");
            print_activity($a,4,true);
            printf("    <br>\n");
          }
        }
      }
      printf("<br><br>\n");
    }

    printf("<h1>Posts reshared by both %s and %s</h1><br>\n",$str_author_name[0],$str_author_name[1]);

    for($i=0;$i<$num_activities[0];$i++) {
      $a = $activities[0][$i];
      if(isset($a["object"]["actor"])) {
        for($j=0;$j<$num_activities[1];$j++) {
          $a1 = $activities[1][$j];
          if(isset($a1["object"]["actor"])) {
            if($a["object"]["url"]==$a1["object"]["url"]) {
              $post_published = substr($a["published"],0,10)." ".substr($a["published"],11,8);
              $post_updated = substr($a["updated"],0,10)." ".substr($a["updated"],11,8);
              $post_link = $a["url"];
              printf("    <p class=\"smalll\"><a href=\"%s\">%s</a>",$post_link,$post_published);
              if($post_published!=$post_updated) {
                printf(" (updated %s)",$post_updated);
              }
              printf("</p>\n");
              printf("    <b>%s:</b>\n",$str_author_name[0]);
              if($a["annotation"]!="") {
                $annotation = preg_replace("/ oid=\".*?\"/","",$a["annotation"]);
                printf("    %s\n",$annotation);
              }
              printf("    <br>\n");
              $post_published = substr($a1["published"],0,10)." ".substr($a1["published"],11,8);
              $post_updated = substr($a1["updated"],0,10)." ".substr($a1["updated"],11,8);
              $post_link = $a1["url"];
              printf("    <p class=\"smalll\"><a href=\"%s\">%s</a>",$post_link,$post_published);
              if($post_published!=$post_updated) {
                printf(" (updated %s)",$post_updated);
              }
              printf("</p>\n");
              printf("    <b>%s:</b>\n",$str_author_name[1]);
              if($a1["annotation"]!="") {
                $annotation = preg_replace("/ oid=\".*?\"/","",$a1["annotation"]);
                printf("    %s\n",$annotation);
              }
              printf("    <br>\n");
              print_activity($a,4,true);
              printf("    <br><br>\n");
            }
          }
        }
      }
    }


?>
  </div>
<?php
    unset($activities);
  }
  if($str_errors!="") {
    $str_errors = str_replace("&amp;","&",$str_errors);
    $str_errors = str_replace("&","&amp;",$str_errors);
    printf("<div id=\"errors\" style=\"display:none\">%s</div>\n",$str_errors);
  }
?>
  </div>
<?php
  if($str_author_name[0]!=""&&$str_author_name[1]!="") {
    printf("  <div id=\"footer\" class=\"footer_data\">\n");
  } else {
    printf("  <div id=\"footer\">\n");
  }
?>
    <p class="smallr">Programming by <a href="https://plus.google.com/112336147904981294875" style="color:#000000;" rel="author">Gerwin Sturm</a>, <a href="http://www.foldedsoft.at/" style="color:#000000;">FoldedSoft e.U.</a> / <a href="<?php echo $base_url;?>info.html" style="color:#000000;">Privacy Statement &amp; Info</p>
  </div>
</body>
</html>
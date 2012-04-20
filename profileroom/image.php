<?php
  if (isset($_GET["file"])) {
    $file_name = urldecode($_GET["file"]);

    try { 
      $image = imagecreatefromstring(file_get_contents($file_name));
    } catch(Exception $e) {
      $image = imagecreate(20,20);
    }
    header('Content-Type: image/jpeg');
    imagejpeg($image);
    imagedestroy($image); 
  }
?>
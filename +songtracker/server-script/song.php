<!DOCTYPE html>
<html>
  <head>
    <title><?php echo urldecode(str_replace("_","%",$_GET["title"])) . " by " . urldecode(str_replace("_","%",$_GET["artist"])); ?></title>
  </head>
  <body itemscope itemtype="http://schema.org/MusicRecording">
    <img itemprop="image" src="<?php echo urldecode(str_replace("_","%",$_GET["image"])); ?>"/><br>
    Title: <span itemprop="name"><?php echo urldecode(str_replace("_","%",$_GET["title"])); ?></span><br>
    <section itemprop="byArtist" itemscope itemtype="http://schema.org/MusicGroup">
      Artist:  <span itemprop="name"><?php echo urldecode(str_replace("_","%",$_GET["artist"])); ?></span>
    </section>
  </body>
</html>
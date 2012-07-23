<!DOCTYPE html>
<html>
  <head>
    <title><?php echo urldecode(str_replace("_","%",$_GET["title"])) . " by " . urldecode(str_replace("_","%",$_GET["artist"])); ?></title>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
    <script src="jquery.jsonp-2.3.0.min.js"></script>
    <script type="text/javascript">
      $(document).ready(function() {
        var search = "<?php echo str_replace('"','\"',urldecode(str_replace("_","%",$_GET["title"] . " " . $_GET["artist"]))); ?>";
        var request = "https://gdata.youtube.com/feeds/api/videos?callback=?&q=" + encodeURIComponent(search) + "&max-results=5&alt=jsonc&prettyprint=true&v=2";
        $.jsonp({
          "url": request,
          "success": function (data) {
            var i, item;
            if (data.data && data.data.items) {
              for (i = 0; i < data.data.items.length; i++) {
                item = data.data.items[i];
                $("#videos").append("<iframe id=\"ytplayer\" type=\"text/html\" width=\"320\" height=\"200\" src=\"http://www.youtube.com/embed/" + item.id + "?autoplay=0\" frameborder=\"0\"/> ")
              }
            } else {
              $("#videos").html("No related videos found.");
            }
          },
          "error": function (d, msg) {
            $("#videos").html("Couldn't load videos " + msg);
          }
        });
      });
    </script>
  </head>
  <body itemscope itemtype="http://schema.org/MusicRecording">
    <img itemprop="image" src="<?php echo urldecode(str_replace("_","%",$_GET["image"])); ?>"/><br>
    Title: <span itemprop="name"><?php echo urldecode(str_replace("_","%",$_GET["title"])); ?></span><br>
    <section itemprop="byArtist" itemscope itemtype="http://schema.org/MusicGroup">
      Artist:  <span itemprop="name"><?php echo urldecode(str_replace("_","%",$_GET["artist"])); ?></span>
    </section>
    <div id="videos"></div>
  </body>
</html>
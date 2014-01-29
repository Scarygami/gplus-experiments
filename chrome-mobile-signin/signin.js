(function (global) {
  "use strict";

  var
    doc = global.document,
    chr = global.chrome,
    dom = {
      "signin": doc.getElementById("signin"),
      "signout": doc.getElementById("signout"),
      "user": doc.getElementById("user"),
      "username": doc.getElementById("username"),
      "userpic": doc.getElementById("userpic")
    };

  // Show/Hide UI elements based on Sign-in status
  function toggleUi(signedIn) {
    if (signedIn) {
      dom.signin.style.display = "none";
      dom.signout.style.display = "inline-block";
    } else {
      dom.signin.style.display = "inline-block";
      dom.signout.style.display = "none";
      dom.user.style.display = "none";
    }
  }

  function displayUser(info) {
    dom.username.textContent = info.displayName;
    if (info.image && info.image.url) {
      dom.userpic.src = info.image.url;
    } else {
      dom.userpic.src = "";
    }
    dom.user.style.display = "block";
  }

  function fetchUser() {
    var xhr;
    chr.identity.getAuthToken({"interactive": false}, function (token) {
      if (chr.runtime.lastError) {
        // couldn't retrieve valid token
        toggleUi(false);
      }

      // Authenticated request for information about the current user
      xhr = new global.XMLHttpRequest();
      xhr.open("GET", "https://www.googleapis.com/plus/v1/people/me");
      xhr.setRequestHeader("Authorization", "Bearer " + token);
      xhr.onload = function () {
        if (xhr.status === 200) {
          // User information received
          displayUser(JSON.parse(xhr.response));
        } else {
          // Couldn't get user information
          toggleUi(false);
        }
      };
      xhr.send();
    });
  }

  function handleSignin() {
    if (chr.runtime.lastError) {
      // Sign-in failed or was cancelled by user
      toggleUi(false);
    } else {
      // Sign-in successful, here's where the real app logic would start
      toggleUi(true);
      fetchUser();
    }
  }

  // attempt "silent" login at first
  chr.identity.getAuthToken({"interactive": false}, handleSignin);

  dom.signin.onclick = function () {
    // Launch interactive Sign-in flow
    chr.identity.getAuthToken({"interactive": true}, handleSignin);
  };

  dom.signout.onclick = function () {
    chr.identity.getAuthToken({"interactive": true}, function (token) {
      var xhr;
      if (!chr.runtime.lastError) {
        // We still have a valid access token

        // Remove the locally cached token
        chr.identity.removeCachedAuthToken({"token": token}, function () {});

        // Revoke all permissions
        xhr = new global.XMLHttpRequest();
        xhr.open("GET", "https://accounts.google.com/o/oauth2/revoke?token=" + token);
        xhr.send();
      }
      toggleUi(false);
    });
  };

}(this));
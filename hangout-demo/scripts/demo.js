(function (window) {
  "use strict";

  function HangoutDemo() {
    console.log("Starting...");

    gapi.hangout.onApiReady.add(this.onApiReady.bind(this));
  }

  HangoutDemo.prototype.onApiReady = function (event) {
    if (event.isApiReady === true) {
      console.log("API Ready");

      gapi.hangout.onParticipantsChanged.add(this.onParticipantsChanged.bind(this));

      document.getElementById("clickme").onclick = (this.buttonClick.bind(this));

      gapi.hangout.data.onStateChanged.add(this.onStateChanged.bind(this));

      this.displayParticipants();
      this.onStateChanged();
    }
  };

  HangoutDemo.prototype.buttonClick = function () {
    var value = parseInt(gapi.hangout.data.getValue("count") || "0", 10);
    gapi.hangout.data.setValue("count", (value + 1).toString());
  };

  HangoutDemo.prototype.onStateChanged = function (event) {
    document.getElementById("count").innerHTML = gapi.hangout.data.getValue("count") || "0";
  };

  HangoutDemo.prototype.onParticipantsChanged = function (event) {
    this.displayParticipants();
  };

  HangoutDemo.prototype.displayParticipants = function () {
    var div, participants, ul, li, i, l;
    div = document.getElementById("container");
    div.innerHTML = "";
    participants = gapi.hangout.getParticipants();
    ul = document.createElement("ul");
    l = participants.length;
    for (i = 0; i < participants.length; i++) {
      li = document.createElement("li");
      if (participants[i].person) {
        li.innerHTML = participants[i].person.displayName;
      } else {
        li.innerHTML = "unknown";
      }
      ul.appendChild(li);
    }
    document.getElementById("container").appendChild(ul);
  };

  var hangoutDemo = new HangoutDemo();
}(window));
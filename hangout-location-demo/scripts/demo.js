/*
 * Copyright (c) 2012 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

(function (window) {
  "use strict";
  var locationApp;

  function LocationApp() {
    this.map = null;
    this.latlng = {};
    this.locations = {};
    this.api_key = "<YOUR API KEY>";

    gapi.hangout.onApiReady.add(this.onApiReady.bind(this)); // Add callback
  }

  LocationApp.prototype.onApiReady = function (event) {
    if (event.isApiReady === true) {
      google.load("maps", "3", {other_params: "key=" + this.api_key + "&sensor=false", callback: this.mapsReady.bind(this)});
    }
  };

  LocationApp.prototype.mapsReady = function () {
    var scopes;

    this.prepareMap();

    scopes = [
      'https://www.googleapis.com/auth/plus.me',
      'https://www.googleapis.com/auth/hangout.av',
      'https://www.googleapis.com/auth/hangout.participants',
      'https://www.googleapis.com/auth/latitude.current.city'
    ];

    gapi.client.setApiKey(null);
    gapi.auth.authorize({
      client_id: null,
      scope: scopes,
      immediate: true
    }, this.handleAuthResult.bind(this));

    gapi.hangout.data.onStateChanged.add(this.onStateChanged.bind(this));
    gapi.hangout.onParticipantsDisabled.add(this.removeParticipants.bind(this));
    gapi.hangout.onParticipantsRemoved.add(this.removeParticipants.bind(this));
    this.showAllLocations();
  };

  LocationApp.prototype.prepareMap = function () {
    var latlng, myOptions;
    latlng = new google.maps.LatLng(0, 0);
    myOptions = {
      zoom: 0,
      center: latlng,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    this.map = new google.maps.Map(document.getElementById("map"), myOptions);
  };

  LocationApp.prototype.handleAuthResult = function (authResult) {
    if (authResult) {
      gapi.client.load('latitude', 'v1', this.loadLocation.bind(this));
    } else {
      document.getElementById("current_location").innerHTML = "Can't determine location: not authorized";
    }
  };

  LocationApp.prototype.loadLocation = function () {
    var request;
    request = gapi.client.latitude.currentLocation.get({"granularity": "city"});
    request.execute(function (loc) {
      var button, wp;
      if (loc.error) {
        document.getElementById("current_location").innerHTML = "Can't determine location: " + loc.error.message;
      } else {
        document.getElementById("current_location").innerHTML = "Current location: " + loc.latitude + " " + loc.longitude;
        this.latlng.lat = loc.latitude;
        this.latlng.lng = loc.longitude;
        button = document.getElementById("share");
        button.removeAttribute("disabled");
        button.onclick = this.shareLocation.bind(this);
        button = document.getElementById("unshare");
        button.onclick = this.unshareLocation.bind(this);
        wp = new google.maps.LatLng(this.latlng.lat, this.latlng.lng);
        this.locations[gapi.hangout.getParticipantId()] = new google.maps.Marker({position: wp, map: this.map});
        this.zoom();
      }
    }.bind(this));
  };

  LocationApp.prototype.shareLocation = function () {
    var button, shareObj;
    button = document.getElementById("share");
    button.setAttribute("disabled", "disabled");
    button = document.getElementById("unshare");
    button.removeAttribute("disabled");
    shareObj = {lat: this.latlng.lat, lng: this.latlng.lng};
    gapi.hangout.data.setValue(gapi.hangout.getParticipantId(), JSON.stringify(shareObj));
  };

  LocationApp.prototype.unshareLocation = function () {
    var button;
    button = document.getElementById("unshare");
    button.setAttribute("disabled", "disabled");
    button = document.getElementById("share");
    button.removeAttribute("disabled");
    gapi.hangout.data.clearValue(gapi.hangout.getParticipantId());
  };

  LocationApp.prototype.showAllLocations = function () {
    var state, id, latlng;
    state = gapi.hangout.data.getState();
    for (id in state) {
      if (state.hasOwnProperty(id)) {
        latlng = JSON.parse(state[id]);
        this.addLocation(id, latlng.lat, latlng.lng);
      }
    }
  };

  LocationApp.prototype.onStateChanged = function (event) {
    var i, l, id, latlng;
    l = event.addedKeys.length;
    for (i = 0; i < l; i++) {
      id = event.addedKeys[i].key;
      latlng = JSON.parse(event.addedKeys[i].value);
      this.addLocation(id, latlng.lat, latlng.lng);
    }
    l = event.removedKeys.length;
    for (i = 0; i < l; i++) {
      id = event.removedKeys[i];
      this.removeLocation(id);
    }
  };

  LocationApp.prototype.addLocation = function (id, lat, lng) {
    var latlng, info, image_url, image, participant;
    if (id !== gapi.hangout.getParticipantId()) {
      if (!this.locations[id]) {
        latlng = new google.maps.LatLng(lat, lng);
        participant = gapi.hangout.getParticipantById(id);
        if (participant && participant.person) {
          info = participant.person.displayName;
          image_url = participant.person.image.url;
          image = new google.maps.MarkerImage(
            image_url,
            new google.maps.Size(32, 32),
            new google.maps.Point(0, 0),
            new google.maps.Point(16, 16),
            new google.maps.Size(32, 32)
          );
          this.locations[id] = new google.maps.Marker({
            position: latlng,
            map: this.map,
            title: info,
            icon: image
          });
          this.zoom();
        }
      }
    }
  };

  LocationApp.prototype.removeLocation = function (id) {
    if (id !== gapi.hangout.getParticipantId()) {
      if (this.locations[id]) {
        this.locations[id].setMap(null);
        delete this.locations[id];
        this.zoom();
      }
    }
  };

  LocationApp.prototype.zoom = function () {
    var bounds, id;
    bounds = new google.maps.LatLngBounds();
    for (id in this.locations) {
      if (this.locations.hasOwnProperty(id)) {
        bounds.extend(this.locations[id].getPosition());
      }
    }
    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds);
      if (this.map.getZoom() > 8) {
        this.map.setZoom(8);
      }
    }
  };

  LocationApp.prototype.removeParticipants = function (event) {
    var i, l, remove, participants;
    participants = event.disabledParticipants || event.removedParticipants || [];
    l = participants.length;
    remove = [];
    for (i = 0; i < l; i++) {
      remove.push(participants[i].id);
    }
    gapi.hangout.data.submitDelta({}, remove);
  };

  function onClientReady() {
    locationApp = new LocationApp();
  }

  window.onClientReady = onClientReady;
}(window));
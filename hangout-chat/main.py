#!/usr/bin/python

# Copyright (C) 2013 Gerwin Sturm, FoldedSoft e.U.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


__author__ = 'scarygami@gmail.com (Gerwin Sturm)'

import jinja2
import json
import os
import webapp2
import hashlib

from google.appengine.api import channel
from google.appengine.ext import ndb

JINJA = jinja2.Environment(loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

CLIENT_ID = "YOUR_CLIENT_ID"


class Hangout(ndb.Model):
    connectedUsers = ndb.StringProperty(repeated=True)


class User(ndb.Model):
    displayName = ndb.StringProperty()
    imageUrl = ndb.StringProperty()


class IndexHandler(webapp2.RequestHandler):
    """Renders the main chat page"""

    def get(self):
        hangoutId = self.request.get("hangout")
        if hangoutId is None or hangoutId == "":
            self.response.status = 400
            self.response.out.write("Hangout ID missing")
            return

        hangout = ndb.Key(Hangout, hangoutId).get()

        if hangout is None:
            self.response.status = 404
            self.response.out.write("Hangout not found")
            return

        template = JINJA.get_template("templates/chat.html")
        self.response.out.write(template.render({"hangout_id": hangoutId, "client_id": CLIENT_ID, "hangout": False}))


class HangoutHandler(webapp2.RequestHandler):
    """Renders the html page to be used in the Hangout extension"""

    def get(self):
        template = JINJA.get_template("templates/chat.html")
        self.response.out.write(template.render({"hangout": True}))


class ConnectHandler(webapp2.RequestHandler):
    """Creates a new hangout entity if necessary and creates a channel for the User"""

    def post(self):
        try:
            data = json.loads(self.request.body)
        except ValueError:
            self.response.status = 400
            self.response.out.write("Invalid connect message")
            return

        if not "hangoutId" in data:
            self.response.status = 400
            self.response.out.write("Missing Hangout ID")
            return

        hangoutId = data["hangoutId"]
        if "hangout" in data and data["hangout"] is True:
            hangoutId = hashlib.md5(hangoutId).hexdigest()

        if not "user" in data:
            self.response.status = 400
            self.response.out.write("Missing User Data")

        userdata = data["user"]

        if not "id" in userdata or not "image" in userdata or not "displayName" in userdata or not "url" in userdata["image"]:
            self.response.status = 400
            self.response.out.write("Incomplete User Data")

        userid = userdata["id"]
        if not "hangout" in data or data["hangout"] is None or data["hangout"] is False:
            userid = userdata["id"] + "_outside"

        user = ndb.Key(User, userid).get()
        if user is None:
            user = User(id=userid)

        user.displayName = userdata["displayName"]
        user.imageUrl = userdata["image"]["url"]
        user.put()

        hangout = ndb.Key(Hangout, hangoutId).get()
        if hangout is None:
            hangout = Hangout(id=hangoutId)

        if hangout.connectedUsers is None:
            hangout.connectedUsers = []

        if not userid in hangout.connectedUsers:
            hangout.connectedUsers.append(userid)

        hangout.put()

        self.response.status = 200
        token = channel.create_channel(hashlib.md5(hangout.key.id() + "_" + userid).hexdigest())
        self.response.content_type = "application/json"
        self.response.out.write(json.dumps({"channel": token, "hangoutId": hangoutId}))


class MessageHandler(webapp2.RequestHandler):
    """Receives a message from users and distributes them to all channels for this hangout"""

    def post(self):
        try:
            data = json.loads(self.request.body)
        except ValueError:
            self.response.status = 400
            self.response.out.write("Invalid message")
            return

        if not "hangoutId" in data or not "userId" in data or not "message" in data:
            self.response.status = 400
            self.response.out.write("Incomplete Message")
            return

        if data["hangoutId"] is None or data["hangoutId"] == "" or data["userId"] is None or data["userId"] == "":
            self.response.status = 400
            self.response.out.write("Incomplete Message")
            return

        userid = data["userId"]
        if not "hangout" in data or data["hangout"] is None or data["hangout"] is False:
            userid = data["userId"] + "_outside"

        hangout = ndb.Key(Hangout, data["hangoutId"]).get()
        user = ndb.Key(User, userid).get()

        if hangout is None or user is None:
            self.response.status = 400
            self.response.out.write("Invalid Hangout or User id")

        message = {}
        message["message"] = data["message"]
        message["userName"] = user.displayName
        message["userImage"] = user.imageUrl

        if "hangout" in data and data["hangout"] is True:
            message["hangout"] = True
        else:
            message["hangout"] = False

        for recipient in hangout.connectedUsers:
            channel.send_message(hashlib.md5(hangout.key.id() + "_" + recipient).hexdigest(), json.dumps(message))

        self.response.status = 200
        self.response.out.write("Success")


app = webapp2.WSGIApplication(
    [
        ("/", IndexHandler),
        ("/hangout-chat.html", HangoutHandler),
        ("/connect", ConnectHandler),
        ("/send", MessageHandler)
    ],
    debug=True
)

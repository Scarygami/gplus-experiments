# Copyright 2012 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


import settings
import httplib2
import os
import urllib
import webapp2
import json


from apiclient.discovery import build
from apiclient.errors import HttpError
from oauth2client.appengine import OAuth2Decorator
from oauth2client.appengine import OAuth2Handler
from google.appengine.api import memcache
from google.appengine.ext.webapp import template


# The client_id and client_secret are copied from the API Access tab on
# the Google APIs Console <http://code.google.com/apis/console>
decorator = OAuth2Decorator(
    client_id=settings.CLIENT_ID,
    client_secret=settings.CLIENT_SECRET,
    scope='https://www.googleapis.com/auth/plus.me')

http = httplib2.Http(memcache)
httpUnauth = httplib2.Http(memcache)

# Get discovery document
ul = urllib.urlopen(settings.DISCOVERY_DOCUMENT)
discovery_doc = ul.read()
ul.close()

service = build("plus", "v1", http=http)
serviceUnauth = build("plus", "v1", http=httpUnauth, developerKey=settings.API_KEY)


class WelcomeHandler(webapp2.RequestHandler):
    def get(self):
        path = os.path.join(os.path.dirname(__file__), 'user.html')
        self.response.out.write(template.render(path, {"chk_user": False, "jsapikey": settings.JSAPI_KEY}))


class LoginHandler(webapp2.RequestHandler):
    @decorator.oauth_required
    def get(self):
        http = decorator.http()
        try:
            me = service.people().get(userId='me').execute(http)
        except:
            self.redirect("/")
            return
        self.redirect("/u/" + me["id"])


class SearchHandler(webapp2.RequestHandler):
    def post(self):
        user_id = self.request.get("userid")
        # TODO: extract id from string
        self.redirect("/u/" + user_id)


class UserHandler(webapp2.RequestHandler):
    def get(self, user_id):
        path = os.path.join(os.path.dirname(__file__), 'user.html')
        try:
            user = serviceUnauth.people().get(userId=user_id).execute(httpUnauth)
        except:
            self.response.out.write(template.render(path, {'chk_user': False, 'chk_error': True, "jsapikey": settings.JSAPI_KEY}))
            return
        user["image"]["url"] = (user["image"]["url"].replace("?sz=50", "?sz=200"))
        self.response.out.write(template.render(path, {'chk_user': True, 'user': user, "jsapikey": settings.JSAPI_KEY}))


class PostsHandler(webapp2.RequestHandler):
    def get(self, user_id, token):
        try:
            if token:
                activities_doc = serviceUnauth.activities().list(userId=user_id, pageToken=token, maxResults=100, collection="public").execute(httpUnauth)
            else:
                activities_doc = serviceUnauth.activities().list(userId=user_id, maxResults=100, collection="public").execute(httpUnauth)
        except HttpError:
            self.response.out.write(json.dumps({"error": "HTTP error"}))
            return
        except:
            self.response.out.write(json.dumps({"error": "API Access error"}))
            return
        self.response.out.write(json.dumps(activities_doc))


class PeopleHandler(webapp2.RequestHandler):
    def get(self, activity_id, str_type):
        people = ""
        if str_type == "replies":
            try:
                people_doc = serviceUnauth.comments().list(activityId=activity_id, maxResults=100).execute(httpUnauth)
            except HttpError:
                self.response.out.write(json.dumps({"error": "HTTP error"}))
                return
            except:
                self.response.out.write(json.dumps({"error": "API Access error"}))
                return
            for p in people_doc["items"]:
                if people != "":
                    people += ","
                people += json.dumps(p["actor"])
            self.response.out.write("{\"items\": [" + people + "]}")
        else:
            try:
                people_doc = serviceUnauth.people().listByActivity(activityId=activity_id, collection=str_type, maxResults=100).execute(httpUnauth)
            except HttpError:
                self.response.out.write(json.dumps({"error": "HTTP error"}))
                return
            except:
                self.response.out.write(json.dumps({"error": "API Access error"}))
                return
            for p in people_doc["items"]:
                if people != "":
                    people += ","
                people += json.dumps(p)
            self.response.out.write("{\"items\": [" + people + "]}")


app = webapp2.WSGIApplication(
        [
         ('/', WelcomeHandler),
         ('/login', LoginHandler),
         ('/oauth2callback', OAuth2Handler),
         ('/search', SearchHandler),
         (r'/u/(.+)', UserHandler),
         (r'/posts/(.+)/(.*)', PostsHandler),
         (r'/people/(.+)/(.+)', PeopleHandler)
        ],
        debug=True)


# based on Google+ Python API Starter Project    http://code.google.com/p/google-plus-python-starter/
# Copyright 2011 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

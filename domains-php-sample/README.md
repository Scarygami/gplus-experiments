# Google+ Domains API PHP Sample

### Description

This is simple example to illustrate how to use
[domain-wide delegation](https://developers.google.com/+/domains/authentication/delegation)
with the [Google+ Domains API](https://developers.google.com/+/domains/) in PHP.

This also shows how you can use the Google+ Domains API in combination with the
[Directory API](https://developers.google.com/admin-sdk/directory/) to list all users
in your domain and perform Google+ related tasks on their behalf.


### Setup

1.  Follow the steps of the [official docs](https://developers.google.com/+/domains/authentication/delegation)
    to enable domain-wide delegation for your domain.
    
    For this example you will need to authorize the following scopes:
    
```
https://www.googleapis.com/auth/admin.directory.user.readonly
https://www.googleapis.com/auth/plus.me
https://www.googleapis.com/auth/plus.stream.read
```

2.  You also need to authorize API Access for Administrative APIs in `Security / API Reference`
    in your Domain Admin panel to enable the Admin SDK APIs that include the Directory API
    
3.  Change the values of `CLIENT_ID`, `SERVICE_ACCOUNT_EMAIL`, `KEY_FILE`, `DOMAIN_ADMIN_EMAIL`
    and `DOMAIN` in `index.php` accordingly.
    

### License    

```
Copyright 2011-2013 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

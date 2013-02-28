OAuth2.adapter('google', {
  authorizationCodeURL: function(config) {
    return ('https://accounts.google.com/o/oauth2/auth?' +
      'client_id={{CLIENT_ID}}&' +
      'redirect_uri={{REDIRECT_URI}}&' +
      'scope={{API_SCOPE}}&' +
      'request_visible_actions={{VISIBLE_ACTIONS}}&' +
      'access_type=offline&' +
      'response_type=code')
        .replace('{{CLIENT_ID}}', config.clientId)
        .replace('{{REDIRECT_URI}}', config.redirectUri)
        .replace('{{API_SCOPE}}', config.apiScope)
        .replace('{{VISIBLE_ACTIONS}}', config.requestVisibleActions);
  },

  parseAuthorizationCode: function(url) {
    var error = url.match(/[&\?]error=([^&]+)/);
    if (error) {
      throw 'Error getting authorization code: ' + error[1];
    }
    return url.match(/[&\?]code=([\w\/\-]+)/)[1];
  },

  accessTokenURL: function() {
    return 'https://accounts.google.com/o/oauth2/token';
  },

  accessTokenMethod: function() {
    return 'POST';
  },

  accessTokenParams: function(authorizationCode, config) {
    return {
      code: authorizationCode,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code'
    };
  },

  parseAccessToken: function(response) {
    var parsedResponse = JSON.parse(response);
    return {
      accessToken: parsedResponse.access_token,
      refreshToken: parsedResponse.refresh_token,
      expiresIn: parsedResponse.expires_in
    };
  }
});

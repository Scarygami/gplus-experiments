<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Google+ Domains API Sample</title>
  </head>
  <body>
<?php
  require_once "gclient/Google_Client.php";
  require_once "gclient/contrib/Google_DirectoryService.php";
  require_once "gclient/contrib/Google_PlusDomainsService.php";
  
  const CLIENT_ID = "INSERT_YOUR_CLIENT_ID";
  const SERVICE_ACCOUNT_EMAIL = "INSERT_YOUR_SERVICE_ACCOUNT_EMAIL";
  const KEY_FILE = '/super/secret/path/to/key.p12';
  
  // To access the Directory API the email address of a Domain admin is necessary here
  const DOMAIN_ADMIN_EMAIL = "INSERT_YOUR_DOMAIN_ADMIN_EMAIL";
  
  const DOMAIN = "INSERT_YOUR_DOMAIN_HERE"; // e.g. "example.com"

  $client = new Google_Client();
  $client->setApplicationName("Google+ Domains API Sample");
  $key = file_get_contents(KEY_FILE);
  $credentials = new Google_AssertionCredentials(
    SERVICE_ACCOUNT_EMAIL,
    array("https://www.googleapis.com/auth/admin.directory.user.readonly"),
    $key);
  $credentials->sub = DOMAIN_ADMIN_EMAIL;
  $client->setAssertionCredentials($credentials);
  $client->setClientId(CLIENT_ID);
  
  $directoryService = new Google_DirectoryService($client);
  
  // Call to the Admin Directory API to retrieve a list of all Domain Users
  $result = $directoryService->users->listUsers(array("domain" => DOMAIN));
  if (isset($result["users"])) {
    $users = $result["users"];
    printf("    <ul>\n");
    for ($i = 0; $i < count($users); $i++) {
      printf("      <li>%s\n", $users[$i]["name"]["fullName"]);
      do_something_with_user($users[$i]["primaryEmail"]);
      printf("      </li>\n");
    }
    printf("    </ul>\n");
  }

  function do_something_with_user($email) {
    global $key;
    $user_client = new Google_Client();
    $user_client->setApplicationName("Google+ Domains API Sample");
    $user_credentials = new Google_AssertionCredentials(
      SERVICE_ACCOUNT_EMAIL,
      array("https://www.googleapis.com/auth/plus.me",
            "https://www.googleapis.com/auth/plus.stream.read"),
      $key);
      
    // Set the API Client to act on behalf of the specified user
    $user_credentials->sub = $email;

    $user_client->setAssertionCredentials($user_credentials);
    $user_client->setClientId(CLIENT_ID);
    
    $plusService = new Google_PlusService($user_client);
    
    // Try to retrieve Google+ Profile information about the current user
    try {
      $result = $plusService->people->get("me");
    } catch (Exception $e) {
      printf("        / Not a Google+ User<br><br>\n");
      return;
    }
    printf("        / <a href=\"%s\">Google+ Profile</a>\n", $result["url"]);
    
    // Retrieve a list of Google+ activities for the current user
    $activities = $plusService->activities->listActivities("me", "user", array("maxResults" => 100));
    if (isset($activities["items"])) {
      printf("        / %s activities found<br><br>\n", count($activities["items"]));
    } else {
      printf("        / No activities found<br><br>\n");
    }
  }
?>  
  </body>
</html>
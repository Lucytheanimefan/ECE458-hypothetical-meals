function dropDownInteractivity() {
  var acc = document.getElementsByClassName("accordion");
  var i;

  for (i = 0; i < acc.length; i++) {
    acc[i].onclick = function() {
      this.classList.toggle("active");
      this.nextElementSibling.classList.toggle("show");
    }
  }
}

//dropDownInteractivity();


function checkIsAdmin(callback) {
  $.ajax({
    type: 'GET',
    url: '/users/isAdmin',
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    success: function(response) {
      console.log(response);
      callback(response['isAdmin']);
    }
  });
}

function checkLoggedIn(callback) {
  $.ajax({
    type: 'GET',
    url: '/users/isLoggedIn',
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    success: function(response) {
      console.log('is logged in? ' + response);
      callback(response);
    }
  });
}

function loadLoggedInContent() {
  console.log('Load logged in content');
  checkLoggedIn(function(loggedIn) {
    if (loggedIn) {
      loadSideBar();
    } else {
      $('#profile').text('Login');
      $('#logout').addClass('hide');
    }
  })
}

function loadAdminOnlyContent() {
  checkIsAdmin(function(isAdmin) {
    if (!isAdmin) return;

    // Is admin
    $('.adminOnly').removeClass('hide');

  });
}

function loadSideBar() {
  checkIsAdmin(function(isAdmin) {
    // Is admin
    $('.meal-category').each(function() {
      if (isAdmin) {
        console.log('loadAdminOnlySideBar');
        $(this).removeClass('hide');
      } else {
        // Users
        let tmp = $(this).find('a')[0];
        let category = $($(tmp).find('p')[0]).text();
        if (category !== 'Inventory' && category !== 'Users') {
          $(this).removeClass('hide');
        }
      }
    });

  })
}


function getAccessTokenHash() {
  let hash = window.location.hash;
  let access_token = hash.substring(1);
  console.log(access_token);
  let paramsObject = JSON.parse('{"' + decodeURI(access_token).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
  console.log(paramsObject);
  getDukeIdentity(paramsObject);

}

function getDukeIdentity(parameters) {
  $.ajax({
    url: "https://api.colab.duke.edu/identity/v1/",
    headers: { 'x-api-key': 'hypotheticalmeals', 'Authorization': 'Bearer ' + parameters['access_token'], 'Accept': 'application/json' },
    type: "GET",
    success: function(result) {
      console.log('Successfully called duke identity api');
      //alert(JSON.stringify(result));
      console.log(result);
      //alert('For debugging only: ' + JSON.stringify(result));
      let netid = result['netid'];
      let email = result['mail'];
      // Create the identity
      createOrLoginAccountNetID({'netid':netid, 'email':email});

    }
  });
}

function createOrLoginAccountNetID(userdata) {
  $.ajax({
    url: "/users",
    type: "POST",
    data: userdata,
    success: function(result) {
      console.log('createOrLoginAccount returned');
      console.log(result);
      if (result['success']){
        window.location.href = '/users';
      }
      //console.log(result);
      // TODO: trigger success UI

    }
  });
}
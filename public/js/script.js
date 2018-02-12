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

function filterUsers(type) {
  console.log('Filter users!');
  var input, filter, table, tr, td, i;
  input = document.getElementById(type + "Input");
  filter = input.value.toUpperCase();
  table = document.getElementById(type + "Table");
  tr = table.getElementsByTagName("tr");
  for (i = 0; i < tr.length; i++) {
    let trElement = tr[i].getElementsByTagName("td");
    td0 = trElement[0];
    td1 = trElement[1];
    td2 = trElement[2];
    td3 = trElement[3];
    console.log(trElement);
    if (td0 || td1 || td2 || td3) {
      if (tdContainsFilteredText(td0, filter) || tdContainsFilteredText(td1, filter) 
        || tdContainsFilteredText(td2, filter) || tdContainsFilteredText(td3, filter)) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }       
  }
}

function tdContainsFilteredText(td, filter){
  return td.innerHTML.toUpperCase().indexOf(filter) > -1;
}

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
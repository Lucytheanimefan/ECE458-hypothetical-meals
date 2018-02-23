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

function filterTable(type) {
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
      if (tdContainsFilteredText(td0, filter) || tdContainsFilteredText(td1, filter) ||
        tdContainsFilteredText(td2, filter) || tdContainsFilteredText(td3, filter)) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
}

/**
 * [sortTable description]
 * @param  {[type]} n    The column index
 * @param  {String} type 'vendor' or 'user' or 'ingredient'
 * @return {[type]}      [description]
 */
function sortTable(n, type) {
  var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
  table = document.getElementById(type + "Table");
  switching = true;
  //Set the sorting direction to ascending:
  dir = "asc";
  /*Make a loop that will continue until
  no switching has been done:*/
  while (switching) {
    //start by saying: no switching is done:
    switching = false;
    rows = table.getElementsByTagName("TR");
    /*Loop through all table rows (except the
    first, which contains table headers):*/
    for (i = 1; i < (rows.length - 1); i++) {
      //start by saying there should be no switching:
      shouldSwitch = false;
      /*Get the two elements you want to compare,
      one from current row and one from the next:*/
      x = rows[i].getElementsByTagName("TD")[n];
      y = rows[i + 1].getElementsByTagName("TD")[n];
      /*check if the two rows should switch place,
      based on the direction, asc or desc:*/
      if (dir == "asc") {
        if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
          //if so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      } else if (dir == "desc") {
        if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
          //if so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      }
    }
    if (shouldSwitch) {
      /*If a switch has been marked, make the switch
      and mark that a switch has been done:*/
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      //Each time a switch is done, increase this count by 1:
      switchcount++;
    } else {
      /*If no switching has been done AND the direction is "asc",
      set the direction to "desc" and run the while loop again.*/
      if (switchcount == 0 && dir == "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}

function tdContainsFilteredText(td, filter) {
  return td.innerHTML.toUpperCase().indexOf(filter) > -1;
}

function getUserRole(callback) {
  $.ajax({
    type: 'GET',
    url: '/users/role',
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    success: function(response) {
      console.log(response);
      callback(response['role']);
    }
  });
}

function checkIsAdmin(callback) {
  getUserRole(function(role) {
    callback(role.toUpperCase() === "ADMIN");
  })
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

function loadRelevantContent() {
  let role = sessionStorage.getItem("role");
  console.log('Load relevant content for role: ' + role);
  if (role != null && role != "none") {
    console.log('-Load cached content!');
    loadContent(role);
  } else {
    getUserRole(function(role) {
      let my_role = role.toLowerCase();
      console.log('-Load relevant content for role: ' + role);

      // Cache the role
      sessionStorage.setItem("role", my_role);
      loadContent(my_role)
    })
  }
}

function loadContent(my_role) {
  if (my_role === 'admin') {
    $('.manager').removeClass('hide');
    $('.adminOnly').removeClass('hide');
  } else if (my_role === 'manager') {
    $('.manager').removeClass('hide');
  }
}

function loadAdminContent() {
  checkIsAdmin(function(isAdmin) {
    if (!isAdmin) return;
    $('.manager').removeClass('hide');
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

function loadPugView() {
  var description = $("#descriptionValues").data("description");
  console.log(description);

  if (typeof description == 'string') {
    $("#description").append(description);
    return;
  }

  for (var key in description) {
    if (description.hasOwnProperty(key) && (description instanceof Object)) {
      var text = '';
      //console.log(key.toLowerCase());
      var keyLower = key.toLowerCase()
      if (keyLower == 'vendor code') {
        text = key + ': <a href=\'/vendors/' + description[key] + '\'>' + description[key] + '</a>';
        $("#description").append("<li>" + text + "</li>");
      } else if (keyLower == 'ingredient_id' || keyLower == 'ingredient id') {
        console.log('get ingredient for id');
        getIngredientForID(description[key], function(ingredient) {
          text = 'Ingredient: <ul>';
          for (var ingKey in ingredient) {
            if (ingKey != '_id' && ingKey != '__v' && ingKey != 'vendors') {
              text += '<li>' + ingKey + ': ' + ingredient[ingKey] + '</li>';
            }
          }
          text += '</ul>';
          $("#description").append("<li>" + text + "</li>");
        })
      } else if (keyLower == "array_description") {
        for (var i in description[key]) {
          var result = description[key][i];
          console.log(result);

          if (result.hasOwnProperty('package')) { // it's an ingredient
            text += '<li>Ingredient: <a href=\'/ingredients/' + result['name'] + '\'>' + result['name'] + '</a></li>';
          } else if (result.hasOwnProperty('code')) { // it's a vendor
            text += '<li>Vendor: <a href=\'/vendors/' + result['code'] + '\'>' + result['code'] + '</a></li>';
          }
        }
        $("#description").append(text);
        //text = '<a href=\'/vendors/' + description[key] + '\'>' + '<b>' + key + '</b>: ' + description[key] + '</a>'

      } else {
        text = '<li>' + key + ': ' + description[key] + '</li>';
        $("#description").append(text);
      }
    }
  }
}

function getIngredientForID(id, callback) {
  console.log("Get ingredient for id");
  $.ajax({
    type: 'GET',
    url: '/ingredients/id/' + id,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    success: function(response) {
      console.log(response);
      callback(response);
    }
  });

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
      createOrLoginAccountNetID({ 'netid': netid, 'email': email });

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
      if (result['success']) {
        window.location.href = '/users';
      }
      //console.log(result);
      // TODO: trigger success UI

    }
  });
}

function addTuples(ingredients, start) {
  var next = start;
  ingredients = JSON.parse(ingredients);
  $(".add-more").click(function(e) {
    e.preventDefault();
    var addTo = "#tuple" + next;
    next = next + 1;

    var newHTML = '<div id="tuple' + next + '" class="row">';
    newHTML += '<div class="col-md-6"><div class="form-group"></div><label class="control-label">Ingredient</label>';
    newHTML += '<select class="form-control" id="ingredient' + next + '" name="ingredient' + next + '"><option disabled="" selected="" value="">Select an Ingredient</option>';

    var i;
    for (i = 0; i < ingredients.length; i++) {
      var ing = ingredients[i];
      newHTML += '<option value=' + ing._id + '>' + ing.name + '</option>';
    }
    newHTML += '</select></div>';
    newHTML += '<div class="col-md-6"><div class="form-group"></div><label class="control-label">Quantity</label>';
    newHTML += '<input class="form-control" id="quantity' + next + '" type="number" name="quantity' + next + '" min="0" step="0.01"/></div></div>';
    var newInput = $(newHTML);
    $(addTo).after(newInput);
    $("#tuple" + next).attr('data-source', $(addTo).attr('data-source'));
  });
}

function selectTuple(tuples) {
  tuples = JSON.parse(tuples);
  for (i = 0; i < tuples.length; i++) {
    var id = tuples[i].ingredientID;
    $("#ingredient" + (i + 1)).val(id).attr("selected", "true");
  }
}
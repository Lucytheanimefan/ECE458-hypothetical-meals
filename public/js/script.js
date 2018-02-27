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

function onLogout() {
  $("#logout").click(function() {
    console.log("Log out, clear session storage");
    // clear session storage
    sessionStorage.removeItem("role");
  })
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
      sessionStorage.removeItem("role");
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
    $('.admin').removeClass('hide');
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
        if (category !== 'Users' && category !== "Uploads") {
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

  var appendText = true;
  for (var key in description) {
    if (description.hasOwnProperty(key) && (description instanceof Object)) {
      var text = '';
      //console.log(key.toLowerCase());
      var keyLower = key.toLowerCase()
      if (keyLower == 'vendor code') {
        text = key + ': <a href=\'/vendors/' + description[key] + '\'>' + description[key] + '</a>';
        text = "<li>" + text + "</li>";
        //$("#description").append("<li>" + text + "</li>");
      } else if (keyLower == 'ingredient_id' || keyLower == 'ingredient id') {
        console.log('get ingredient for id');
        getIngredientForID(description[key], function(ingredient) {
          text = 'Ingredient: <ul>';
          for (var ingKey in ingredient) {
            if (ingKey != '_id' && ingKey != '__v' && ingKey != 'vendors') {
              value = ingredient[ingKey]
              if (ingKey == 'name') {
                value = '<a href="/ingredients/' + encodeURIComponent(value) + '">' + value + '</a>';
              }

              text += '<li>' + ingKey + ': ' + value + '</li>';
            }
          }
          text += '</ul>';
          text = "<li>" + text + "</li>";
          $("#description").append(text);
          //appendText = false;
        })
      } else if (keyLower == 'ingredient_name') {
        value = '<a href="/ingredients/' + encodeURIComponent(description[key]) + '">' + description[key] + '</a>';

        text = '<li>Ingredient: ' + value + '</li>';

      } else if (keyLower == 'ingredient_names') {
        var ingredients = description[keyLower];
        for (var i in ingredients) {
          value = '<a href="/ingredients/' + encodeURIComponent(ingredients[i]) + '">' + ingredients[i] + '</a>';
          text += '<li>Ingredient: ' + value + '</li>';
        }
      } else if (keyLower == "vendor_id") {
        var vendor_id = description[key];
        getVendorForID(vendor_id, function(vendor) {
          console.log(vendor);
          let code = vendor['code'];
          value = '<a href="/vendors/' + encodeURIComponent(code) + '">' + code + '</a>';
          text = '<li>Vendor code: ' + value + '</li>';
          $("#description").append(text);
        })
      } else if (keyLower == "vendor_code") {
        let code = description[key];
        let value = '<a href="/vendors/' + encodeURIComponent(code) + '">' + code + '</a>';
        text = '<li>Vendor code: ' + value + '</li>';
      } else if (keyLower == "array_description") {
        for (var i in description[key]) {
          console.log(description[key]);
          var result = description[key][i];
          if (result != null) {
            if (result.hasOwnProperty('package')) { // it's an ingredient
              text += '<li>Ingredient: <a href=\'/ingredients/' + result['name'] + '\'>' + result['name'] + '</a></li>';
            } else if (result.hasOwnProperty('code')) { // it's a vendor
              text += '<li>Vendor: <a href=\'/vendors/' + result['code'] + '\'>' + result['code'] + '</a></li>';
            }
          }
        }
        //$("#description").append(text);
      } else if (keyLower == "formula") {
        for (var formulaKey in description[key]) {
          if (formulaKey != '_id' && formulaKey != '__v') {
            value = description[key][formulaKey]
            if (formulaKey == 'tuples') {
              value = JSON.stringify(value);
            } else if (formulaKey == 'name') {
              value = '<a href="/formulas/' + encodeURIComponent(value) + '">' + value + '</a>';
            }
            text += '<li>' + formulaKey + ': ' + value + '</li>';
          }
        }
      } else if (keyLower == 'formula_names') {
        var formulas = description[keyLower];
        for (var i in formulas) {
          value = '<a href="/formulas/' + encodeURIComponent(formulas[i]) + '">' + formulas[i] + '</a>';
          text += '<li>Formula: ' + value + '</li>';
        }
      } else if (keyLower == 'username') {
        let username = description[key];
        value = '<a href="/users/user/' + encodeURIComponent(username) + '">' + username + '</a>';
        text = '<li>User: ' + value + '</li>';
      } else {
        text = '<li>' + key + ': ' + JSON.stringify(description[key]) + '</li>';
        //$("#description").append(text);
      }
      $("#description").append(text);
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

function getVendorForID(id, callback) {
  console.log("Get vendor for id");
  $.ajax({
    type: 'GET',
    url: '/vendors/vendor/id/' + id,
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
      } else {
        console.log('Error creating user: ' + result['error']);
      }
      //console.log(result);
      // TODO: trigger success UI

    }
  });
}

function addTuples(ingredients, start) {
  var next = start;
  ingredients = JSON.parse(ingredients);
  $("#btn1").click(function(e) {
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
    newHTML += '<div class="col-md-4"><div class="form-group"></div><label class="control-label">Quantity</label>';
    newHTML += '<input class="form-control" id="quantity' + next + '" type="number" name="quantity' + next + '" min="0" step="0.01"/></div>';
    newHTML += '<div class="col-md-2"><p><br/><br/><br/><br/></p>';
    //newHTML += '<div class="removeBtn" id="dataBtn">';
    console.log($("#ingredientSelect" + next).val());
    newHTML += '<button class="btn btn-round btn-just-icon remove" type="button" value="remove" onclick=deleteTuple(' + next + ',"' + $("#ingredient" + next) + '") style="background-color:red;"><i class="material-icons">delete</i></button></div>';
    newHTML += '</div>'
    var newInput = $(newHTML);
    $(addTo).after(newInput);
    $("#tuple" + next).attr('data-source', $(addTo).attr('data-source'));
  });
}

function deleteTuple(index) {
  if ($('#tuple' + index).hasClass('preexists')) {
    console.log("Delete tuple from db");
    // Delete the thing from the db
    var ingredientID = $("#ingredient" + index).val();
    var name = $("#ingredient" + index).data("ingredientname");

    console.log(name);
    console.log(ingredientID);
    if (name != null && ingredientID != null) {
      var tupleData = { "name": name, "id": ingredientID }
      console.log(name);
      $.ajax({
        type: 'POST',
        url: '/formulas/' + name + '/delete_tuple',
        data: JSON.stringify(tupleData),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: function(result) {
          if (!result['success']) {
            console.log('Error deleting tuple: ' + result['error']);
          } else {
            // var tupleName = "tuple"+index;
            // var delElem = document.getElementById(tupleName);
            // delElem.remove();
            $('#' + id).remove();
          }

        }
      });
    }
  }
  $('#tuple' + index).remove();


  // let name = element.name;
  // let id = element.id;
  // console.log(ingredients);
  // ingredients = JSON.parse(ingredients);
  // console.log(name);
  // console.log(id);
  // console.log(index);
  // var tupleData = {};
  // tupleData['name'] = name;
  // tupleData['id'] = id;
  // if (name != null && id != null) {
  //   $.ajax({
  //     type: 'POST',
  //     url: '/formulas/' + name + '/delete_tuple',
  //     data: JSON.stringify(tupleData),
  //     contentType: 'application/json; charset=utf-8',
  //     dataType: 'json',
  //     success: function(result) {
  //       if (!result['success']) {
  //         console.log('Error deleting tuple: ' + result['error']);
  //       } else {
  //         // var tupleName = "tuple"+index;
  //         // var delElem = document.getElementById(tupleName);
  //         // delElem.remove();
  //         $('#' + id).remove();
  //       }
  //     }
  //   });
  // } else {
  //   document.getElementById("id").remove();
  //   addTuples(ingredients, 1);
  // }
}

function selectTuple(tuples) {
  tuples = JSON.parse(tuples);
  for (i = 0; i < tuples.length; i++) {
    var id = tuples[i].ingredientID;
    $("#ingredient" + (i + 1)).val(id).attr("selected", "true");
    let name = $("#ingredient" + (i + 1) + " option:selected").text()
    $("#ingredient" + (i + 1)).attr('data-ingredientname', name);
  }
}

//'top','center
function displayFileAlert() {
  var alertMessage = $("#alertData").data('alert');
  if (alertMessage != null) {
    displayNotification('top', 'center', alertMessage);
  }

}

function displayNotification(from, align, alertMessage) {
  $.notify({
    icon: "notifications",
    message: alertMessage

  }, {
    type: "success",
    timer: 4000,
    placement: {
      from: from,
      align: align
    }
  });
}
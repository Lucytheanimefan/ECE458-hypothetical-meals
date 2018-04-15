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
  //console.log(tr);
  for (i = 0; i < tr.length; i++) {
    let trElement = tr[i].getElementsByTagName("td");
    td0 = trElement[0];
    td1 = trElement[1];
    td2 = trElement[2];
    td3 = trElement[3];
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

function filterOrderTable(type) {
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
    if (td0 || td1 || td2 || td3) {
      if (tdContainsFilteredText(td0, filter) || tdContainsFilteredText(td1, filter) ||
        tdContainsFilteredText(td2, filter) || tdContainsFilteredText(td3, filter) ||
      trOrderContainsFilteredText(tr[i]['id'],filter)) {
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

function trOrderContainsFilteredText(tr, filter){
  let obj = JSON.parse(tr);
  let products = obj['products'];
  console.log(products);
  for(var i = 0; i < products.length; i++){
    let ing = products[i]['ingID']['name'];
    let vend = products[i]['vendID']['name'];
    console.log(ing);
    console.log(vend);
    if(ing.indexOf(filter)>=0){
      return true;
    }
    if(vend.indexOf(filter)>=0){
      return true;
    }
  }
  return false;
}

function getUserRole(callback) {
  $.ajax({
    type: 'GET',
    url: '/users/role',
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    success: function(response) {
      console.log('GetUserrole return success')
      //console.log(response);
      callback(response['role']);
    }
  });
}

function getUsername(callback) {
  console.log('Get username:')
  $.ajax({
    type: 'GET',
    url: '/users/username',
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    success: function(response) {
      console.log(response);
      callback(response['username']);
    }
  });
}

function checkIsAdmin(callback) {
  console.log('checkisadmin');
  getUserRole(function(role) {
    //console.log(role);
    callback(role == "admin");
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
      console.log('Load sidebar!')
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

  // Username
  getUsername(function(username) {
    console.log("Got username");
    //console.log(username);
    $('#username').text(username);
  })
}

function loadContent(my_role) {
  if (my_role === 'admin') {
    console.log('Show everything');
    $('.manager').removeClass('hide');
    $('.adminOnly').removeClass('hide');
    $('.admin').removeClass('hide');
  } else if (my_role === 'manager') {
    $('.manager').removeClass('hide');
  }
}

// function loadAdminContent() {
//   checkIsAdmin(function(isAdmin) {
//     if (!isAdmin) return;
//     $('.manager').removeClass('hide');
//     // Is admin
//     $('.adminOnly').removeClass('hide');
//   });
// }

function loadSideBar() {
  //checkIsAdmin(function(isAdmin){
  getUserRole(function(role) {

    $('.meal-category').each(function() {
      // Users
      var tmp = $(this).find('a')[0];
      var category = $($(tmp).find('p')[0]).text();
      if (role == "it_person") {
        if (category == 'Backups' || category == 'Home' || category == 'Profile') {
          $(this).removeClass('hide');
        }
      } else if (role == "admin" || role == 'manager') {
        //console.log('loadAdminOnlySideBar');
        if (category !== 'Backups') {
          $(this).removeClass('hide');
        }
      } else {
        // Users
        if (category !== 'Users' && category !== "Uploads" && category !== "Backups") {
          $(this).removeClass('hide');
        }
      }
    });

  })
}

function doBackup(backupFile, callback = null) {
  console.log('Do backup called!');
  $.ajax({
    type: 'GET',
    url: '/backups/file/' + backupFile,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    success: function(response) {
      console.log(response);
      callback(response);
    }
  });
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
  var next;
  $("#btn1").click(function(e) {
    e.preventDefault();
    next = Number(document.getElementById('index').dataset.start);
    var addTo = "#tuple" + next;
    next = next + 1;

    console.log(next);
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
    //console.log($("#ingredientSelect" + next).val());
    newHTML += '<button class="btn btn-round btn-just-icon remove" type="button" value="remove" onclick=deleteTuple(' + next + ') style="background-color:red;"><i class="material-icons">delete</i></button></div>';
    newHTML += '</div>'
    var newInput = $(newHTML);
    $(addTo).after(newInput);
    $("#tuple" + next).attr('data-source', $(addTo).attr('data-source'));

    //var start = document.getElementById('index').dataset.start;
    next = next - 1;
    document.getElementById('index').dataset.start = Number(next) + 1;
  });
}

function createTuples(ingredients, start) {
  var next;
  $("#btn1").click(function(e) {
    e.preventDefault();
    next = Number(document.getElementById('index2').dataset.start);
    var addTo = "#tuple" + next;
    next = next + 1;

    console.log(next);
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
    //console.log($("#ingredientSelect" + next).val());
    newHTML += '<button class="btn btn-round btn-just-icon remove" type="button" value="remove" onclick=deleteTuple2(' + next + ') style="background-color:red;"><i class="material-icons">delete</i></button></div>';
    newHTML += '</div>'
    var newInput = $(newHTML);
    $(addTo).after(newInput);
    $("#tuple" + next).attr('data-source', $(addTo).attr('data-source'));

    //var start = document.getElementById('index').dataset.start;
    next = next - 1;
    document.getElementById('index2').dataset.start = Number(next) + 1;
  });
}

function createLotTuples(ingredients, start) {
  var next;
  $("#newlot").click(function(e) {
    e.preventDefault();
    next = Number(document.getElementById('index2').dataset.start);
    var addTo = "#tuple" + next;
    next = next + 1;

    var newHTML = '<div id="tuple' + next + '" class="row">';
    newHTML += '<div class="col-md-2"><div class="form-group"></div><label class="control-label">Lot Number</label>';
    newHTML += '<input class="form-control" id="lotnumber' + next + '" type="text" name="lotnumber' + next + '"/></div>';
    newHTML += '<div class="row" id="ing' + next + "_" + 1 + '" class="row">';
    newHTML += '<div class="col-md-3"><div class="form-group"></div><label class="control-label">Ingredient</label>';
    newHTML += '<select class="form-control" id="ingredient' + next + "_" + 1 + '" name="ingredient' + next + "_" + 1 + '"><option disabled="" selected="" value="">Select from Order</option>';
    var i;
    console.log("ing bois");
    console.log(ingredients);
    for (i = 0; i < ingredients.length; i++) {
      var ing = ingredients[i];
      newHTML += '<option value=' + ing.ingID + '@' + ing.vendID +  '@' + ing.ingSize + '@' + ing.orderNumber + '@' + ing.unitCost + '>' + ing.ingredient + ' from ' + ing.vendor[0].name + '</option>';
    }
    newHTML += '</select></div>';

    //newHTML += '<div class="removeBtn" id="dataBtn">';
    //console.log($("#ingredientSelect" + next).val());
    newHTML += '<div class="col-md-1"><div class="form-group"></div><label class="control-label">Quantity</label>';
    newHTML += '<input class="form-control" id="quantity' + next + "_" + 1 + '" type="number" name="quantity' + next + "_" + 1 + '" min="0" step="0.01"/></div>';
    newHTML += '<div class="col-md-1"><p><br/><br/></p>';
    newHTML += '</div>';
    //newHTML += '<div class="removeBtn" id="dataBtn">';
    //console.log($("#ingredientSelect" + next).val());

    newHTML += '<div class="col-md-1"><p><br/><br/><br/><br/></p>';
    newHTML += '<button class="btn btn-round btn-just-icon add" type="button" value="remove" onclick=addPackage(' + next + ')><i class="material-icons">add</i></button></div>';

    newHTML += '<div class="col-md-1"><p><br/><br/></p>';
    newHTML += '<button class="btn btn-primary remove" type="button" value="remove" onclick=deleteTuple2(' + next + ') style="padding:10px; background-color:red;">Delete Lot</button></div>';


    //newHTML += '<div class="removeBtn" id="dataBtn">';
    newHTML += '<div id="start' + next + '" data-start=1></div>';
    newHTML += '</div></div>';
    //newHTML += '<div class="removeBtn" id="dataBtn">';
    //console.log($("#ingredientSelect" + next).val());
    var newInput = $(newHTML);
    $(addTo).after(newInput);
    $("#tuple" + next).attr('data-source', $(addTo).attr('data-source'));

    //var start = document.getElementById('index').dataset.start;
    next = next - 1;
    document.getElementById('index2').dataset.start = Number(next) + 1;
  });
}

function deleteTuple(index) {
  if ($('#tuple' + index).hasClass('preexists') && index > 1) {
    console.log("Delete tuple from db");
    // Delete the thing from the db
    //var name = $("#ingredient" + index).data("ingredientname");
    var name = document.getElementById('data').dataset.formula;
    var ingredientID = $("#ingredient" + index).val();

    if (name != null && ingredientID != null) {
      var tupleData = { "name": name, "id": ingredientID }
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
            //$('#' + id).remove();
          }

        }
      });
    }

    $('#tuple' + index).remove();
    var start = document.getElementById('index').dataset.start;
    if (start == index) {
      document.getElementById('index').dataset.start = Number(start) - 1;
    }
  }

}

function showIngredientInfo() {
  var select = jQuery('#type-selector');
  select.change(function() {
    if ($(this).val() == 'intermediate') {
      $('#ingredient-info').show();
      $('.ing-attr').prop('required', true);
    } else {
      $('#ingredient-info').hide();
      $('.ing-attr').removeAttr('required');
    }
  });
}

function deleteTuple2(index) {
  if ($('#tuple' + index).hasClass('preexists') && index > 1) {
    var name = document.getElementById('data2').dataset.formula;
    var ingredientID = $("#ingredient" + index).val();

    if (name != null && ingredientID != null) {
      var tupleData = { "name": name, "id": ingredientID }
      $.ajax({
        type: 'POST',
        url: '/formulas/' + name + '/delete_tuple',
        data: JSON.stringify(tupleData),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: function(result) {
          if (!result['success']) {
            console.log('Error deleting tuple: ' + result['error']);
          }
        }
      });
    }
    $('#tuple' + index).remove();
    var start = document.getElementById('index2').dataset.start;
    if (start == index) {
      document.getElementById('index2').dataset.start = Number(start) - 1;
    }
  }
}

function deletePackage(next, index) {
  if (next > 1) {
    $('#ing' + index + "_" + next).remove();
    var start = document.getElementById('start' + index).dataset.start;
    if (start == next) {
      document.getElementById('start' + index).dataset.start = Number(start) - 1;
    }
  }
}


function addPackage(index) {
  var next = Number(document.getElementById('start' + index).dataset.start);
  console.log(next);
  var addTo = "#ing" + index + "_" + next;
  next = next + 1;

  var newHTML = '<div class = row id="ing' + index + "_" + next + '" class="row">';
  newHTML += '<div class="col-md-2"><p><br/><br/><br/><br/></p>';
  newHTML += '</div>';
  newHTML += '<div class="col-md-3"><div class="form-group"></div><label class="control-label">Ingredient</label>';
  newHTML += '<select class="form-control" id="ingredient' + index + "_" + next + '" name="ingredient' + index + "_" + next + '"><option disabled="" selected="" value="">Select from Order</option>';
  var i;
  for (i = 0; i < ingredients.length; i++) {
    console.log(ingredients);
    var ing = ingredients[i];
    //newHTML += '<option value=' + ing.ingId + '@' + ing.vendId + '@' + ing.ingSize + '>' + ing.ingredient + '</option>';
    newHTML += '<option value=' + ing.ingID + '@' + ing.vendID +  '@' + ing.ingSize + '@' + ing.orderNumber + '@' + ing.unitCost + '>' + ing.ingredient + ' from ' + ing.vendor[0].name + '</option>';
  }
  newHTML += '</select></div>';

  //newHTML += '<div class="removeBtn" id="dataBtn">';
  //console.log($("#ingredientSelect" + next).val());
  newHTML += '<div class="col-md-1"><div class="form-group"></div><label class="control-label">Quantity</label>';
  newHTML += '<input class="form-control" id="quantity' + index + "_" + next + '" type="number" name="quantity' + index + "_" + next + '" min="0" step="0.01"/></div>';
  newHTML += '<div class="col-md-1"><p><br/><br/><br/><br/></p>';
  newHTML += '<button class="btn btn-round btn-just-icon remove" type="button" value="remove" onclick=deletePackage(' + next + "," + index + ') style="background-color:red;"><i class="material-icons">delete</i></button></div>';
  newHTML += '</div></div>';

  next = next - 1;
  var newInput = $(newHTML);
  $(addTo).after(newInput);
  console.log(next);
  $("#ing" + next).attr('data-source', $(addTo).attr('data-source'));

  //var start = document.getElementById('index').dataset.start;
  document.getElementById('start' + index).dataset.start = Number(next) + 1;
}


function selectTuple(tuples) {
  for (i = 0; i < tuples.length; i++) {
    var id = tuples[i].ingredientID;
    $("#ingredient" + (i + 1)).val(id).attr("selected", "true");
    let name = $("#ingredient" + (i + 1) + " option:selected").text()
    $("#ingredient" + (i + 1)).attr('data-ingredientname', name);
  }
}

function selectVendor(orders) {
  for (o = 0; o < orders.length; o++) {
    var order = orders[o];
    var vendors = order.vendors;
    for (v = 0; v < vendors.length; v++) {
      var id = vendors[v].id;
      if (id.toString() === order.vendor.toString()) {
        var name = vendors[v].name;
        var ingName = (order.ingredient).split(' ').join('');
        $("#" + ingName).val(name).attr("selected", "true");
        name = $("#" + ingName + " option:selected").text()
        $("#" + ingName).attr('data-ingredientname', name);
        break;
      }
    }
  }
}

// Formula
function getFormulaForID(id, callback) {
  $.ajax({
    type: 'GET',
    url: '/formulas/id/' + id,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    success: function(response) {
      //console.log(response);
      callback(response);
    }
  });
}

// Production Line



function updateLineFormulaNames() {
  $('.lineFormula').each(function() {
    var element = $(this);
    let formulaId = element.data("id");
    console.log(formulaId);
    getFormulaForID(formulaId, function(json) {
      element.text(json["name"]);
      var href = $(this).attr('href');
      if (typeof href !== typeof undefined && href !== false) {
        element.attr('href', '/formulas/' + json["name"]);
      }
    })
  })
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

function makeProductionEfficiencyGraph(ivElement, data) {
  var chart = c3.generate({
    bindto: divElement,
    data: {
      columns: data,
      type: 'line',
      groups: [group]
    },
    axis: {
      x: {
        type: 'category',
        categories: xcategories
      },
      y: {
        label: {
          text: "Number of respondents who said they plan to vote for a candidate",
          position: 'outer-middle'
        }
      }
    },
    tooltip: {
      format: {
        name: function(name, ratio, id, index) {
          return name;
        },
        value: function(value, ratio,
          id, index) {
          //console.log(value + "," + ratio + "," + id + "," + index);
          if (!isMain) { //not main
            //console.log(value+"/"+totals[index]);
            return ((value / totals[index] * 100).toFixed(2).toString() + "%");
          } else {
            return value;
          }
        }
      }
    },
    bar: {
      width: {
        ratio: 0.5 // this makes bar width 50% of length between ticks
      }
    }
  });
}

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

dropDownInteractivity();


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

function loadAdminOnlyContent() {
  checkIsAdmin(function(isAdmin) {
    if (!isAdmin) return;

    // Is admin
    $('.adminOnly').removeClass('hide');

  });
}

function loadAdminOnlySideBar() {
  console.log('loadAdminOnlySideBar');
  checkIsAdmin(function(isAdmin) {
    if (!isAdmin) return;

    // Is admin
    $('.meal-category').each(function() {
      if (isAdmin) {
        $(this).removeClass('hide');
      } else {
        let tmp = $(this).find('a')[0];
        let category = $($(tmp).find('p')[0]).text();
        if (category !== 'Vendors') {
          $(this).removeClass('hide');
        }
      }
    });

  })
}
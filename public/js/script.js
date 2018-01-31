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

function loadAdminOnlyContent(){
	checkIsAdmin(function(isAdmin){
		if (!isAdmin) return;

		// Is admin
		$('.adminOnly').removeClass('hide');

	})
}
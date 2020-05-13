validate_form = function() 
{
	document.getElementById("nickname_error").style.display = "none";
	document.getElementById("email_error").style.display = "none";
	document.getElementById("password_error").style.display = "none";
	const email_regex = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;
	var nickname = document.forms["register_form"]["nickname"].value;
	var email = document.forms["register_form"]["email"].value;
	var password = document.forms["register_form"]["password"].value;
	if(nickname==""){
		document.getElementById("nickname_error").style.display = "block";
		return false;
	}
	if(!email_regex.test(email)){
		document.getElementById("email_error").style.display = "block";
		return false;
	}
	db.query(`SELECT * FROM user_data WHERE email = ?`, [email], function (error, result, fields) {
	    if (error) {
	    	throw error;
	    }
	    console.log("check complete");
	    if(result != null){
	    	return false;
	    }
	});
	if(password==""){
		document.getElementById("password_error").style.display = "block";
		return false;
	}
	return true;
}

module.exports = {validate_form};
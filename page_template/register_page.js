module.exports = function(navbar) {
	return `
<!DOCTYPE html>
<html>
<head>
	<title>test_site</title>
	<script>
		function validate_form() 
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
			if(password==""){
				document.getElementById("password_error").style.display = "block";
				return false;
			}
			return true;
		}
	</script>
</head>
<body>
	${navbar}
	<form name="register_form" onsubmit="return validate_form()" action="/register" method="post">
		<input type="text" name="nickname" placeholder="닉네임">
		<div id="nickname_error" style="display: none">닉네임을 입력해주세요.</div>
		<input type="text" name="email" placeholder="이메일">
		<div id="email_error" style="display: none">이메일을 입력해주세요.</div>
		<input type="password" name="password" placeholder="비밀번호">
		<div id="password_error" style="display: none">비밀번호를 입력해주세요.</div>
		<input type="submit" name="submit" value="회원가입">		
	</form>
</body>
</html>`
}
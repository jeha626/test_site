module.exports = function(navbar) {
	return `
<!DOCTYPE html>
<html>
<head>
	<title>test_site</title>
</head>
<body>
	${navbar}
	<form action="/login" method="post">
		<input type="text" name="email" placeholder="이메일">
		<input type="password" name="password" placeholder="비밀번호">
		<input type="submit" name="submit" value="로그인">		
	</form>
	<input type="button" name="register" onclick="location.href='/register'" value="회원가입">
</body>
</html>`
}
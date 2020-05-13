module.exports = function(navbar) {
	return `
<!DOCTYPE html>
<html>
<head>
	<title>test_site</title>
</head>
<body>
	${navbar}
	<form action="/create" method="post">
		<input type="text" name="title" placeholder="text">
		<input type="text" name="answer1" placeholder="answer1">
		<input type="text" name="answer2" placeholder="answer2">
		<input type="text" name="info" placeholder="info">
		<input type="checkbox" name="comment" value=1 checked="">
		<input type="submit" name="submit" value="완료">		
	</form>
</body>
</html>`
}
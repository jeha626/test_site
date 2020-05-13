module.exports = function(navbar, title, answer1, answer2, info) {
	return `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<link rel="stylesheet" type="text/css" href="styles.css">
		<link href="https://fonts.googleapis.com/css2?family=Do+Hyeon&display=swap" rel="stylesheet">
		<title>test_site</title>
	</head>
	<body>
		<div class="grid">
			${navbar}
			<div class="content">
				<div class="title">
					${title}
				</div>
				<div class="answer">
					<input type="button" value="${answer1}" class="answer1">
					<input type="button" value="${answer2}" class="answer2">
				</div>
				<div class="banner">
					<input type="button" value="<" class="previousButton">
					<input type="button" value=">" class="nextButton">
				</div>
				<div class="info">
					${info}
				</div>
			</div>
			<div class="comment">
				
			</div>
		</div>
	</body>
</html>`
}
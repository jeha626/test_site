const mysql = require('mysql');
const qs = require('querystring');
const express = require('express');
const app = module.exports = express();
const crypto = require('crypto');
const session = require('express-session');
const ejs = require('ejs');
const fs = require('fs');
const jsdom = require('jsdom');
const {
    JSDOM
} = jsdom;
const MySQLStore = require('express-mysql-session')(session);

////////////////////////////////////////////////////////////////////////////

app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'pw123',
    database: 'question_data'
});

var options = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'pw123',
    database: 'question_data'
};

var sessionStore = new MySQLStore(options);

db.connect();

app.use(session({
    key: 'session_cookie_name',
    secret: 'asdf3234sdf@#%^@sdfa234ws3s3',
    store: sessionStore,
    resave: false,
    saveUninitialized: false
}));

function nav_login_logout(request, response){
    if (request.session.is_logined) {
        return `
                <li class="nav-item">
                    <a class="nav-link" href="/membership" id="membership" style="display: block">회원정보</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/register" id="register" style="display: none">회원가입</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/login" id="login" style="display: none">로그인</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/logout" id="logout" style="display: block">로그아웃</a>
                </li>`;
    } else {
        return `
                <li class="nav-item">
                    <a class="nav-link" href="/membership" id="membership" style="display: none">회원정보</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/register" id="register" style="display: block">회원가입</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/login" id="login" style="display: block">로그인</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/logout" id="logout" style="display: none">로그아웃</a>
                </li>`;
    }
}
////////////////////////////////////////////////////////////////////////////
app.get('/', function(request, response) {
    db.query(`SELECT COUNT(*) AS c FROM question`, function(error, result){
        if(error){
            throw error;
        }
        var rand_num = Math.floor(Math.random()*result[0].c+1);
        response.redirect(`/${rand_num}`);
    });
});

app.get('/create', function(request, response) {
    if (!request.session.is_logined) {
        response.redirect('/login');
        return false;
    }
    response.render('create_page', {login_logout: nav_login_logout(request,response)});
});

app.get('/login', function(request, response) {
    response.render('login_page', {login_logout: nav_login_logout(request,response)});
});

app.get('/logout', function(request, response) {
    if (!request.session.is_logined) {
        response.redirect('/login');
        return false;
    }
    request.session.destroy(function(error) {
        response.redirect('/');
    });
})

app.get('/register', function(request, response) {
    response.render('register_page', {login_logout: nav_login_logout(request,response)});
});

app.get('/membership', function(request, response) {
    if (!request.session.is_logined) {
        response.redirect('/login');
        return false;
    }
    response.render('membership', {login_logout: nav_login_logout(request,response)});
});

app.get('/:pageId', function(request, response) {
    var p_id = parseInt(request.params.pageId);
    if (isNaN(p_id)) {
        
        return false;
    }
    db.query(`SELECT * FROM question AS q JOIN user_data AS u ON user_id = u.id WHERE q.id = ?`, [p_id], function(error, result1, fields) {
        if (error) {
            throw error;
        }
        if(result1[0] == undefined) {
            response.redirect('/');
            return false;
        }
        else {
            if(request.session.is_logined){
                db.query(`SELECT * FROM vote_data WHERE question_id=? AND user_id=?`, [p_id, request.session.user_id], function(error, result){
                    if(result[0] != undefined){
                        request.session[p_id] = result[0].agree;
                    } else {
                        request.session[p_id] = -1;
                    }
                });
                db.query(`SELECT COUNT(*) AS c FROM bookmark WHERE question_id=? AND user_id=?`, [p_id, request.session.user_id], function(error, result){
                    if(result[0].c != 0){
                        request.session['bookmark'+p_id] = 1;
                    } else {
                        request.session['bookmark'+p_id] = 0;
                    }
                });
            }
            db.query(`SELECT c.id, c.question_id, c.parent_id, c.user_id, c.body, c.create_time, u.nickname, c.like, v.agree, l.comment_id FROM comment AS c JOIN user_data AS u ON c.user_id = u.id JOIN vote_data AS v ON v.user_id = u.id LEFT JOIN like_data AS l ON l.comment_id = c.id AND l.user_id = ? WHERE v.question_id = ? AND c.question_id = ?`, [request.session.user_id, p_id, p_id], function(error, result2, fields) {
            if (error) {
                throw error;
            }
            console.log(result2);
            var now = new Date();
            var comment_data = [];
            for (var i = 0; i < result2.length; i++) {
                comment_data.push(result2[i]);
            }
            var comment_parent = [];
            var comment_child = [];
            for (var i = 0; i < comment_data.length; i++) {
                if (comment_data[i].parent_id == 0) {
                    comment_parent.push(comment_data[i]);
                } else {
                    comment_child.push(comment_data[i]);
                }
            }
            var comment = {};
            var comment_reply = {};
            now = now.getTime();
            for (var i = 0; i < comment_parent.length; i++) {
                var is_liked;
                var comment_id = comment_parent[i].id;
                if(comment_parent[i].comment_id == null) {
                    is_liked = `<svg class="bi bi-heart like_button" data-comment_id = "${comment_id}" style="cursor:pointer" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M8 2.748l-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 01.176-.17C12.72-3.042 23.333 4.867 8 15z" clip-rule="evenodd"/>
                        </svg>`;
                } else {
                    is_liked =`<svg class="bi bi-heart-fill like_button" data-comment_id = "${comment_id}" style="cursor:pointer" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z" clip-rule="evenodd"/>
                        </svg>`;
                }
                var user_id = comment_parent[i].user_id;
                var comment_delete;
                if(user_id == request.session.user_id){
                    comment_delete = `
                    <svg class="bi bi-x-square comment_delete" data-comment_id="${comment_id}" style="cursor:pointer" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V2a2 2 0 00-2-2H2z" clip-rule="evenodd"/>
                        <path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 010 .708l-7 7a.5.5 0 01-.708-.708l7-7a.5.5 0 01.708 0z" clip-rule="evenodd"/>
                        <path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 000 .708l7 7a.5.5 0 00.708-.708l-7-7a.5.5 0 00-.708 0z" clip-rule="evenodd"/>
                    </svg>
                    `;
                }
                var agree = comment_parent[i].agree;
                var parent_id = comment_parent[i].parent_id;
                var like = comment_parent[i].like;
                var create_time = comment_parent[i].create_time.getTime();
                var time_gap = Math.floor((now - create_time) / (1000 * 60 * 60));
                var time_unit = "시간";
                if (time_gap > 365 * 24) {
                    time_gap = Math.floor(time_gap / (365 * 24));
                    time_unit = "년";
                } else if (time_gap > 30 * 24) {
                    time_gap = Math.floor(time_gap / (30 * 24));
                    time_unit = "월";
                } else if (time_gap > 24) {
                    time_gap = Math.floor(time_gap / (24));
                    time_unit = "일";
                }
                comment[comment_id] = `
                        <div class="be-comment">
                            <svg class="bi bi-people-circle be-ava-comment" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path class="icon_body${agree}" d="M13.468 12.37C12.758 11.226 11.195 10 8 10s-4.757 1.225-5.468 2.37A6.987 6.987 0 008 15a6.987 6.987 0 005.468-2.63z"/>
                                <path class="icon_body${agree}" fill-rule="evenodd" d="M8 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                                <path fill-rule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM0 8a8 8 0 1116 0A8 8 0 010 8z" clip-rule="evenodd"/>
                            </svg>
                            <div class="be-comment-content">
                                <span class="d-flex be-comment-name">
                                    <strong class="flex-grow-1">${comment_parent[i].nickname}</strong>
                                    ${comment_delete}
                                </span>
                                <p class="be-comment-text">
                                    ${comment_parent[i].body}
                                </p>
                            </div>
                            <div class="sub" id="sub${comment_id}">
                                <strong>${time_gap}${time_unit}</strong>
                                ${is_liked}
                                <strong class="like_count">${like}</strong>
                                <strong class="no-drag" style="cursor:pointer" data-toggle="collapse" data-target="#child${comment_id}" aria-expanded="false" aria-controls="child${comment_id}" class="">답글 달기</strong>
                                <strong class="comment_door no-drag" style="cursor:pointer" data-toggle="collapse" data-target="#comment_child${comment_id}" aria-expanded="false" aria-controls="comment_child${comment_id}">접기</strong>
                            </div>
                        </div>`;
                for (var j = 0; j < comment_child.length; j++) {
                    if (comment_child[j].parent_id == comment_id) {
                        var comment_child_id = comment_child[j].id;
                        var is_liked;
                        if(comment_child[j].comment_id == null) {
                            is_liked = `<svg class="bi bi-heart like_button" data-comment_id = "${comment_child_id}" style="cursor:pointer" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" d="M8 2.748l-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 01.176-.17C12.72-3.042 23.333 4.867 8 15z" clip-rule="evenodd"/>
                                </svg>`;
                        } else {
                            is_liked =`<svg class="bi bi-heart-fill like_button" data-comment_id = "${comment_child_id}" style="cursor:pointer" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z" clip-rule="evenodd"/>
                                </svg>`;
                        }
                        var comment_delete;
                        if(user_id == request.session.user_id){
                            comment_delete = `
                            <svg class="bi bi-x-square comment_delete" data-comment_id="${comment_child_id}" style="cursor:pointer" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V2a2 2 0 00-2-2H2z" clip-rule="evenodd"/>
                                <path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 010 .708l-7 7a.5.5 0 01-.708-.708l7-7a.5.5 0 01.708 0z" clip-rule="evenodd"/>
                                <path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 000 .708l7 7a.5.5 0 00.708-.708l-7-7a.5.5 0 00-.708 0z" clip-rule="evenodd"/>
                            </svg>
                            `;
                        }
                        var child_agree = comment_child[j].agree;
                        var comment_child_nickname = comment_child[j].nickname;
                        var comment_child_body = comment_child[j].body;
                        var child_like = comment_child[j].like;
                        var child_create_time = comment_child[j].create_time.getTime();
                        var child_time_gap = Math.floor((now - child_create_time) / (1000 * 60 * 60));
                        var child_time_unit = "시간";
                        if (child_time_gap > 365 * 24) {
                            child_time_gap = Math.floor(child_time_gap / (365 * 24));
                            child_time_unit = "년";
                        } else if (child_time_gap > 30 * 24) {
                            child_time_gap = Math.floor(child_time_gap / (30 * 24));
                            child_time_unit = "월";
                        } else if (child_time_gap > 24) {
                            child_time_gap = Math.floor(child_time_gap / (24));
                            child_time_unit = "일";
                        }
                        comment[comment_id] += `<div class="collapse show comment-child" id="comment_child${comment_id}">
                        <svg class="bi bi-people-circle be-ava-comment" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path class="icon_body${child_agree}" d="M13.468 12.37C12.758 11.226 11.195 10 8 10s-4.757 1.225-5.468 2.37A6.987 6.987 0 008 15a6.987 6.987 0 005.468-2.63z"/>
                            <path class="icon_body${child_agree}" fill-rule="evenodd" d="M8 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                            <path fill-rule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM0 8a8 8 0 1116 0A8 8 0 010 8z" clip-rule="evenodd"/>
                        </svg>
                        <div class="be-comment-content">
                               <span class="d-flex be-comment-name">
                                   <strong class="flex-grow-1">${comment_child_nickname}</strong>
                                   ${comment_delete}
                               </span>
                            <p class="be-comment-text">
                                ${comment_child_body}
                            </p>
                        </div>
                        <div class="sub" id="sub${comment_child_id}">
                            <strong>${child_time_gap}${child_time_unit}</strong>
                            ${is_liked}
                            <strong class="like_count">${child_like}</strong>
                        </div>
                        </div>`
                    }
                }
                comment[comment_id] += `
                                        <div class="collapse comment-child" id="child${comment_id}">
                                    <form id="comment_form" action="" method="post">
            <svg class="bi bi-people-circle be-ava-comment" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path class="icon_body${request.session[p_id]}" d="M13.468 12.37C12.758 11.226 11.195 10 8 10s-4.757 1.225-5.468 2.37A6.987 6.987 0 008 15a6.987 6.987 0 005.468-2.63z"/>
                <path class="icon_body${request.session[p_id]}" fill-rule="evenodd" d="M8 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                <path fill-rule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM0 8a8 8 0 1116 0A8 8 0 010 8z" clip-rule="evenodd"/>
            </svg>
            <textarea name="comment_body" class="comment_body form-control" id="comment_body" placeholder="댓글을 입력해주세요."></textarea>
            <div class="text-right">
                <input type="button" name="submit" class="btn btn-dark comment_button" value="등록">
            </div>
            <input type="text" name="parent_id" value="${comment_id}" style="display: none">
                            </form>
                        </div>`;
            }
            var a1 = Number(result1[0].agree);
            var a2 = Number(result1[0].disagree);
            var v1 = (a1/(a1+a2)*100).toFixed(0);
            var v2 = (a2/(a1+a2)*100).toFixed(0);
            db.query(`SELECT * FROM question WHERE id=? AND user_id=?`, [p_id, request.session.user_id], function(error4, result4){
                if(error4){
                    throw error4;
                }
                var question_delete;
                if (result4[0] != undefined) {
                    question_delete = `
                    <svg type="button" id="question_delete" class="bi bi-trash" data-question_id= "${p_id}" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clip-rule="evenodd"/>
                    </svg>`
                }
                response.render('balance_page', {
                    title: result1[0].title,
                    answer1: result1[0].answer1,
                    answer2: result1[0].answer2,
                    answer1_info: result1[0].answer1_info,
                    answer2_info: result1[0].answer2_info,
                    answer1_vote: v1,
                    answer2_vote: v2,
                    answer1_count: result1[0].agree,
                    answer2_count: result1[0].disagree,
                    vote_session: request.session[p_id],
                    creator: result1[0].nickname,
                    nickname: request.session.nickname,
                    login_logout: nav_login_logout(request,response),
                    comment: comment,
                    question_delete: question_delete,
                    bookmark_session: request.session['bookmark'+p_id]
                });
            });
        });
        }
    });
});

////////////////////////////////////////////////////////////////////////////

app.post('/create', function(request, response) {
    if(request.session.is_logined){
        var post = request.body;
        console.log(post);
        var title = post.title;
        var answer1 = post.answer1;
        var answer2 = post.answer2;
        var answer1_info = post.answer1_info;
        var answer2_info = post.answer2_info;
        db.query(`INSERT INTO question (title, answer1, answer2, answer1_info, answer2_info, user_id) VALUES(?, ?, ?, ?, ?, ?)`,
            [title, answer1, answer2, answer1_info, answer2_info, request.session.user_id],
            function(error, result) {
                if (error) {
                    throw error;
                }
            });
        response.redirect(`/1`);
    } else {
        response.redirect(`/login`);
    }
});

app.post('/login', function(request, response) {
    var post = request.body;
    var email = post.email;
    db.query(`SELECT salt FROM user_data WHERE email = ?`, [email], function(error, result1, fields) {
        if (result1[0] == undefined) {
            console.log("lf");
            response.send({
                result: 'login_fail'
            });
            return false;
        } else {
            var salt = result1[0].salt;
            crypto.randomBytes(64, function(error, buf) {
                crypto.pbkdf2(post.password, salt, 15243, 64, 'sha512', function(error, key) {
                    db.query(`SELECT * FROM user_data WHERE email = ? and password = ?`, [email, key.toString('base64')], function(error, result2, fields) {
                        if (error) {
                            throw error;
                        }
                        if (result2[0] !== undefined) {
                            request.session.nickname = result2[0].nickname;
                            request.session.email = result2[0].email;
                            request.session.user_id = result2[0].id;
                            request.session.is_logined = true;
                            request.session.save(function() {
                                console.log("ls");
                                response.send({
                                    result: 'login_success'
                                });
                            });
                        } else {
                            console.log("lf");
                            response.send({
                                result: 'login_fail'
                            });
                        }
                    });
                });
            });
        }
    });
});

app.post('/register', function(request, response1) {
    var post = request.body;
    var email = post.email;
    db.query(`SELECT email FROM user_data WHERE email = ?`, [email], function(error, result, fields) {
        if (error) {
            throw error;
        }
        console.log(result);
        if (result[0] === undefined) {
            crypto.randomBytes(64, function(error, buf) {
                crypto.pbkdf2(post.password, buf.toString('base64'), 15243, 64, 'sha512', function(error, key) {
                    var nickname = post.nickname;
                    var email = post.email;
                    var password = key.toString('base64');
                    var salt = buf.toString('base64');
                    db.query(`INSERT INTO user_data (nickname, email, password, salt) VALUES(?, ?, ?, ?)`,
                        [nickname, email, password, salt],
                        function(error, response2) {
                            if (error) {
                                throw error;
                            }
                            console.log("rs");
                            response1.send({
                                result: 'register_success'
                            });
                        });
                });
            });
        } else {
            console.log("rf");
            response1.send({
                result: 'register_fail'
            });
        }
    });
});

app.post('/like', function(request, response) {
    var post = request.body;
    if (request.session.is_logined) {
        var comment_id = post.comment_id;
        var user_id = request.session.user_id;
        db.query(`SELECT COUNT(*) AS count FROM like_data WHERE comment_id=? AND user_id=?`, [comment_id, user_id], function(error1, result1) {
            if (error1) {
                throw error1;
            }
            if (result1[0].count == 0) {
                db.query(`INSERT INTO like_data (comment_id, user_id) VALUES (?, ?)`, [comment_id, user_id], function(error2, result2) {
                    if (error2) {
                        throw error2;
                    }
                    db.query(`UPDATE comment AS c SET c.like = c.like + 1 WHERE id=?`, [comment_id], function(error, result) {
                        if (error) {
                                throw error;
                        }
                        console.log('lis--insert');
                        response.send({
                            result: 'like_insert',
                            comment_id: `${comment_id}`
                        });
                    });
                });
            } else {
                db.query(`DELETE FROM like_data WHERE comment_id=? AND user_id=?`, [comment_id, user_id], function(error3, result3) {
                    if (error3) {
                        throw error3;
                    }
                    db.query(`UPDATE comment AS c SET c.like = c.like - 1 WHERE id=?`, [comment_id], function(error, result) {
                        if (error) {
                                throw error;
                        }
                        console.log('lis--delete');
                        response.send({
                            result: 'like_delete',
                            comment_id: `${comment_id}`
                        });
                    });
                });
            }
        });
    } else {
        console.log('lif');
        response.send({
            result:'like_fail'
        });
    }
});

app.post('/vote', function(request, response) {
    var post = request.body;
    var question_id = post.question_id;
    var agree = post.agree;
    var user_id = request.session.user_id;
    var vote_num = question_id;
    if(request.session[question_id] == -1 || !request.session[question_id]) {
        request.session[question_id] = agree;
        if (request.session.is_logined) {
            db.query(`SELECT COUNT(*) AS c FROM vote_data WHERE question_id=? AND user_id=?`, [question_id, user_id], function(error, result){
                console.log(result[0].c);
                if(result[0].c == 0){
                    console.log("check0");
                    db.query(`INSERT INTO vote_data (question_id, user_id, agree) VALUES(?, ?, ?)`,
                    [question_id, user_id, agree],
                    function(error, result) {
                        if (error) {
                            throw error;
                        }
                        console.log("check1");
                        if(agree == 0){
                            db.query(`UPDATE question AS q SET q.agree = q.agree + 1 WHERE id=?`, [question_id], function(error, result) {
                                if (error) {
                                        throw error;
                                }
                            });
                            console.log("check2");
                        } else if(agree == 1){
                            db.query(`UPDATE question AS q SET q.disagree = q.disagree + 1 WHERE id=?`, [question_id], function(error, result) {
                                if (error) {
                                        throw error;
                                }
                            });
                            console.log("check3");
                        }
                        db.query(`SELECT agree, disagree FROM question WHERE id=?`, [question_id], function(error, result2){
                            console.log('vs');
                            console.log(result2);
                            response.send({
                                result: 'vote_success',
                                agree: result2[0].agree,
                                disagree: result2[0].disagree
                            });
                        });
                    });
                }
            });
        } else {
            if(agree == 0){
                db.query(`UPDATE question AS q SET q.agree = q.agree + 1 WHERE id=?`, [question_id], function(error, result) {
                    if (error) {
                            throw error;
                    }
                });
            } else if(agree == 1){
                db.query(`UPDATE question AS q SET q.disagree = q.disagree + 1 WHERE id=?`, [question_id], function(error, result) {
                    if (error) {
                            throw error;
                    }
                });
            }
            db.query(`SELECT agree, disagree FROM question WHERE id=?`, [question_id], function(error, result2){
                console.log('vs');
                response.send({
                    result: 'vote_success',
                    agree: result2[0].agree,
                    disagree: result2[0].disagree
                });
            });
        }
    }
});

app.post('/bookmark', function(request, response) {
    var post = request.body;
    if (request.session.is_logined) {
        var question_id = post.question_id;
        var user_id = request.session.user_id;
        db.query(`SELECT COUNT(*) AS c FROM bookmark WHERE question_id=? AND user_id=?`, [question_id, user_id], function(error, result){
            if (result[0].c == 0) {
                db.query(`INSERT INTO bookmark (question_id, user_id) VALUES (?, ?)`, [question_id, user_id], function(error2, result2) {
                    if (error2) {
                        throw error2;
                    }
                    console.log('bs--insert');
                    response.send({
                        result: 'bookmark_insert'
                    });
                });
            } else {
                db.query(`DELETE FROM bookmark WHERE question_id=? AND user_id=?`, [question_id, user_id], function(error3, result3) {
                    if (error3) {
                        throw error3;
                    }
                    console.log('bs--delete');
                    response.send({
                        result: 'bookmark_delete'
                    });
                });
            }
        });
    } else {
        console.log('bf');
        response.send({
            result: "bookmark_fail"
        });
    }
});

app.post('/membership/create', function(request, response) {
    var user_id = request.session.user_id;
    db.query(`SELECT * FROM question WHERE user_id=? ORDER BY id DESC`, [user_id], function(error, result){
        var create_content = [];
        var now = new Date();
        now = now.getTime();
        for(var i=0;i<result.length;i++){
            var create_time = result[i].create_time.getTime();
            var time_gap = Math.floor((now - create_time) / (1000 * 60 * 60));
            var time_unit = "시간";
            if (time_gap > 365 * 24) {
                time_gap = Math.floor(time_gap / (365 * 24));
                time_unit = "년";
            } else if (time_gap > 30 * 24) {
                time_gap = Math.floor(time_gap / (30 * 24));
                time_unit = "월";
            } else if (time_gap > 24) {
                time_gap = Math.floor(time_gap / (24));
                time_unit = "일";
            }
            var id = result[i].id;
            var title = result[i].title;
            var answer1 = result[i].answer1;
            var answer2 = result[i].answer2;
            create_content.push(`
            <a href="/${id}" class="list-group-item list-group-item-action flex-column align-items-start">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${title}</h5>
                    <small>${time_gap}${time_unit}</small>
                </div>
                <p class="mb-1">${answer1} VS ${answer2}</p>
            </a>`
            );
        }
        response.send({
            create_content: create_content
        });
    });
});

app.post('/membership/vote', function(request, response) {
    var user_id = request.session.user_id;
    db.query(`SELECT q.id, q.title, q.answer1, q.answer2, q.create_time FROM question AS q JOIN vote_data AS v ON q.id = v.question_id WHERE v.user_id=? ORDER BY v.id DESC`, [user_id], function(error, result){
        if(error){
            throw error;
        }
        var now = new Date();
        now = now.getTime();
        var create_content = [];
        for(var i=0;i<result.length;i++){
            var create_time = result[i].create_time.getTime();
            var time_gap = Math.floor((now - create_time) / (1000 * 60 * 60));
            var time_unit = "시간";
            if (time_gap > 365 * 24) {
                time_gap = Math.floor(time_gap / (365 * 24));
                time_unit = "년";
            } else if (time_gap > 30 * 24) {
                time_gap = Math.floor(time_gap / (30 * 24));
                time_unit = "월";
            } else if (time_gap > 24) {
                time_gap = Math.floor(time_gap / (24));
                time_unit = "일";
            }
            var id = result[i].id;
            var title = result[i].title;
            var answer1 = result[i].answer1;
            var answer2 = result[i].answer2;
            create_content.push(`
            <a href="/${id}" class="list-group-item list-group-item-action flex-column align-items-start">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${title}</h5>
                    <small>${time_gap}${time_unit}</small>
                </div>
                <p class="mb-1">${answer1} VS ${answer2}</p>
            </a>`
            );
        }
        response.send({
            create_content: create_content
        });
    });
});

app.post('/membership/comment', function(request, response) {
    var user_id = request.session.user_id;
    db.query(`SELECT q.id, q.title, q.answer1, q.answer2, q.create_time, c.body FROM question AS q JOIN comment AS c ON q.id = c.question_id WHERE c.user_id=? ORDER BY c.id DESC`, [user_id], function(error, result){
        if(error){
            throw error;
        }
        var now = new Date();
        now = now.getTime();
        var create_content = [];
        for(var i=0;i<result.length;i++){
            var create_time = result[i].create_time.getTime();
            var time_gap = Math.floor((now - create_time) / (1000 * 60 * 60));
            var time_unit = "시간";
            if (time_gap > 365 * 24) {
                time_gap = Math.floor(time_gap / (365 * 24));
                time_unit = "년";
            } else if (time_gap > 30 * 24) {
                time_gap = Math.floor(time_gap / (30 * 24));
                time_unit = "월";
            } else if (time_gap > 24) {
                time_gap = Math.floor(time_gap / (24));
                time_unit = "일";
            }
            var id = result[i].id;
            var title = result[i].title;
            var c_body =result[i].body;
            create_content.push(`
            <a href="/${id}" class="list-group-item list-group-item-action flex-column align-items-start">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${title}</h5>
                    <small>${time_gap}${time_unit}</small>
                </div>
                <p class="mb-1">${c_body}</p>
            </a>`
            );
        }
        response.send({
            create_content: create_content
        });
    });
});

app.post('/membership/bookmark', function(request, response) {
    var user_id = request.session.user_id;
    db.query(`SELECT q.id, q.title, q.answer1, q.answer2, q.create_time FROM question AS q JOIN bookmark AS b ON q.id = b.question_id WHERE b.user_id=? ORDER BY b.id DESC`, [user_id], function(error, result){
        if(error){
            throw error;
        }
        var now = new Date();
        now = now.getTime();
        var create_content = [];
        for(var i=0;i<result.length;i++){
            var create_time = result[i].create_time.getTime();
            var time_gap = Math.floor((now - create_time) / (1000 * 60 * 60));
            var time_unit = "시간";
            if (time_gap > 365 * 24) {
                time_gap = Math.floor(time_gap / (365 * 24));
                time_unit = "년";
            } else if (time_gap > 30 * 24) {
                time_gap = Math.floor(time_gap / (30 * 24));
                time_unit = "월";
            } else if (time_gap > 24) {
                time_gap = Math.floor(time_gap / (24));
                time_unit = "일";
            }
            var id = result[i].id;
            var title = result[i].title;
            var answer1 = result[i].answer1;
            var answer2 = result[i].answer2;
            create_content.push(`
            <a href="/${id}" class="list-group-item list-group-item-action flex-column align-items-start">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${title}</h5>
                    <small>${time_gap}${time_unit}</small>
                </div>
                <p class="mb-1">${answer1} VS ${answer2}</p>
            </a>`
            );
        }
        response.send({
            create_content: create_content
        });
    });
});

app.post('/question/delete', function(request, response) {
    var post = request.body;
    var p_id = post.question_id;
    if (!request.session.is_logined) {
        response.redirect('/login');
        return false;
    }
    db.query(`DELETE FROM question WHERE id=? AND user_id=?`, [p_id, request.session.user_id], function(error, result){
        if(error){
            throw error;
        }
        console.log('qds');
            response.send({
                result: "question_delete_success"
            });
    });
});

app.post('/comment/delete', function(request, response) {
    var post = request.body;
    var comment_id = post.comment_id;
    if (!request.session.is_logined) {
        response.redirect('/login');
        return false;
    }
    db.query(`DELETE FROM comment WHERE id=? AND user_id=?`, [comment_id, request.session.user_id], function(error, result){
        if(error){
            throw error;
        }
        db.query(`DELETE FROM comment WHERE id=? AND user_id=?`, [comment_id, request.session.user_id], function(error, result){
        if(error){
            throw error;
        }
            console.log('cds');
            response.send({
                result: "comment_delete_success"
            });
        });
    });
});

app.post('/:pageId', function(request, response) {
    var post = request.body;
    if (request.session.is_logined) {
        var comment_body = post.comment_body;
        var user_id = request.session.user_id;
        var parent_id = post.parent_id;
        var p_id = parseInt(request.params.pageId);
        console.log(comment_body);
        console.log(user_id);
        console.log(parent_id);
        console.log(p_id);
        if (isNaN(p_id)) {
            return false;
        }
        console.log(post);
        db.query(`INSERT INTO comment (question_id, user_id, parent_id, body) VALUES(?, ?, ?, ?)`,
            [p_id, user_id, parent_id, comment_body],
            function(error, result) {
                if (error) {
                    throw error;
                }
                console.log('cs');

                response.send({
                    result: "comment_success"
                });
            });
    } else {
        console.log('cf');
        response.send({
            result: "comment_fail"
        });
    }
});
////////////////////////////////////////////////////////////////////////////

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});

//db.end();
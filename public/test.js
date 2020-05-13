reply = function(comment_id, nickname, body, time_gap, time_unit){
	document.getElementById(`child${comment_id}`).append(`<img src="https://bootdey.com/img/Content/avatar/avatar1.png" alt="" class="be-ava-comment">
    <div class="be-comment-content">
           <span class="be-comment-name">
               <strong>${nickname}</strong>
           </span>
        <p class="be-comment-text">
            ${body}
        </p>
    </div>
    <div class="sub">
    	<strong>${time_gap}${time_unit}</strong>
    	<strong style="cursor:pointer">좋아요</strong>
    	<strong style="cursor:pointer" data-toggle="collapse" data-target="#child${comment_id}" aria-expanded="false" aria-controls="child${comment_id}">답글 달기</strong>
    	<div class="collapse" id="child${comment_id}"></div>
    </div>`);
};

module.exports = reply;
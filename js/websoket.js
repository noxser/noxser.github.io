// веб сокет
function wss() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${pictureID}`);
    connection.addEventListener('message', event => {
        // console.log(`пришло сообщение через вэбсокет:\n${event.data}`);
        const wsData = JSON.parse(event.data);
		if (wsData.event === 'pic'){
			if (wsData.pic.mask) {
				canvas.style.background = `url(${wsData.pic.mask})`;
			} else {
				canvas.style.background = ``;
			}
		}

		if (wsData.event === 'comment'){
			insertCommentFromWss(wsData.comment);
		}

		if (wsData.event === 'mask'){
			canvas.style.background = `url(${wsData.url})`;
		}
	});
		connection.addEventListener('error', error => {
			console.log(`Ошибка вэбсокета: ${error.data}`);
		});
}

function insertCommentFromWss(wsComment) {
    const wsCommentEdited = {};
    wsCommentEdited[wsComment.id] = {};
    wsCommentEdited[wsComment.id].left = wsComment.left;
    wsCommentEdited[wsComment.id].message = wsComment.message;
    wsCommentEdited[wsComment.id].timestamp = wsComment.timestamp;
    wsCommentEdited[wsComment.id].top = wsComment.top;
    updateComments(wsCommentEdited);
}
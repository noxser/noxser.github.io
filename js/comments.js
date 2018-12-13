// Создаем новый элемент form для комментариев
function createNewForm() {
    const newForm = document.createElement('form');
    newForm.classList.add('comments__form');
    newForm.innerHTML = `
		<span class="comments__marker"></span><input type="checkbox" class="comments__marker-checkbox">
		<div class="comments__body">
			<div class="comment">
				<div class="loader">
					<span></span>
					<span></span>
					<span></span>
					<span></span>
					<span></span>
				</div>
			</div>
			<textarea class="comments__input" type="text" placeholder="Напишите ответ..."></textarea>
			<input class="comments__close" type="button" value="Закрыть">
			<input class="comments__submit" type="submit" value="Отправить">
		</div>`;
    newForm.style.display = '';
    newForm.style.zIndex = 2;

    newForm.querySelector('.loader').parentElement.style.display = 'none';

    // кнопка "Закрыть"
    newForm.querySelector('.comments__close').addEventListener('click', () => {
        // если есть комментарии (помимо loader), то просто сворачиваем
        if (newForm.querySelectorAll('.comment').length > 1) {
        newForm.querySelector('.comments__marker-checkbox').checked = false;
    } else {
        // если комментариев нет, удалаем форму
        newForm.remove();
    }
});

    // кнопка "Отправить"
    newForm.addEventListener('submit', event => {
        event.preventDefault();
    const message = newForm.querySelector('.comments__input').value;
    const body = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(newForm.dataset.left)}&top=${encodeURIComponent(newForm.dataset.top)}`;
    newForm.querySelector('.loader').parentElement.style.display = '';

    fetch(`https://neto-api.herokuapp.com/pic/${pictureID}/comments`, {
        body: body,
        credentials: 'same-origin',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(res => {
        if (res.status >= 400) throw res.statusText;
    return res;
})
.then(res => res.json())
.then(res => {
        updateComments(res.comments);
    newForm.querySelector('.comments__input').value = '';
})
.catch(err => {
        console.log(err);
    newForm.querySelector('.loader').parentElement.style.display = 'none';
});
});

    return newForm;
}

// отрисовываем комментарии
function updateComments(newComments) {
    if (!newComments) return;
    Object.keys(newComments).forEach(id => {
        // если сообщение с таким id уже есть в showComments (отрисованные комментарии), ничего не делаем
        if (id in showComments) return;
        showComments[id] = newComments[id];
        let needCreateNewForm = true;
        document.querySelectorAll('.comments__form').forEach(form => {
            // если уже существует форма с заданными координатами left и top, добавляем сообщение в эту форму
            if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {
            form.querySelector('.loader').parentElement.style.display = 'none';
            // добавляем в эту форму сообщение
            addComentToForm(newComments[id], form);
            needCreateNewForm = false;
            }
        });
        // если формы с заданными координатами пока нет на холсте,
        // создаем эту форму и добавляем в нее сообщение
        if (needCreateNewForm) {
            const newForm = createNewForm();
            newForm.dataset.left = newComments[id].left;
            newForm.dataset.top = newComments[id].top;
            newForm.style.left = newComments[id].left + 'px';
            newForm.style.top = newComments[id].top + 'px';
            addComentToForm(newComments[id], newForm);
            wrapCanvasComments.appendChild(newForm);
            if (!commentsOnInput.checked) {
                newForm.style.display = 'none';
            }
        }
    });
}

// добавляем новое сообщение в форму, так чтобы все сообщения внутри формы шли по порядку
function addComentToForm(newMsg, form) {
    // преобразуем timestamp в строку
    function getDate(timestamp) {
        const options = {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        };
        const date = new Date(timestamp);
        const dateStr = date.toLocaleString(options);
        return dateStr.slice(0, 6) + dateStr.slice(8, 10) + dateStr.slice(11);
    }

    let timestamp = Number.MAX_VALUE;
    let theNearestLowerDiv = form.querySelector('.loader').parentElement;
    form.querySelectorAll('.user__comment').forEach(msgDiv => {
        const currMsgTimestamp = +msgDiv.dataset.timestamp;
        if (currMsgTimestamp < newMsg.timestamp) return;
        if (currMsgTimestamp < timestamp) {
            timestamp = currMsgTimestamp;
            theNearestLowerDiv = msgDiv;
        }
    });
    const newMsgDiv = document.createElement('div');
    newMsgDiv.classList.add('comment');
    newMsgDiv.classList.add('user__comment');
    newMsgDiv.dataset.timestamp = newMsg.timestamp;
    const pCommentTime = document.createElement('p');
    pCommentTime.classList.add('comment__time');
    pCommentTime.textContent = getDate(newMsg.timestamp);
    newMsgDiv.appendChild(pCommentTime);
    const pCommentMessage = document.createElement('p');
    pCommentMessage.classList.add('comment__message');
    pCommentMessage.textContent = newMsg.message;
    newMsgDiv.appendChild(pCommentMessage);
    form.querySelector('.comments__body').insertBefore(newMsgDiv, theNearestLowerDiv);
}
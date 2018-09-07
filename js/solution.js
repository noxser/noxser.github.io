'use strict'

//основная зона в которой работаем
const wrap = document.querySelector('.wrap');

// текущее изображение
const currentImage = document.querySelector('.current-image');

// элементы перетаскиваемого меню 
const menu = document.querySelector('.menu');
const burger = document.querySelector('.burger');
const comments = document.querySelector('.comments');
const draw = document.querySelector('.draw');
const share = document.querySelector('.share');
const urlForShare = document.querySelector('.menu__url');
const menuModeElements = document.querySelectorAll('.mode');

// предупреждения и ошибки
const imageLoader = document.querySelector('.image-loader');
const errorMessage = document.querySelector('.error__message');
const errorNode = document.querySelector('.error');

// переключатели отображения комментариев
const commentsOnInput = document.querySelector('#comments-on');
const commentsOffInput = document.querySelector('#comments-off');

// передвижение меню
let movedPiece = null;
const minX = 0;
const minY = 0;
let maxX, maxY, shiftY, shiftX;

//холст для рисования
const canvas = document.createElement('canvas');
const wrapCanvasComments = document.createElement('div');

let showComments = {};
let connection; 

//  *** Смотри URL приложения ищем id ***

const url = new URL(`${window.location.href}`);
const picId = url.searchParams.get('id');

// айди картинки
let pictureID;

//  *** Перетаскивание меню  *** 

document.addEventListener('mousedown', moveStart);
document.addEventListener('mousemove', throttle(moveMenu));
document.addEventListener('mouseup', moveEnd);

// активируем перетаскивание при клике на элементе drag
function moveStart(event) {
    if (event.target.classList.contains('drag')) {
        movedPiece = menu;
        const bounds = movedPiece.getBoundingClientRect();
        // вычисляем сдвиг указателя относительно левого верхнего края меню
        shiftX = event.pageX - bounds.left - window.pageXOffset;
        shiftY = event.pageY - bounds.top - window.pageYOffset;
        maxX = minX + wrap.offsetWidth - movedPiece.offsetWidth;
        maxY = minY + wrap.offsetHeight - movedPiece.offsetHeight;
    }
}

// перемещаем меню в соответствии с движением мыши
function moveMenu(event) {
    if (movedPiece) {
        event.preventDefault();
        let x = event.pageX - shiftX;
        let y = event.pageY - shiftY;
        x = Math.min(x, maxX-1); // ломалось меню пришлось уменьшить
        y = Math.min(y, maxY);
        x = Math.max(x, minX);
        y = Math.max(y, minY);
        movedPiece.style.left = `${x}px`;
        movedPiece.style.top = `${y}px`;
    }
}

// заканчиваем движение меню
function moveEnd() {
    if (movedPiece) {
        movedPiece = null;
    };
}

// оптимизируем отрисовку анимациии
function throttle(callback) {
    let isWaiting = false;
    return function () {
      if (!isWaiting) {
        callback.apply(this, arguments);
        isWaiting = true;
        requestAnimationFrame(() => {
          isWaiting = false;
        });
      }
    };
}

//  при изменении размера окна браузера и изменении высоты меню
function checkMenuHeight() {
    if (menu.offsetHeight > 66) {
        // забавно если сразу не обнулить то меню медленно выплывает )))
        menu.style.left = '0px'   
        menu.style.left = `${wrap.offsetWidth - menu.offsetWidth - 1}px`
    }
}

//  *** Режим Публикация ***

// состояние по умолчанию при запуске приложения
function onFirstStart() {
    if (picId) {
        takeImageInfo(picId);
        pictureID = picId;
        return;
    };
    // почти середина )))
    menu.style.left = `${wrap.offsetWidth/2 - menu.offsetWidth/10}px`;
    menu.style.top = `${wrap.offsetHeight/2 - menu.offsetHeight/4}px`;
    currentImage.src = ''; // убираем фон
    menu.dataset.state = 'initial'; // скрываем пункты меню
    burger.style.display = 'none'; // убираем бургер
    document.querySelectorAll('.comments__form').forEach(form => {
        form.style.display = 'none'; // выключаем коментарии
    })

    //Навешиваем события для открытия изображения
    menu.querySelector('.new').addEventListener('click', uploadFileFromInput); 
    wrap.addEventListener('drop', onFilesDrop); //загрузка файла drag&drop
    wrap.addEventListener('dragover', event => event.preventDefault()); 
    removeComents();
}

// Загрузка через кнопку загрузить новое
function uploadFileFromInput(event) {
	//добавим форму для вызова окна "выбора файла"
    const fileInput = document.createElement('input');
    fileInput.setAttribute('id', 'fileInput');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', 'image/jpeg, image/png');
    fileInput.style.display = 'none';
    menu.appendChild(fileInput);
	document.querySelector('#fileInput').addEventListener('change', event => {
        const files = event.currentTarget.files;
        sendImage(files[0])
	});
    fileInput.click();
    menu.removeChild(fileInput);
}

// загрузка файла перетаскиванием
function onFilesDrop(event) {
	event.preventDefault();
	const files = Array.from(event.dataTransfer.files);
	//выдаем ошибку, при повторном перетаскивании изображения
	if (pictureID) {
        errorNode.style.display = '';
        menu.style.display = 'none';
		errorMessage.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню';
        // чтобы не висело вечно сообщение выключаем по таймауту
        setTimeout(function() {
            menu.style.display = '';
            errorNode.style.display = 'none';
        }, 3000);
		return;
    }
    
	//проверяем тип файла
    if ((files[0].type === 'image/jpeg') || (files[0].type === 'image/png')) {
        menu.style.display = ''
        // console.log(files[0])
        errorNode.style.display = 'none';
        // currentImageState = true; 
        sendImage(files[0])
    } else {
        menu.style.display = 'none'
        errorNode.style.display = '';
    }
}

// отправка файла картинки на сервер
function sendImage(file) {
	const formData = new FormData();  
    formData.append('title', file.name);
    formData.append('image', file);
    menu.style.display = 'none';
	imageLoader.style.display = '';

	fetch('https://neto-api.herokuapp.com/pic', {
			body: formData,
			credentials: 'same-origin',
			method: 'POST'
    })
    .then( res => {
        if (res.status >= 200 && res.status < 300) {
            return res;
        }
        throw new Error (res.statusText);
    })
    .then(res => res.json())
    .then(res => {
        takeImageInfo(res.id);
        pictureID = res.id;
    })
    .catch(err => {
        console.log(err);
        imageLoader.style.display = 'none';
        errorNode.style.display = 'none';
        errorMessage.textContent = err;
    });
}

// обрабатываем ответ сервера
function takeImageInfo(id) {
    fetch(`https://neto-api.herokuapp.com/pic/${id}`)
    .then( res => {
        if (res.status >= 200 && res.status < 300) {
            return res;
        }
        throw new Error (res.statusText);
    })
    .then(res => res.json())
    .then(res => {
        // если ответ ок переключаемся на Режим рецензирования
        changeStateShare(res);
    })
    .catch(err => {
        menu.style.display = 'none';
        imageLoader.style.display = 'none';
        console.log(err);
    });
}

//  *** Режим Рецензирования / Поделиться  ***

// получаем картинку и меняем состояние меню
function changeStateShare(res) {
    
    // переключаем режим меню в зависимости от ситуации
    if (picId) {
        menu.dataset.state = 'selected';
        menuModeElements.forEach(elem => elem.dataset.state = '');
        comments.dataset.state = 'selected';
    } else {
        menu.dataset.state = 'selected';
        menuModeElements.forEach(elem => elem.dataset.state = '');
        share.dataset.state = 'selected';
    }
    burger.style.display = '';
    // после загрузки картинки основное дейтвие )))
    currentImage.addEventListener('load', () => {
        imageLoader.style.display = 'none';
        menu.style.display = '';
        createWrapCanvasComments()
        createCanvas();
        removeComents(); 
        // отрисовываем полученные комментарии
        updateComments(res.comments);
        //подключаемся по вебсокет
        wss();
    });
    currentImage.src = res.url;
    console.log(res)
    // console.log(url)
    console.log(res.url)
    console.log(res.id)
    urlForShare.value = `${url}?id=${res.id}`

}

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

// Скрыть показать комментарии

commentsOnInput.addEventListener('change', checkCommentsState);
commentsOffInput.addEventListener('change', checkCommentsState);

function checkCommentsState() {
    if (commentsOnInput.checked) {
        document.querySelectorAll('.comments__form').forEach(form => {
            form.style.display = ''; // включаем коментарии
        })
    } else {
        document.querySelectorAll('.comments__form').forEach(form => {
            form.style.display = 'none'; // выключаем коментарии
        })
    }
}

// сворачиваем все  комментарии, кроме активного
function  minimizeAllComment(currentForm = null) {
    document.querySelectorAll('.comments__form').forEach(form => {
        if (form !== currentForm) {
            // если выбран не текущий комментарий, сворачиваем его
            form.querySelector('.comments__marker-checkbox').checked = false;
        }
    });
}

//при клике на хосле создаем новый комментарий
canvas.addEventListener('click', (event) => {
	if (comments.dataset.state !== 'selected' || !commentsOnInput.checked) return;   
    minimizeAllComment();
    const newComment = createNewForm();
    newComment.querySelector('.comments__marker-checkbox').checked = true;
    //смещение, чтобы маркер встал туда, куда кликнули
    const coordX = event.offsetX - 22;
    const coordY = event.offsetY - 14;
    newComment.style.left = coordX + 'px';
    newComment.style.top = coordY + 'px';
    // и в каждую форму добавляем атрибуты data-left и data-top 
    // координаты левого верхнего угла формы относительно currentImage
    newComment.dataset.left = coordX;
    newComment.dataset.top = coordY;
    wrapCanvasComments.appendChild(newComment);
}); 

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

// копирование ссылки в буфер обмена

document.querySelector('.menu_copy').addEventListener('click', (event) => {
    urlForShare.select();
    document.execCommand('copy');
})

//  Переключение режимов меню

burger.addEventListener('click', () => {
    menu.dataset.state = 'default';
    menuModeElements.forEach(elem => elem.dataset.state = '');
})

menuModeElements.forEach(elem => {
    elem.dataset.state = ''
    // пропускаем пункт загрузить новое
    // так как нет изменения интерфейса открываеться окно загруки
    if (!elem.classList.contains('new')) {
        elem.addEventListener('click', (event) => {
            menu.dataset.state = 'selected';
            event.currentTarget.dataset.state = 'selected'
        })
    }
})

// wrap для холста и коментариев
function createWrapCanvasComments() {
    const width = getComputedStyle(currentImage).width;
	const height = getComputedStyle(currentImage).height;
    wrapCanvasComments.style.width = width;
	wrapCanvasComments.style.height = height;
	wrapCanvasComments.style.position = 'absolute';
	wrapCanvasComments.style.top = '50%';
    wrapCanvasComments.style.left = '50%';
    wrapCanvasComments.style.transform = 'translate(-50%, -50%)';
    wrapCanvasComments.style.display = 'block';
	wrap.appendChild(wrapCanvasComments);
	// отображаем комментарий (по клику) поверх остальных
	wrapCanvasComments.addEventListener('click', event => {
		if (event.target.closest('.comments__form')) {
            const currentForm = event.target.closest('.comments__form');
			Array.from(wrapCanvasComments.querySelectorAll('.comments__form')).forEach(form => {
				form.style.zIndex = 2;
			});
            currentForm.style.zIndex = 3;
            minimizeAllComment(currentForm);
        }
	});
}

//  *** Рисование ***

// инициализация для рисования
const ctx = canvas.getContext('2d'); //контекст
const BRUSH_RADIUS = 4; //размер кисти
let curves = [];
let drawing = false;
let needsRepaint = false;
let brushColor = 'green'; // цвет при старте рисования

// изменение текущего цвета линий
document.querySelectorAll('.menu__color').forEach(colorInput => {
    colorInput.addEventListener('change', () => {
        if (!colorInput.checked) return;
        brushColor = colorInput.value;
    });
});

//Создаем холст для рисования	
function createCanvas() {
    // если размеры идут схолста то идет искажение (((
    const width = getComputedStyle(currentImage).width.slice(0, -2);
    const height = getComputedStyle(currentImage).height.slice(0, -2);
	canvas.width = width;
	canvas.height = height;
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	canvas.style.position = 'absolute';
	canvas.style.top = '0';
	canvas.style.left = '0';
    canvas.style.display = 'block';
    canvas.style.zIndex = '1';
    wrapCanvasComments.appendChild(canvas);
    
	curves = [];
    drawing = false;
    needsRepaint = false;
}


// начинаем рисовать только в режиме рисования
canvas.addEventListener("mousedown", (event) => {
	if (draw.dataset.state !== 'selected') return;
	drawing = true;
	const curve = []; // создаем новую кривую
	curve.color = brushColor; // определяем цвет кривой
	curve.push(makePoint(event.offsetX, event.offsetY)); 
	curves.push(curve); 
	needsRepaint = true;
});

canvas.addEventListener("mouseup", (event) => {
	drawing = false;
});

canvas.addEventListener("mouseleave", (event) => {
	drawing = false;
});

canvas.addEventListener("mousemove", (event) => {
	if (drawing) {
		curves[curves.length - 1].push(makePoint(event.offsetX, event.offsetY));
        needsRepaint = true;
	}
});

// рисуем точку
function circle(point) {
	ctx.beginPath();
	ctx.arc(...point, BRUSH_RADIUS / 2, 0, 2 * Math.PI);
	ctx.fill();
}

// рисуем плавную линию между двумя точками
function smoothCurveBetween (p1, p2) {
	const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
	ctx.quadraticCurveTo(...p1, ...cp);
}

// рисуем плавную линию между множеством точек
function smoothCurve(points) {
	ctx.beginPath();
	ctx.lineWidth = BRUSH_RADIUS;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	ctx.moveTo(...points[0]);

	for(let i = 1; i < points.length - 1; i++) {
		smoothCurveBetween(points[i], points[i + 1]);
	}

	ctx.stroke();
}
// координаты положения курсора
function makePoint(x, y) {
	return [x, y];
}

// перерисовка canvas
function repaint () {
    // очищаем перед перерисовкой
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	curves.forEach((curve) => {
        // задаем цвет
		ctx.strokeStyle = curve.color;
		ctx.fillStyle = curve.color;

		circle(curve[0]);
		smoothCurve(curve);
	});
}

// Производим анимацию 
function tick () {
    //  при каждой перерисовке следим за высотой menu
    checkMenuHeight();
    if(needsRepaint) {
        repaint();
        needsRepaint = false;
        // отправляем рисунки на сервер
        debounceSendMask()
    }
    window.requestAnimationFrame(tick);
}


// const throttleSendMask = throttle(sendMaskState, 2000);
const debounceSendMask = debounce(sendMaskState, 2000);

// используем, чтобы посылать данные на сервер не чаще 1 раза в несколько секунд
function throttle(callback, delay) {
    let isWaiting = false;
    return function (...rest) {
        if (!isWaiting) {
            callback.apply(this, rest);
            isWaiting = true;
            setTimeout(() => {
                isWaiting = false;
            }, delay);
        }
    };
}

// происходи позавершении текушего действия
function debounce(callback, delay) {
    let timeout;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            callback();
        }, delay);
    };
}

// отправка канвас на сервер
function sendMaskState() {
    canvas.toBlob(blob => {
        if (!connection) return;
        connection.send(blob);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
}

// удаление форм комментариев, при загрузке приложения и нового изображения
function removeComents() {
	const formComment = wrap.querySelectorAll('.comments__form');
	Array.from(formComment).forEach(item => {item.remove()})
}

onFirstStart();  // приложение запускается в базовом варианте
tick(); // запуск анимации и обновления данных

//закрываем веб сокет
window.addEventListener('beforeunload', () => {
    connection.close(1000);
});



// ****************************************************************************
// Ерунда для работы
// Ответ от сервера 

let x =  {
    id: "9d33fa70-a3a9-11e8-a701-cd73c5e466c0", 
    timestamp: 1534680951703, 
    title: "vid_na_dorogu_v_shirokom_pole.jpg", 
    url: "https://www.googleapis.com/download/storage/v1/b/n…om_pole.jpg?generation=1534680951940651&alt=media"
}

// перезапускаем текущю страницу с запросом нужным
// window.location.search = 'id=759c8050-a3bc-11e8-a701-cd73c5e466c0'


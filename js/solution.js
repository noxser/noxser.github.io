'use strict';

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

//  *** Режим Публикация ***

// состояние по умолчанию при запуске приложения
function onFirstStart() {
    if (picId) {
        takeImageInfo(picId);
        pictureID = picId;
        return;
    }
    // // почти середина ))) // wrap.dataset.state = '';
    // menu.style.left = `${wrap.offsetWidth/2 - menu.offsetWidth/10}px`;
    // menu.style.top = `${wrap.offsetHeight/2 - menu.offsetHeight/4}px`;
    // в левый верхний угол убрал меню для удобства на старте
    menu.style.top = '50px';
    menu.style.left = '50px';
    currentImage.src = ''; // убираем фон
    menu.dataset.state = 'initial'; // скрываем пункты меню
    burger.style.display = 'none'; // убираем бургер
    document.querySelectorAll('.comments__form').forEach(form => {
        form.style.display = 'none'; // выключаем коментарии
    });

    //Навешиваем события для открытия изображения
    menu.querySelector('.new').addEventListener('click', uploadFileFromInput);
    wrap.addEventListener('drop', onFilesDrop); //загрузка файла drag&drop
    wrap.addEventListener('dragover', event => event.preventDefault());
    removeComents();
}

// Загрузка через кнопку загрузить новое
function uploadFileFromInput() {
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
        menu.style.display = '';
        // console.log(files[0])
        errorNode.style.display = 'none';
        // currentImageState = true;
        sendImage(files[0])
    } else {
        menu.style.display = 'none';
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
        method: 'POST',
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
        // Копируем урл в адресную строку на случай перезагрузки страницы
        window.history.pushState("object or string", "Title",`${url.origin}?id=${res.id}`)
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
        // menuModeElements.forEach(elem => elem.dataset.state = '');
        comments.dataset.state = 'selected';
    } else {
        menu.dataset.state = 'selected';
        // menuModeElements.forEach(elem => elem.dataset.state = '');
        share.dataset.state = 'selected';
    }
    burger.style.display = '';
    // после загрузки картинки основное дейтвие )))
    currentImage.addEventListener('load', () => {
        imageLoader.style.display = 'none';
        menu.style.display = '';
        createWrapCanvasComments();
        createCanvas();
        removeComents();
        // отрисовываем полученные комментарии
        updateComments(res.comments);
        //подключаемся по вебсокет
        wss();
    });
    currentImage.src = res.url;
    urlForShare.value = `${url}?id=${res.id}`
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

// удаляем все пустые комментарии, кроме currentForm
function deleteAllBlankCommentFormsExcept(currentForm = null) {
    document.querySelectorAll('.comments__form').forEach(form => {
        if (form.querySelectorAll('.comment').length < 2 && form !== currentForm) {
        // если комментариев нет, и выбран не текущий комментарий, удалаем форму
        form.remove();
        }
    });
}

//при клике на хосле создаем новый комментарий
canvas.addEventListener('click', (event) => {
    if (comments.dataset.state !== 'selected' || !commentsOnInput.checked) return;
    deleteAllBlankCommentFormsExcept();
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



// копирование ссылки в буфер обмена

document.querySelector('.menu_copy').addEventListener('click', () => {
    urlForShare.select();
    document.execCommand('copy');
});

//  Переключение режимов меню

burger.addEventListener('click', () => {
    menu.dataset.state = 'default';
    menuModeElements.forEach(elem => elem.dataset.state = '');
});

menuModeElements.forEach(elem => {
    // elem.dataset.state = ''
    // пропускаем пункт загрузить новое
    // так как нет изменения интерфейса открываеться окно загруки
    if (!elem.classList.contains('new')) {
        elem.addEventListener('click', (event) => {
            menu.dataset.state = 'selected';
            event.currentTarget.dataset.state = 'selected'
        })
    }
});

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
            // удаляем все пустые комментарии, помимо того, на который кликнули
            deleteAllBlankCommentFormsExcept(currentForm);
            // сворачиваем все комментарии кроме текущего
            minimizeAllComment(currentForm);
        }
    });
}

// Рисование 
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

canvas.addEventListener("mouseup", () => {
    drawing = false;
});

canvas.addEventListener("mouseleave", () => {
    drawing = false;
});

canvas.addEventListener("mousemove", (event) => {
    if (drawing) {
        // curves[curves.length - 1].push(makePoint(event.offsetX, event.offsetY));
        needsRepaint = true;
        debounceSendMask();
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
        // throttleSendMask();
        debounceSendMask();
    }
    window.requestAnimationFrame(tick);
}


// const throttleSendMask = throttle(sendMaskState, 2000);
const debounceSendMask = debounce(sendMaskState, 1000);

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

// происходит позавершении текушего действия
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


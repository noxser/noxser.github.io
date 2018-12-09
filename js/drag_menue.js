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
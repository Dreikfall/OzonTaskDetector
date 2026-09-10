// content.js - Анализирует задания модерации

// Настройка: через сколько дней задание считается проверочным
const THRESHOLD_DAYS = 2;

// Переменная для хранения текущего URL
let currentUrl = '';

// Декодируем дату создания из идентификатора задания
function decodeUUIDDate(uuid) {
    const hexStr = uuid.replace(/-/g, '');
    const timeHex = hexStr.substring(0, 12);
    const timestamp = parseInt(timeHex, 16);
    return new Date(timestamp);
}

// Удаляем все индикаторы и предупреждения со страницы
function clearAllIndicators() {
    const oldIndicator = document.getElementById('task-type-indicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }
    
    const oldWarning = document.getElementById('control-warning');
    if (oldWarning) {
        oldWarning.remove();
    }
}

// Показываем индикатор типа задания в углу экрана
function showIndicator(isControl, ageDays, taskType) {
    // Создаем новый индикатор
    const indicator = document.createElement('div');
    indicator.id = 'task-type-indicator';
    
    // Выбираем стиль: зелёный или красный
    if (isControl) {
        indicator.classList.add('control');
        indicator.innerHTML = `⚠️ ПРОВЕРОЧНОЕ ${taskType} (${ageDays.toFixed(1)} дн.)`;
    } else {
        indicator.classList.add('regular');
        indicator.innerHTML = `✅ ${taskType} задание`;
    }
    
    // Добавляем на страницу
    document.body.appendChild(indicator);
}

// Показываем всплывающее предупреждение о проверочном задании
function showControlWarning(ageDays, taskType) {
    // Создаем предупреждение
    const warning = document.createElement('div');
    warning.id = 'control-warning';
    
    warning.innerHTML = `
        <h2>⚠️ ВНИМАНИЕ</h2>
        <p><strong>Это проверочное задание!</strong></p>
        <p>Тип: ${taskType}</p>
        <p>Возраст задания: ${ageDays.toFixed(1)} дней</p>
        <p>Будьте внимательны при модерации</p>
    `;
    
    // Добавляем на страницу
    document.body.appendChild(warning);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (warning.parentElement) {
            warning.remove();
        }
    }, 5000);
}

// Сохраняем данные о задании в фоновый скрипт
function saveTaskLog(data) {
    // Отправляем сообщение в background.js
    chrome.runtime.sendMessage({
        action: 'saveLog',
        data: data
    });
}

// Главная функция анализа
function analyzeTask() {
    const url = window.location.href;
    
    // Проверяем, изменился ли URL
    if (url === currentUrl) {
        // URL не изменился, не анализируем повторно
        return;
    }
    
    // Сохраняем новый URL
    currentUrl = url;
    
    // Очищаем старые индикаторы
    clearAllIndicators();
    
    console.log('[Ozon Detector] Анализирую:', url);
    
    // Универсальное регулярное выражение для любого типа задания
    // Захватываем тип задания (review, comment, question и т.д.) и UUID
    const match = url.match(/\/tasks\/([a-z]+)\/([a-f0-9-]+)/i);
    
    if (!match) {
        console.log('[Ozon Detector] Идентификатор не найден');
        return;
    }
    
    const taskType = match[1]; // Тип задания (review, comment, question...)
    const taskUuid = match[2]; // UUID задания
    
    console.log('[Ozon Detector] Тип задания:', taskType);
    console.log('[Ozon Detector] Найден идентификатор:', taskUuid);
    
    try {
        // Декодируем дату создания
        const createdDate = decodeUUIDDate(taskUuid);
        
        // Считаем возраст в днях
        const now = new Date();
        const ageMs = now - createdDate;
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        
        // Определяем тип задания
        const isControl = ageDays > THRESHOLD_DAYS;
        
        console.log('[Ozon Detector] Возраст:', ageDays.toFixed(2), 'дней');
        console.log('[Ozon Detector] Тип:', isControl ? 'ПРОВЕРОЧНОЕ' : 'Обычное');
        
        // Показываем индикатор с указанием типа задания
        showIndicator(isControl, ageDays, taskType);
        
        // Если проверочное - показываем предупреждение
        if (isControl) {
            showControlWarning(ageDays, taskType);
        }
        
        // Сохраняем в лог
        saveTaskLog({
            url: url,
            taskType: taskType,
            uuid: taskUuid,
            createdDate: createdDate.toISOString(),
            ageDays: ageDays,
            isControl: isControl,
            checkedAt: now.toISOString()
        });
        
    } catch (error) {
        console.error('[Ozon Detector] Ошибка:', error);
    }
}

// === ОТСЛЕЖИВАНИЕ ИЗМЕНЕНИЙ URL ===

// 1. Отслеживаем переходы назад/вперед в истории браузера
window.addEventListener('popstate', function() {
    setTimeout(analyzeTask, 100);
});

// 2. Перехватываем программные изменения URL (pushState)
const originalPushState = history.pushState;
history.pushState = function() {
    originalPushState.apply(this, arguments);
    setTimeout(analyzeTask, 100);
};

// 3. Перехватываем программные изменения URL (replaceState)
const originalReplaceState = history.replaceState;
history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    setTimeout(analyzeTask, 100);
};

// 4. Периодическая проверка URL (на случай если сайт меняет URL другими способами)
setInterval(function() {
    const url = window.location.href;
    if (url !== currentUrl) {
        analyzeTask();
    }
}, 1000); // Проверяем каждую секунду

// Запускаем анализ при загрузке страницы
analyzeTask();

console.log('[Ozon Detector] Скрипт загружен и отслеживает изменения URL');
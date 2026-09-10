// background.js - Фоновый сервис для логирования заданий

// Имя ключа, под которым будем хранить логи в памяти браузера
const LOG_STORAGE_KEY = 'taskLogs';

// Максимальное количество записей в логе (чтобы не засорять память)
const MAX_LOG_ENTRIES = 500;

// Функция сохранения задания в лог
async function saveTaskLog(taskData) {
    try {
        // Читаем существующие логи из памяти браузера
        const result = await chrome.storage.local.get(LOG_STORAGE_KEY);
        
        // Если логов еще нет, создаем пустой массив
        let logs = result[LOG_STORAGE_KEY] || [];
        
        // Добавляем новую запись в начало массива
        logs.unshift(taskData);
        
        // Если записей слишком много, удаляем старые
        if (logs.length > MAX_LOG_ENTRIES) {
            logs = logs.slice(0, MAX_LOG_ENTRIES);
        }
        
        // Сохраняем обновленные логи обратно в память
        await chrome.storage.local.set({
            [LOG_STORAGE_KEY]: logs
        });
        
        console.log('[Ozon Detector] Лог сохранен. Всего записей:', logs.length);
        
    } catch (error) {
        console.error('[Ozon Detector] Ошибка сохранения лога:', error);
    }
}

// Функция получения всех логов
async function getLogs() {
    try {
        const result = await chrome.storage.local.get(LOG_STORAGE_KEY);
        return result[LOG_STORAGE_KEY] || [];
    } catch (error) {
        console.error('[Ozon Detector] Ошибка чтения логов:', error);
        return [];
    }
}

// Функция очистки логов
async function clearLogs() {
    try {
        await chrome.storage.local.set({
            [LOG_STORAGE_KEY]: []
        });
        console.log('[Ozon Detector] Логи очищены');
    } catch (error) {
        console.error('[Ozon Detector] Ошибка очистки логов:', error);
    }
}

// Функция экспорта логов в CSV файл
async function exportToCSV() {
    try {
        const logs = await getLogs();
        
        if (logs.length === 0) {
            console.log('[Ozon Detector] Нет данных для экспорта');
            return;
        }
        
        // Создаем содержимое CSV файла
        let csvContent = 'Дата проверки,Статус,Возраст (дней),Идентификатор,Дата создания,Ссылка на задание\n';
        
        logs.forEach(log => {
            const status = log.isControl ? 'ПРОВЕРОЧНОЕ' : 'Обычное';
            const checkedDate = new Date(log.checkedAt).toLocaleString('ru-RU');
            const createdDate = new Date(log.createdDate).toLocaleString('ru-RU');
            
            csvContent += `"${checkedDate}","${status}","${log.ageDays.toFixed(2)}","${log.uuid}","${createdDate}","${log.url}"\n`;
        });
        
        // Создаем "пузырь" с данными файла
        const blob = new Blob(['\ufeff' + csvContent], {
            type: 'text/csv;charset=utf-8;'
        });
        
        // Создаем временную ссылку на файл
        const url = URL.createObjectURL(blob);
        
        // Генерируем имя файла с текущей датой
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
        const filename = `OzonTasks/ozon_tasks_${timestamp}.csv`;
        
        // Скачиваем файл
        await chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true // Спрашивать куда сохранить
        });
        
        console.log('[Ozon Detector] CSV файл создан');
        
    } catch (error) {
        console.error('[Ozon Detector] Ошибка экспорта:', error);
    }
}

// Слушаем сообщения от других частей расширения
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // Если получили команду сохранить лог
    if (message.action === 'saveLog') {
        saveTaskLog(message.data).then(() => {
            sendResponse({ success: true });
        });
        return true; // Говорим, что ответим асинхронно
    }
    
    // Если получили команду получить логи
    if (message.action === 'getLogs') {
        getLogs().then(logs => {
            sendResponse({ logs: logs });
        });
        return true;
    }
    
    // Если получили команду очистить логи
    if (message.action === 'clearLogs') {
        clearLogs().then(() => {
            sendResponse({ success: true });
        });
        return true;
    }
    
    // Если получили команду экспортировать в CSV
    if (message.action === 'exportCSV') {
        exportToCSV().then(() => {
            sendResponse({ success: true });
        });
        return true;
    }
});

console.log('[Ozon Detector] Фоновый сервис запущен');
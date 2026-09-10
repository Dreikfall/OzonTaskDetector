// popup.js - Логика окна расширения

// Эта функция запускается когда окно попадает открыто
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadTasksList();
    
    // Настраиваем кнопки
    document.getElementById('exportBtn').addEventListener('click', exportCSV);
    document.getElementById('clearBtn').addEventListener('click', clearHistory);
});

// Загружаем статистику
function loadStats() {
    // Отправляем запрос в background.js за логами
    chrome.runtime.sendMessage({ action: 'getLogs' }, function(response) {
        if (response && response.logs) {
            const logs = response.logs;
            
            // Считаем общее количество заданий
            const totalTasks = logs.length;
            
            // Считаем количество проверочных заданий
            const controlTasks = logs.filter(log => log.isControl).length;
            
            // Обновляем цифры на экране
            document.getElementById('totalTasks').textContent = totalTasks;
            document.getElementById('controlTasks').textContent = controlTasks;
        }
    });
}

// Загружаем список последних заданий
function loadTasksList() {
    // Запрашиваем логи из background.js
    chrome.runtime.sendMessage({ action: 'getLogs' }, function(response) {
        const tasksListElement = document.getElementById('tasksList');
        
        if (!response || !response.logs || response.logs.length === 0) {
            tasksListElement.innerHTML = '<div class="empty-message">Нет данных</div>';
            return;
        }
        
        // Берем последние 10 заданий
        const recentTasks = response.logs.slice(0, 10);
        
        // Создаем список
        let listHTML = '';
        
        recentTasks.forEach(function(task) {
            // Форматируем дату
            const date = new Date(task.checkedAt);
            const dateStr = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Определяем статус
            const statusClass = task.isControl ? 'control' : 'regular';
            const statusText = task.isControl ? '⚠️ ПРОВЕРОЧНОЕ' : '✅ Обычное';
            
            // Возраст задания
            const ageDays = task.ageDays.toFixed(1);
            
            // Добавляем элемент в список
            listHTML += `
                <div class="task-item ${statusClass}">
                    <div class="task-status ${statusClass}">${statusText}</div>
                    <div>Возраст: ${ageDays} дней</div>
                    <div class="task-date">Проверено: ${dateStr}</div>
                </div>
            `;
        });
        
        tasksListElement.innerHTML = listHTML;
    });
}

// Экспорт истории в CSV файл
function exportCSV() {
    const btn = document.getElementById('exportBtn');
    const originalText = btn.textContent;
    
    // Показываем что процесс идет
    btn.textContent = '⏳ Экспорт...';
    btn.disabled = true;
    
    // Отправляем команду в background.js
    chrome.runtime.sendMessage({ action: 'exportCSV' }, function(response) {
        // Восстанавливаем кнопку
        btn.textContent = originalText;
        btn.disabled = false;
        
        if (response && response.success) {
            alert('✅ История успешно экспортирована!');
        } else {
            alert('❌ Ошибка при экспорте');
        }
    });
}

// Очистка истории
function clearHistory() {
    // Спрашиваем подтверждение
    if (!confirm('Вы уверены, что хотите удалить всю историю заданий?')) {
        return;
    }
    
    const btn = document.getElementById('clearBtn');
    const originalText = btn.textContent;
    
    // Показываем что процесс идет
    btn.textContent = '⏳ Очистка...';
    btn.disabled = true;
    
    // Отправляем команду в background.js
    chrome.runtime.sendMessage({ action: 'clearLogs' }, function(response) {
        // Восстанавливаем кнопку
        btn.textContent = originalText;
        btn.disabled = false;
        
        if (response && response.success) {
            // Обновляем статистику и список
            loadStats();
            loadTasksList();
            alert('✅ История очищена!');
        }
    });
}
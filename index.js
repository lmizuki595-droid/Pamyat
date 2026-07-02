import { getContext } from "../../../extensions.js";
import { eventSource, event_types } from "../../../../script.js";

const EXTENSION_NAME = "context-trimmer";
let maxTokens = parseInt(localStorage.getItem('trimmer_max_tokens')) || 4000;

// Функция точного расчета и скрытия сообщений
function checkAndTrimMessages() {
    const context = getContext();
    const chat = context.chat;
    
    const tokensDisplay = document.getElementById('trimmer-current-tokens');
    const hiddenDisplay = document.getElementById('trimmer-hidden-count');

    if (!chat || chat.length === 0) {
        if (tokensDisplay) tokensDisplay.innerText = '0';
        if (hiddenDisplay) hiddenDisplay.innerText = '0';
        return;
    }

    const messageElements = document.querySelectorAll('#chat .mes');
    if (messageElements.length === 0) return;

    // Сбрасываем скрытие
    messageElements.forEach(el => el.classList.remove('st-trimmed-message'));

    let totalTokensAccumulated = 0;
    let cutoffIndex = -1;

    // Идем с конца чата
    for (let i = chat.length - 1; i >= 0; i--) {
        const msg = chat[i];
        if (!msg || msg.is_system) continue;

        let messageTokens = 0;
        
        if (msg.extra && typeof msg.extra.token_count === 'number') {
            messageTokens = msg.extra.token_count;
        } else if (msg.toks && typeof msg.toks === 'number') {
            messageTokens = msg.toks;
        } else {
            const textLength = (msg.mes || "").length;
            messageTokens = Math.ceil(textLength * 0.6);
        }

        if (messageTokens > 10000 && (msg.mes || "").length < 1000) {
            messageTokens = Math.ceil((msg.mes || "").length * 0.6);
        }

        if (totalTokensAccumulated + messageTokens > maxTokens) {
            cutoffIndex = i;
            break;
        }
        
        totalTokensAccumulated += messageTokens;
    }

    let hiddenCount = 0;

    if (cutoffIndex !== -1) {
        messageElements.forEach((el) => {
            const msgId = parseInt(el.getAttribute('data-id') || el.getAttribute('mesid'));
            if (!isNaN(msgId) && msgId <= cutoffIndex) {
                el.classList.add('st-trimmed-message');
                hiddenCount++;
            }
        });
    }

    if (tokensDisplay) tokensDisplay.innerText = totalTokensAccumulated.toLocaleString();
    if (hiddenDisplay) hiddenDisplay.innerText = hiddenCount;
}

// Создаем UI по официальному шаблону SillyTavern
function createUI() {
    const extensionsMenu = document.getElementById('extensions_settings');
    if (!extensionsMenu) return;

    // Создаем контейнер в разметке таверны
    const container = document.createElement('div');
    container.className = 'inline-drawer';

    // Родная структура сворачивающейся панели SillyTavern
    container.innerHTML = `
        <div class="inline-drawer-toggle inline-drawer-header" style="cursor: pointer;">
            <b class="drawer-title">Context Trimmer</b>
            <div class="inline-drawer-icon font-icon fas fa-chevron-down"></div>
        </div>
        <div class="inline-drawer-content trimmer-settings-block" style="display: block;">
            <div class="trimmer-value-wrapper">
                <label for="trimmer-range">Лимит контекста:</label>
                <span id="trimmer-val-display"><strong>${maxTokens.toLocaleString()}</strong> токенов</span>
            </div>
            
            <input type="range" id="trimmer-range" class="trimmer-slider" min="1000" max="200000" step="1000" value="${maxTokens}">
            
            <div style="margin-top: 8px; font-size: 0.85em; display: flex; flex-direction: column; gap: 4px; opacity: 0.85;">
                <div>Видимый контекст: <strong id="trimmer-current-tokens">0</strong> токенов</div>
                <div>Скрыто сообщений: <strong id="trimmer-hidden-count">0</strong></div>
            </div>
        </div>
    `;

    extensionsMenu.appendChild(container);

    // Добавляем логику сворачивания вручную, чтобы точно сработало на любой версии ST
    const toggle = container.querySelector('.inline-drawer-toggle');
    const content = container.querySelector('.inline-drawer-content');
    const icon = container.querySelector('.inline-drawer-icon');

    toggle.addEventListener('click', () => {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
        } else {
            content.style.display = 'none';
            icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
        }
    });

    // Навешиваем событие на ползунок
    const slider = document.getElementById('trimmer-range');
    const display = document.getElementById('trimmer-val-display');
    
    slider.addEventListener('input', (e) => {
        maxTokens = parseInt(e.target.value);
        display.innerHTML = `<strong>${maxTokens.toLocaleString()}</strong> токенов`;
        localStorage.setItem('trimmer_max_tokens', maxTokens);
        checkAndTrimMessages();
    });
}

jQuery(document).ready(function () {
    createUI();
    
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, checkAndTrimMessages);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, checkAndTrimMessages);
    eventSource.on(event_types.CHAT_CHANGED, () => {
        setTimeout(checkAndTrimMessages, 200);
    });
    
    setTimeout(checkAndTrimMessages, 500);
});        
        if (msg.extra && typeof msg.extra.token_count === 'number') {
            messageTokens = msg.extra.token_count;
        } else if (msg.toks && typeof msg.toks === 'number') {
            messageTokens = msg.toks;
        } else {
            // Реалистичный подсчет для русского языка: ~1.2 токена на слово или ~0.6 на символ
            const textLength = (msg.mes || "").length;
            messageTokens = Math.ceil(textLength * 0.6);
        }

        // Если один элемент выдает космическую цифру (баг кэша ST), принудительно считаем по тексту
        if (messageTokens > 10000 && (msg.mes || "").length < 1000) {
            messageTokens = Math.ceil((msg.mes || "").length * 0.6);
        }

        if (totalTokensAccumulated + messageTokens > maxTokens) {
            cutoffIndex = i;
            break;
        }
        
        totalTokensAccumulated += messageTokens;
    }

    let hiddenCount = 0;

    if (cutoffIndex !== -1) {
        messageElements.forEach((el) => {
            const msgId = parseInt(el.getAttribute('data-id') || el.getAttribute('mesid'));
            if (!isNaN(msgId) && msgId <= cutoffIndex) {
                el.classList.add('st-trimmed-message');
                hiddenCount++;
            }
        });
    }

    // Выводим красивые данные
    if (tokensDisplay) tokensDisplay.innerText = totalTokensAccumulated.toLocaleString();
    if (hiddenDisplay) hiddenDisplay.innerText = hiddenCount;
}

// Создаем UI
function createUI() {
    const extensionsMenu = document.getElementById('extensions_settings');
    if (!extensionsMenu) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'trimmer-extension-wrapper';

    const header = document.createElement('div');
    header.className = 'inline-drawer-toggle inline-drawer-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'pointer';
    
    header.innerHTML = `
        <span class="inline-drawer-icon font-icon fas fa-chevron-down"></span>
        <span class="drawer-title" style="flex-grow: 1; margin-left: 10px; font-weight: bold;">Context Trimmer</span>
    `;

    const content = document.createElement('div');
    content.className = 'inline-drawer-content trimmer-settings-block';
    content.style.display = 'block'; 

    content.innerHTML = `
        <div class="trimmer-value-wrapper">
            <label for="trimmer-range">Лимит контекста:</label>
            <span id="trimmer-val-display"><strong>${maxTokens.toLocaleString()}</strong> токенов</span>
        </div>
        
        <input type="range" id="trimmer-range" class="trimmer-slider" min="1000" max="200000" step="1000" value="${maxTokens}">
        
        <div style="margin-top: 8px; font-size: 0.85em; display: flex; flex-direction: column; gap: 4px; opacity: 0.85;">
            <div>Видимый контекст: <strong id="trimmer-current-tokens">0</strong> токенов</div>
            <div>Скрыто сообщений: <strong id="trimmer-hidden-count">0</strong></div>
        </div>
    `;

    header.addEventListener('click', () => {
        const icon = header.querySelector('.inline-drawer-icon');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
        } else {
            content.style.display = 'none';
            icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
        }
    });

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    extensionsMenu.appendChild(wrapper);
    
    const slider = document.getElementById('trimmer-range');
    const display = document.getElementById('trimmer-val-display');
    
    slider.addEventListener('input', (e) => {
        maxTokens = parseInt(e.target.value);
        display.innerHTML = `<strong>${maxTokens.toLocaleString()}</strong> токенов`;
        localStorage.setItem('trimmer_max_tokens', maxTokens);
        checkAndTrimMessages();
    });
}

jQuery(document).ready(function () {
    createUI();
    
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, checkAndTrimMessages);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, checkAndTrimMessages);
    eventSource.on(event_types.CHAT_CHANGED, () => {
        setTimeout(checkAndTrimMessages, 200);
    });
    
    setTimeout(checkAndTrimMessages, 500);
});        
        if (totalTokensAccumulated + messageTokens > maxTokens) {
            // Если сообщение не влезает в лимит, скрываем его и все, что ДО него
            cutoffIndex = i;
            break;
        }
        
        totalTokensAccumulated += messageTokens;
    }

    let hiddenCount = 0;

    // Если нашли индекс, до которого нужно всё скрыть
    if (cutoffIndex !== -1) {
        messageElements.forEach((el) => {
            const msgId = parseInt(el.getAttribute('data-id') || el.getAttribute('mesid'));
            if (!isNaN(msgId) && msgId <= cutoffIndex) {
                el.classList.add('st-trimmed-message');
                hiddenCount++;
            }
        });
    }

    // Обновляем статистику во вкладке расширения
    if (tokensDisplay) tokensDisplay.innerText = totalTokensAccumulated.toLocaleString();
    if (hiddenDisplay) hiddenDisplay.innerText = hiddenCount;
}

// Создаем сворачивающийся UI в стиле SillyTavern
function createUI() {
    const extensionsMenu = document.getElementById('extensions_settings');
    if (!extensionsMenu) return;

    // Создаем главный контейнер-обертку
    const wrapper = document.createElement('div');
    wrapper.className = 'trimmer-extension-wrapper';

    // Создаем шапку вкладки (кнопку сворачивания/разворачивания)
    const header = document.createElement('div');
    header.className = 'inline-drawer-toggle inline-drawer-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'pointer';
    
    header.innerHTML = `
        <span class="inline-drawer-icon font-icon fas fa-chevron-down"></span>
        <span class="drawer-title" style="flex-grow: 1; margin-left: 10px; font-weight: bold;">Context Trimmer</span>
    `;

    // Создаем тело вкладки, которое будет скрываться
    const content = document.createElement('div');
    content.className = 'inline-drawer-content trimmer-settings-block';
    // По умолчанию сделаем открытым, но таверна умеет это скрывать
    content.style.display = 'block'; 

    content.innerHTML = `
        <div class="trimmer-value-wrapper">
            <label for="trimmer-range">Лимит контекста:</label>
            <span id="trimmer-val-display"><strong>${maxTokens.toLocaleString()}</strong> токенов</span>
        </div>
        
        <!-- Ползунок теперь до 200 000 с шагом 1000 -->
        <input type="range" id="trimmer-range" class="trimmer-slider" min="1000" max="200000" step="1000" value="${maxTokens}">
        
        <div style="margin-top: 8px; font-size: 0.85em; display: flex; flex-direction: column; gap: 4px; opacity: 0.85;">
            <div>Видимый контекст: <strong id="trimmer-current-tokens">0</strong> токенов</div>
            <div>Скрыто сообщений: <strong id="trimmer-hidden-count">0</strong></div>
        </div>
    `;

    // Логика сворачивания вкладки по клику на шапку
    header.addEventListener('click', () => {
        const icon = header.querySelector('.inline-drawer-icon');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
        } else {
            content.style.display = 'none';
            icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
        }
    });

    // Собираем всё вместе и встраиваем в меню таверны
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    extensionsMenu.appendChild(wrapper);
    
    const slider = document.getElementById('trimmer-range');
    const display = document.getElementById('trimmer-val-display');
    
    // Обработка ползунка
    slider.addEventListener('input', (e) => {
        maxTokens = parseInt(e.target.value);
        display.innerHTML = `<strong>${maxTokens.toLocaleString()}</strong> токенов`;
        localStorage.setItem('trimmer_max_tokens', maxTokens);
        checkAndTrimMessages();
    });
}

// Инициализация расширения
jQuery(document).ready(function () {
    createUI();
    
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, checkAndTrimMessages);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, checkAndTrimMessages);
    eventSource.on(event_types.CHAT_CHANGED, () => {
        setTimeout(checkAndTrimMessages, 200);
    });
    
    setTimeout(checkAndTrimMessages, 500);
});

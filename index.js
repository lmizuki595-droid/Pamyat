import { getContext } from "../../../extensions.js";
import { eventSource, event_types } from "../../../../script.js";

const EXTENSION_NAME = "context-trimmer";
// Загружаем лимит (по умолчанию 4000 токенов, минимум 1000, максимум 32000)
let maxTokens = parseInt(localStorage.getItem('trimmer_max_tokens')) || 4000;

// Функция точного расчета и скрытия
function checkAndTrimMessages() {
    const context = getContext();
    const chat = context.chat; // Массив всех сообщений в текущем чате
    
    if (!chat || chat.length === 0) return;

    // Находим все DOM-элементы сообщений на странице
    const messageElements = document.querySelectorAll('#chat .mes');
    if (messageElements.length === 0) return;

    // Сначала сбрасываем скрытие со всех сообщений
    messageElements.forEach(el => el.classList.remove('st-trimmed-message'));

    let totalTokensAccumulated = 0;
    let cutoffIndex = -1;

    // Идем с КОНЦА чата (от новейших к старейшим)
    for (let i = chat.length - 1; i >= 0; i--) {
        // Пытаемся взять готовые токены сообщения, иначе грубо считаем: 1 токен ~ 4 символа
        const messageTokens = chat[i].extra?.token_count || Math.ceil((chat[i].mes || "").length / 4);
        
        if (totalTokensAccumulated + messageTokens > maxTokens) {
            // Если это сообщение уже не влезает в лимит, значит его и все, что ДО него, нужно скрыть
            cutoffIndex = i;
            break;
        }
        
        totalTokensAccumulated += messageTokens;
    }

    // Если нашли индекс, до которого нужно всё скрыть
    if (cutoffIndex !== -1) {
        let hiddenCount = 0;
        // Скрываем элементы в DOM, у которых data-id (или порядковый номер) меньше или равен cutoffIndex
        messageElements.forEach((el) => {
            const msgId = parseInt(el.getAttribute('data-id') || el.getAttribute('mesid'));
            if (!isNaN(msgId) && msgId <= cutoffIndex) {
                el.classList.add('st-trimmed-message');
                hiddenCount++;
            }
        });
        console.log(`[Trimmer] Лимит превышен. Скрыто сообщений: ${hiddenCount}. Оставшийся видимый контекст: ~${totalTokensAccumulated} токенов.`);
    } else {
        console.log(`[Trimmer] Всё отлично влезает в лимит. Текущий видимый контекст: ~${totalTokensAccumulated} токенов.`);
    }
}

// Создаем UI со слайдером в панели расширений
function createUI() {
    const container = document.createElement('div');
    container.className = 'trimmer-settings-block';
    
    container.innerHTML = `
        <div class="trimmer-value-wrapper">
            <label for="trimmer-range">Лимит контекста:</label>
            <span id="trimmer-val-display"><strong>${maxTokens}</strong> токенов</span>
        </div>
        <input type="range" id="trimmer-range" class="trimmer-slider" min="1000" max="16000" step="500" value="${maxTokens}">
        <small style="opacity: 0.6;">Старые сообщения будут автоматически скрываться, чтобы видимая часть не превышала этот порог.</small>
    `;
    
    document.getElementById('extensions_settings').appendChild(container);
    
    const slider = document.getElementById('trimmer-range');
    const display = document.getElementById('trimmer-val-display');
    
    // Обработка движения ползунка
    slider.addEventListener('input', (e) => {
        maxTokens = parseInt(e.target.value);
        display.innerHTML = `<strong>${maxTokens}</strong> токенов`;
        localStorage.setItem('trimmer_max_tokens', maxTokens);
        checkAndTrimMessages(); // Пересчитываем «на лету» при перетаскивании!
    });
}

// Инициализация расширения
jQuery(document).ready(function () {
    createUI();
    
    // Следим за рендером новых сообщений и за сменой персонажа/чата
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, checkAndTrimMessages);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, checkAndTrimMessages);
    eventSource.on(event_types.CHAT_CHANGED, () => {
        // Небольшая задержка, чтобы чат успел прогрузиться в DOM
        setTimeout(checkAndTrimMessages, 200);
    });
});

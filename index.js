(function () {
    // Пассивный подсчет и скрытие сообщений
    function checkAndTrimMessages() {
        try {
            // Загружаем актуальный лимит
            const maxTokens = parseInt(localStorage.getItem('trimmer_max_tokens')) || 4000;
            
            // Безопасно получаем доступ к контексту чата SillyTavern
            const context = window.SillyTavern?.context;
            const chat = context?.chat;
            
            const tokensDisplay = document.getElementById('trimmer-current-tokens');
            const hiddenDisplay = document.getElementById('trimmer-hidden-count');

            if (!chat || chat.length === 0) {
                if (tokensDisplay) tokensDisplay.innerText = '0';
                if (hiddenDisplay) hiddenDisplay.innerText = '0';
                return;
            }

            const messageElements = document.querySelectorAll('#chat .mes');
            if (messageElements.length === 0) return;

            // Сбрасываем скрытие со всех элементов
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

                // Защита от багов кэша ST
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
        } catch (err) {
            console.error("[Trimmer] Ошибка при расчете контекста:", err);
        }
    }

    // Создаем UI расширения
    function createUI() {
        try {
            const extensionsMenu = document.getElementById('extensions_settings');
            if (!extensionsMenu) return;

            if (document.getElementById('context-trimmer-container')) return;

            const maxTokens = parseInt(localStorage.getItem('trimmer_max_tokens')) || 4000;

            const container = document.createElement('div');
            container.className = 'inline-drawer';
            container.id = 'context-trimmer-container';

            container.innerHTML = `
                <div class="inline-drawer-toggle inline-drawer-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <b class="drawer-title">Context Trimmer</b>
                    <div class="inline-drawer-icon font-icon fas fa-chevron-down"></div>
                </div>
                <div class="inline-drawer-content trimmer-settings-block" style="display: block; padding: 10px;">
                    <div class="trimmer-value-wrapper" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <label for="trimmer-range">Лимит контекста:</label>
                        <span id="trimmer-val-display"><strong>${maxTokens.toLocaleString()}</strong> токенов</span>
                    </div>
                    
                    <input type="range" id="trimmer-range" class="trimmer-slider" min="1000" max="200000" step="1000" value="${maxTokens}" style="width: 100%;">
                    
                    <div style="margin-top: 8px; font-size: 0.85em; display: flex; flex-direction: column; gap: 4px; opacity: 0.85;">
                        <div>Видимый контекст: <strong id="trimmer-current-tokens">0</strong> токенов</div>
                        <div>Скрыто сообщений: <strong id="trimmer-hidden-count">0</strong></div>
                    </div>
                </div>
            `;

            extensionsMenu.appendChild(container);

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

            const slider = document.getElementById('trimmer-range');
            const display = document.getElementById('trimmer-val-display');
            
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                display.innerHTML = `<strong>${val.toLocaleString()}</strong> токенов`;
                localStorage.setItem('trimmer_max_tokens', val);
                checkAndTrimMessages();
            });

            checkAndTrimMessages();

        } catch (err) {
            console.error("[Trimmer] Ошибка при создании UI:", err);
        }
    }

    // Инициализация, когда SillyTavern готова
    jQuery(function () {
        createUI();
        
        const eventSource = window.SillyTavern?.eventSource;
        const event_types = window.SillyTavern?.event_types;

        if (eventSource && event_types) {
            eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, checkAndTrimMessages);
            eventSource.on(event_types.USER_MESSAGE_RENDERED, checkAndTrimMessages);
            eventSource.on(event_types.CHAT_CHANGED, () => setTimeout(checkAndTrimMessages, 200));
        }

        // Железная подстраховка: MutationObserver на чат
        const chatTarget = document.getElementById('chat');
        if (chatTarget) {
            const observer = new MutationObserver(checkAndTrimMessages);
            observer.observe(chatTarget, { childList: true, subtree: true });
        }
    });
})();

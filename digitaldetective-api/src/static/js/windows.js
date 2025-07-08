// Digital Detective - Window Management System
const WindowManager = {
    // Create a new window
    createWindow: (id, title, content, options = {}) => {
        const defaultOptions = {
            width: CONFIG.WINDOWS.DEFAULT_WIDTH,
            height: CONFIG.WINDOWS.DEFAULT_HEIGHT,
            x: 100 + (GAME_STATE.windows.size * 30),
            y: 100 + (GAME_STATE.windows.size * 30),
            resizable: true,
            minimizable: true,
            maximizable: true,
            closable: true,
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        // Create window element
        const windowElement = document.createElement('div');
        windowElement.className = 'window opening';
        windowElement.id = `window-${id}`;
        windowElement.style.left = `${finalOptions.x}px`;
        windowElement.style.top = `${finalOptions.y}px`;
        windowElement.style.width = `${finalOptions.width}px`;
        windowElement.style.height = `${finalOptions.height}px`;
        windowElement.style.zIndex = ++GAME_STATE.windowZIndex;
        
        // Create window header
        const header = document.createElement('div');
        header.className = 'window-header';
        header.innerHTML = `
            <span class="window-title">${Utils.escapeHtml(title)}</span>
            <div class="window-controls">
                ${finalOptions.minimizable ? '<button class="window-control" data-action="minimize">_</button>' : ''}
                ${finalOptions.maximizable ? '<button class="window-control" data-action="maximize">□</button>' : ''}
                ${finalOptions.closable ? '<button class="window-close" data-action="close">&times;</button>' : ''}
            </div>
        `;
        
        // Create window content
        const contentElement = document.createElement('div');
        contentElement.className = 'window-content';
        if (typeof content === 'string') {
            contentElement.innerHTML = content;
        } else {
            contentElement.appendChild(content);
        }
        
        // Add resize handle if resizable
        if (finalOptions.resizable) {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            windowElement.appendChild(resizeHandle);
            WindowManager.makeResizable(windowElement, resizeHandle);
        }
        
        windowElement.appendChild(header);
        windowElement.appendChild(contentElement);
        
        // Add to DOM
        document.getElementById('windows-container').appendChild(windowElement);
        
        // Store window data
        const windowData = {
            id,
            title,
            element: windowElement,
            options: finalOptions,
            isMinimized: false,
            isMaximized: false,
            originalBounds: null,
        };
        
        GAME_STATE.windows.set(id, windowData);
        
        // Make window draggable
        WindowManager.makeDraggable(windowElement, header);
        
        // Add event listeners
        WindowManager.addWindowEventListeners(windowData);
        
        // Focus the window
        WindowManager.focusWindow(id);
        
        // Create taskbar button
        WindowManager.createTaskbarButton(windowData);
        
        // Remove opening animation class
        setTimeout(() => {
            windowElement.classList.remove('opening');
        }, 200);
        
        Utils.playSound(CONFIG.SOUNDS.WINDOW_OPEN);
        
        return windowData;
    },
    
    // Close a window
    closeWindow: (id) => {
        const windowData = GAME_STATE.windows.get(id);
        if (!windowData) return;
        
        // Remove from DOM
        windowData.element.remove();
        
        // Remove taskbar button
        const taskbarButton = document.querySelector(`[data-window-id="${id}"]`);
        if (taskbarButton) {
            taskbarButton.remove();
        }
        
        // Remove from state
        GAME_STATE.windows.delete(id);
        
        // Focus another window if this was active
        if (GAME_STATE.activeWindow === id) {
            const remainingWindows = Array.from(GAME_STATE.windows.keys());
            if (remainingWindows.length > 0) {
                WindowManager.focusWindow(remainingWindows[remainingWindows.length - 1]);
            } else {
                GAME_STATE.activeWindow = null;
            }
        }
        
        Utils.playSound(CONFIG.SOUNDS.WINDOW_CLOSE);
        EventBus.emit('windowClosed', id);
    },
    
    // Focus a window
    focusWindow: (id) => {
        const windowData = GAME_STATE.windows.get(id);
        if (!windowData) return;
        
        // Update z-index
        windowData.element.style.zIndex = ++GAME_STATE.windowZIndex;
        
        // Update active state
        GAME_STATE.windows.forEach((data, windowId) => {
            const header = data.element.querySelector('.window-header');
            if (windowId === id) {
                data.element.classList.add('active');
                header.classList.remove('inactive');
            } else {
                data.element.classList.remove('active');
                header.classList.add('inactive');
            }
        });
        
        // Update taskbar buttons
        document.querySelectorAll('.taskbar-button').forEach(button => {
            if (button.dataset.windowId === id) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        GAME_STATE.activeWindow = id;
        EventBus.emit('windowFocused', id);
    },
    
    // Minimize a window
    minimizeWindow: (id) => {
        const windowData = GAME_STATE.windows.get(id);
        if (!windowData) return;
        
        windowData.element.style.display = 'none';
        windowData.isMinimized = true;
        
        // Update taskbar button
        const taskbarButton = document.querySelector(`[data-window-id="${id}"]`);
        if (taskbarButton) {
            taskbarButton.classList.remove('active');
        }
        
        // Focus another window
        if (GAME_STATE.activeWindow === id) {
            const visibleWindows = Array.from(GAME_STATE.windows.entries())
                .filter(([, data]) => !data.isMinimized)
                .map(([windowId]) => windowId);
            
            if (visibleWindows.length > 0) {
                WindowManager.focusWindow(visibleWindows[visibleWindows.length - 1]);
            } else {
                GAME_STATE.activeWindow = null;
            }
        }
        
        EventBus.emit('windowMinimized', id);
    },
    
    // Restore a window
    restoreWindow: (id) => {
        const windowData = GAME_STATE.windows.get(id);
        if (!windowData) return;
        
        windowData.element.style.display = 'block';
        windowData.isMinimized = false;
        
        if (windowData.isMaximized) {
            WindowManager.maximizeWindow(id);
        }
        
        WindowManager.focusWindow(id);
        EventBus.emit('windowRestored', id);
    },
    
    // Maximize a window
    maximizeWindow: (id) => {
        const windowData = GAME_STATE.windows.get(id);
        if (!windowData) return;
        
        if (!windowData.isMaximized) {
            // Store original bounds
            windowData.originalBounds = {
                x: parseInt(windowData.element.style.left),
                y: parseInt(windowData.element.style.top),
                width: parseInt(windowData.element.style.width),
                height: parseInt(windowData.element.style.height),
            };
            
            // Maximize
            windowData.element.style.left = '0px';
            windowData.element.style.top = '0px';
            windowData.element.style.width = '100vw';
            windowData.element.style.height = `calc(100vh - ${CONFIG.WINDOWS.TASKBAR_HEIGHT}px)`;
            windowData.isMaximized = true;
        } else {
            // Restore
            if (windowData.originalBounds) {
                windowData.element.style.left = `${windowData.originalBounds.x}px`;
                windowData.element.style.top = `${windowData.originalBounds.y}px`;
                windowData.element.style.width = `${windowData.originalBounds.width}px`;
                windowData.element.style.height = `${windowData.originalBounds.height}px`;
            }
            windowData.isMaximized = false;
        }
        
        EventBus.emit('windowMaximized', id);
    },
    
    // Make window draggable
    makeDraggable: (windowElement, header) => {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('window-control') || 
                e.target.classList.contains('window-close')) {
                return;
            }
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(windowElement.style.left);
            startTop = parseInt(windowElement.style.top);
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            e.preventDefault();
        });
        
        function onMouseMove(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            windowElement.style.left = `${startLeft + deltaX}px`;
            windowElement.style.top = `${Math.max(0, startTop + deltaY)}px`;
        }
        
        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    },
    
    // Make window resizable
    makeResizable: (windowElement, resizeHandle) => {
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(windowElement.style.width);
            startHeight = parseInt(windowElement.style.height);
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            e.preventDefault();
        });
        
        function onMouseMove(e) {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newWidth = Math.max(CONFIG.WINDOWS.MIN_WIDTH, startWidth + deltaX);
            const newHeight = Math.max(CONFIG.WINDOWS.MIN_HEIGHT, startHeight + deltaY);
            
            windowElement.style.width = `${newWidth}px`;
            windowElement.style.height = `${newHeight}px`;
        }
        
        function onMouseUp() {
            isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    },
    
    // Add event listeners to window
    addWindowEventListeners: (windowData) => {
        const { element, id } = windowData;
        
        // Window controls
        element.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            switch (action) {
                case 'close':
                    WindowManager.closeWindow(id);
                    break;
                case 'minimize':
                    WindowManager.minimizeWindow(id);
                    break;
                case 'maximize':
                    WindowManager.maximizeWindow(id);
                    break;
            }
        });
        
        // Focus on click
        element.addEventListener('mousedown', () => {
            WindowManager.focusWindow(id);
        });
    },
    
    // Create taskbar button
    createTaskbarButton: (windowData) => {
        const button = document.createElement('button');
        button.className = 'taskbar-button';
        button.dataset.windowId = windowData.id;
        button.textContent = windowData.title;
        
        button.addEventListener('click', () => {
            if (windowData.isMinimized) {
                WindowManager.restoreWindow(windowData.id);
            } else if (GAME_STATE.activeWindow === windowData.id) {
                WindowManager.minimizeWindow(windowData.id);
            } else {
                WindowManager.focusWindow(windowData.id);
            }
        });
        
        document.getElementById('taskbar-buttons').appendChild(button);
    },
    
    // Get window by ID
    getWindow: (id) => {
        return GAME_STATE.windows.get(id);
    },
    
    // Check if window exists
    windowExists: (id) => {
        return GAME_STATE.windows.has(id);
    }
};


/**
 * PlayFlow Widget - Embeddable Campaign Engine
 * 
 * This single script handles:
 * - Campaign config fetching from CDN
 * - Trigger detection (time delay, scroll, exit intent, click)
 * - Popup/modal rendering
 * - Game engines (spin-to-win, scratchcard, quiz, poll)
 * - Form capture and submission
 * - Event batching and analytics
 */

(function () {
    'use strict';

    // ========================================
    // Configuration
    // ========================================

    const CONFIG = {
        apiBase: window.PLAYFLOW_API_URL || 'https://api.playflow.io',
        cdnBase: window.PLAYFLOW_CDN_URL || 'https://cdn.playflow.io',
        batchInterval: 2000,
        maxBatchSize: 50,
    };

    // ========================================
    // Event Queue
    // ========================================

    let eventQueue: Event[] = [];
    let batchTimer: ReturnType<typeof setTimeout> | null = null;

    interface Event {
        type: string;
        campaignId: string;
        timestamp: number;
        data?: Record<string, unknown>;
    }

    function queueEvent(event: Omit<Event, 'timestamp'>) {
        eventQueue.push({
            ...event,
            timestamp: Date.now(),
        });

        if (eventQueue.length >= CONFIG.maxBatchSize) {
            flushEvents();
        } else if (!batchTimer) {
            batchTimer = setTimeout(flushEvents, CONFIG.batchInterval);
        }
    }

    async function flushEvents() {
        if (eventQueue.length === 0) return;

        const events = [...eventQueue];
        eventQueue = [];

        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }

        try {
            await fetch(`${CONFIG.apiBase}/v1/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events }),
                keepalive: true,
            });
        } catch (error) {
            // Re-queue failed events
            eventQueue = [...events, ...eventQueue].slice(0, CONFIG.maxBatchSize * 2);
        }
    }

    // Flush on page unload
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushEvents();
        }
    });

    // ========================================
    // Campaign Types
    // ========================================

    interface CampaignConfig {
        id: string;
        version: number;
        flow: {
            trigger: TriggerConfig;
            container: ContainerConfig;
            blocks: Block[];
        };
        branding?: BrandingConfig;
    }

    interface TriggerConfig {
        type: 'time_delay' | 'scroll_percentage' | 'exit_intent' | 'click' | 'page_view';
        delayMs?: number;
        scrollPercentage?: number;
        clickSelector?: string;
    }

    interface ContainerConfig {
        style: 'popup' | 'slide_in' | 'full_screen' | 'embedded';
        position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
        closeButton?: boolean;
        overlay?: boolean;
        embedSelector?: string;
    }

    interface Block {
        id: string;
        type: 'game' | 'form' | 'outcome' | 'cta_action';
        config: Record<string, unknown>;
    }

    interface BrandingConfig {
        primaryColor?: string;
        secondaryColor?: string;
        fontFamily?: string;
        logoUrl?: string;
    }

    // ========================================
    // Trigger System
    // ========================================

    function setupTrigger(config: CampaignConfig, onTrigger: () => void) {
        const trigger = config.flow.trigger;

        switch (trigger.type) {
            case 'time_delay':
                setTimeout(onTrigger, trigger.delayMs || 3000);
                break;

            case 'scroll_percentage':
                const threshold = trigger.scrollPercentage || 50;
                let triggered = false;

                const scrollHandler = () => {
                    if (triggered) return;

                    const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
                    if (scrolled >= threshold) {
                        triggered = true;
                        window.removeEventListener('scroll', scrollHandler);
                        onTrigger();
                    }
                };

                window.addEventListener('scroll', scrollHandler, { passive: true });
                break;

            case 'exit_intent':
                let exitTriggered = false;

                const exitHandler = (e: MouseEvent) => {
                    if (exitTriggered) return;

                    if (e.clientY <= 0) {
                        exitTriggered = true;
                        document.removeEventListener('mouseout', exitHandler);
                        onTrigger();
                    }
                };

                document.addEventListener('mouseout', exitHandler);
                break;

            case 'click':
                if (trigger.clickSelector) {
                    const element = document.querySelector(trigger.clickSelector);
                    if (element) {
                        element.addEventListener('click', onTrigger, { once: true });
                    }
                }
                break;

            case 'page_view':
                onTrigger();
                break;
        }
    }

    // ========================================
    // Popup Rendering
    // ========================================

    function createOverlay(): HTMLDivElement {
        const overlay = document.createElement('div');
        overlay.className = 'pf-overlay';
        overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 999998;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
        return overlay;
    }

    function createPopupContainer(config: ContainerConfig, branding?: BrandingConfig): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'pf-popup';

        const primaryColor = branding?.primaryColor || '#ec4899';
        const fontFamily = branding?.fontFamily || 'system-ui, -apple-system, sans-serif';

        let positionStyles = 'top: 50%; left: 50%; transform: translate(-50%, -50%);';

        if (config.style === 'slide_in') {
            switch (config.position) {
                case 'bottom':
                    positionStyles = 'bottom: 20px; left: 50%; transform: translateX(-50%);';
                    break;
                case 'left':
                    positionStyles = 'top: 50%; left: 20px; transform: translateY(-50%);';
                    break;
                case 'right':
                    positionStyles = 'top: 50%; right: 20px; transform: translateY(-50%);';
                    break;
            }
        } else if (config.style === 'full_screen') {
            positionStyles = 'inset: 0; border-radius: 0;';
        }

        container.style.cssText = `
      position: fixed;
      ${positionStyles}
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      z-index: 999999;
      font-family: ${fontFamily};
      color: white;
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
      opacity: 0;
      transform: ${config.style === 'slide_in' ? 'translateY(20px)' : 'translate(-50%, -50%) scale(0.95)'};
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;

        // Add close button
        if (config.closeButton !== false) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'pf-close';
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        width: 32px;
        height: 32px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 24px;
        line-height: 1;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.2s;
      `;
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            container.appendChild(closeBtn);
        }

        return container;
    }

    function showPopup(container: HTMLDivElement, overlay: HTMLDivElement | null, onClose: () => void) {
        document.body.appendChild(container);
        if (overlay) document.body.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => {
            container.style.opacity = '1';
            container.style.transform = container.style.transform.replace('scale(0.95)', 'scale(1)').replace('translateY(20px)', 'translateY(0)');
            if (overlay) overlay.style.opacity = '1';
        });

        // Close handlers
        const closeBtn = container.querySelector('.pf-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', onClose);
        }
        if (overlay) {
            overlay.addEventListener('click', onClose);
        }

        // ESC key
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escHandler);
                onClose();
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    function hidePopup(container: HTMLDivElement, overlay: HTMLDivElement | null) {
        container.style.opacity = '0';
        if (overlay) overlay.style.opacity = '0';

        setTimeout(() => {
            container.remove();
            if (overlay) overlay.remove();
        }, 300);
    }

    // ========================================
    // Game Engines
    // ========================================

    function renderSpinToWin(container: HTMLDivElement, config: Record<string, unknown>, onComplete: (result: unknown) => void) {
        const segments = (config.segments as Array<{ label: string; color: string; probability: number }>) || [];
        const wheelSize = 300;

        const content = document.createElement('div');
        content.className = 'pf-spin-game';
        content.style.cssText = `
      padding: 40px;
      text-align: center;
      min-width: 360px;
    `;

        content.innerHTML = `
      <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: 700;">Spin to Win!</h2>
      <p style="margin: 0 0 24px; color: rgba(255,255,255,0.7);">Try your luck for a special prize</p>
      
      <div class="pf-wheel-container" style="position: relative; width: ${wheelSize}px; height: ${wheelSize}px; margin: 0 auto 24px;">
        <svg class="pf-wheel" width="${wheelSize}" height="${wheelSize}" viewBox="0 0 ${wheelSize} ${wheelSize}" style="transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);">
          ${segments.map((seg, i) => {
            const angle = 360 / segments.length;
            const startAngle = i * angle - 90;
            const endAngle = startAngle + angle;
            const x1 = wheelSize / 2 + (wheelSize / 2 - 10) * Math.cos(startAngle * Math.PI / 180);
            const y1 = wheelSize / 2 + (wheelSize / 2 - 10) * Math.sin(startAngle * Math.PI / 180);
            const x2 = wheelSize / 2 + (wheelSize / 2 - 10) * Math.cos(endAngle * Math.PI / 180);
            const y2 = wheelSize / 2 + (wheelSize / 2 - 10) * Math.sin(endAngle * Math.PI / 180);
            const largeArc = angle > 180 ? 1 : 0;

            return `
              <path d="M ${wheelSize / 2} ${wheelSize / 2} L ${x1} ${y1} A ${wheelSize / 2 - 10} ${wheelSize / 2 - 10} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${seg.color}" />
              <text x="${wheelSize / 2 + (wheelSize / 3) * Math.cos((startAngle + angle / 2) * Math.PI / 180)}" 
                    y="${wheelSize / 2 + (wheelSize / 3) * Math.sin((startAngle + angle / 2) * Math.PI / 180)}"
                    fill="white" font-size="12" text-anchor="middle" dominant-baseline="middle"
                    transform="rotate(${startAngle + angle / 2 + 90}, ${wheelSize / 2 + (wheelSize / 3) * Math.cos((startAngle + angle / 2) * Math.PI / 180)}, ${wheelSize / 2 + (wheelSize / 3) * Math.sin((startAngle + angle / 2) * Math.PI / 180)})"
              >${seg.label}</text>
            `;
        }).join('')}
        </svg>
        <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 20px solid #ec4899;"></div>
      </div>
      
      <button class="pf-spin-btn" style="
        padding: 16px 48px;
        font-size: 18px;
        font-weight: 600;
        background: linear-gradient(135deg, #ec4899 0%, #f97316 100%);
        color: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
      ">SPIN NOW!</button>
    `;

        container.appendChild(content);

        const wheel = content.querySelector('.pf-wheel') as SVGElement;
        const spinBtn = content.querySelector('.pf-spin-btn') as HTMLButtonElement;

        spinBtn.addEventListener('click', () => {
            spinBtn.disabled = true;
            spinBtn.textContent = 'Spinning...';

            // Calculate weighted random result
            const totalWeight = segments.reduce((sum, s) => sum + (s.probability || 1), 0);
            let random = Math.random() * totalWeight;
            let winningIndex = 0;

            for (let i = 0; i < segments.length; i++) {
                random -= segments[i].probability || 1;
                if (random <= 0) {
                    winningIndex = i;
                    break;
                }
            }

            // Calculate rotation
            const segmentAngle = 360 / segments.length;
            const targetAngle = 360 * 5 + (360 - winningIndex * segmentAngle - segmentAngle / 2);

            wheel.style.transform = `rotate(${targetAngle}deg)`;

            setTimeout(() => {
                onComplete({
                    winner: segments[winningIndex],
                    index: winningIndex,
                });
            }, 4200);
        });
    }

    function renderScratchcard(container: HTMLDivElement, config: Record<string, unknown>, onComplete: (result: unknown) => void) {
        const content = document.createElement('div');
        content.className = 'pf-scratch-game';
        content.style.cssText = `
      padding: 40px;
      text-align: center;
      min-width: 360px;
    `;

        const prizeText = (config.prizeText as string) || '20% OFF!';

        content.innerHTML = `
      <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: 700;">Scratch & Win!</h2>
      <p style="margin: 0 0 24px; color: rgba(255,255,255,0.7);">Reveal your mystery prize</p>
      
      <div class="pf-scratch-area" style="
        position: relative;
        width: 280px;
        height: 160px;
        margin: 0 auto 24px;
        border-radius: 12px;
        overflow: hidden;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      ">
        <div class="pf-prize" style="
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 700;
        ">${prizeText}</div>
        <canvas class="pf-scratch-canvas" width="280" height="160" style="
          position: absolute;
          inset: 0;
          cursor: crosshair;
        "></canvas>
      </div>
      
      <p style="color: rgba(255,255,255,0.5); font-size: 14px;">Scratch the card to reveal your prize</p>
    `;

        container.appendChild(content);

        const canvas = content.querySelector('.pf-scratch-canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d')!;

        // Fill with scratch-off coating
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(0, 0, 280, 160);

        // Add shimmer pattern
        for (let i = 0; i < 50; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 280, Math.random() * 160, Math.random() * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
            ctx.fill();
        }

        let isScratching = false;
        let scratchedPixels = 0;
        let revealed = false;

        const scratch = (x: number, y: number) => {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fill();

            // Check scratch progress
            const imageData = ctx.getImageData(0, 0, 280, 160);
            let transparent = 0;
            for (let i = 3; i < imageData.data.length; i += 4) {
                if (imageData.data[i] === 0) transparent++;
            }

            const percentRevealed = (transparent / (280 * 160)) * 100;

            if (percentRevealed > 50 && !revealed) {
                revealed = true;
                // Clear remaining
                ctx.clearRect(0, 0, 280, 160);
                onComplete({ revealed: true, prize: prizeText });
            }
        };

        canvas.addEventListener('mousedown', () => { isScratching = true; });
        canvas.addEventListener('mouseup', () => { isScratching = false; });
        canvas.addEventListener('mouseleave', () => { isScratching = false; });
        canvas.addEventListener('mousemove', (e) => {
            if (!isScratching) return;
            const rect = canvas.getBoundingClientRect();
            scratch(e.clientX - rect.left, e.clientY - rect.top);
        });

        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isScratching = true;
        });
        canvas.addEventListener('touchend', () => { isScratching = false; });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!isScratching) return;
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            scratch(touch.clientX - rect.left, touch.clientY - rect.top);
        });
    }

    function renderQuiz(container: HTMLDivElement, config: Record<string, unknown>, onComplete: (result: unknown) => void) {
        const questions = (config.questions as Array<{ question: string; options: string[]; correctIndex: number }>) || [];
        let currentQuestion = 0;
        let score = 0;

        const content = document.createElement('div');
        content.className = 'pf-quiz-game';
        content.style.cssText = `
      padding: 40px;
      text-align: center;
      min-width: 400px;
      max-width: 500px;
    `;

        function renderQuestion() {
            const q = questions[currentQuestion];

            content.innerHTML = `
        <div style="margin-bottom: 16px; color: rgba(255,255,255,0.6); font-size: 14px;">
          Question ${currentQuestion + 1} of ${questions.length}
        </div>
        <h2 style="margin: 0 0 24px; font-size: 22px; font-weight: 600;">${q.question}</h2>
        <div class="pf-options" style="display: flex; flex-direction: column; gap: 12px;">
          ${q.options.map((opt, i) => `
            <button class="pf-option" data-index="${i}" style="
              padding: 16px 20px;
              background: rgba(255, 255, 255, 0.1);
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-radius: 12px;
              color: white;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.2s;
              text-align: left;
            ">${opt}</button>
          `).join('')}
        </div>
      `;

            content.querySelectorAll('.pf-option').forEach((btn) => {
                btn.addEventListener('mouseenter', () => {
                    (btn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.15)';
                    (btn as HTMLElement).style.borderColor = 'rgba(236, 72, 153, 0.5)';
                });
                btn.addEventListener('mouseleave', () => {
                    (btn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
                    (btn as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.2)';
                });
                btn.addEventListener('click', (e) => {
                    const index = parseInt((e.currentTarget as HTMLElement).dataset.index!, 10);
                    const isCorrect = index === q.correctIndex;
                    if (isCorrect) score++;

                    // Show feedback
                    (e.currentTarget as HTMLElement).style.background = isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
                    (e.currentTarget as HTMLElement).style.borderColor = isCorrect ? '#10b981' : '#ef4444';

                    // Disable all options
                    content.querySelectorAll('.pf-option').forEach((b) => {
                        (b as HTMLButtonElement).disabled = true;
                    });

                    // Show correct answer
                    const correctBtn = content.querySelector(`.pf-option[data-index="${q.correctIndex}"]`) as HTMLElement;
                    correctBtn.style.background = 'rgba(16, 185, 129, 0.3)';
                    correctBtn.style.borderColor = '#10b981';

                    setTimeout(() => {
                        currentQuestion++;
                        if (currentQuestion < questions.length) {
                            renderQuestion();
                        } else {
                            onComplete({ score, total: questions.length, percentage: Math.round((score / questions.length) * 100) });
                        }
                    }, 1500);
                });
            });
        }

        container.appendChild(content);
        renderQuestion();
    }

    // ========================================
    // Form Capture
    // ========================================

    function renderForm(container: HTMLDivElement, config: Record<string, unknown>, onSubmit: (data: Record<string, unknown>) => void) {
        const fields = (config.fields as Array<{ name: string; label: string; type: string; required?: boolean }>) || [
            { name: 'email', label: 'Email', type: 'email', required: true }
        ];
        const submitText = (config.submitButtonText as string) || 'Claim Your Prize';

        const content = document.createElement('div');
        content.className = 'pf-form';
        content.style.cssText = `
      padding: 40px;
      min-width: 360px;
    `;

        content.innerHTML = `
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; text-align: center;">Almost There!</h2>
      <p style="margin: 0 0 24px; color: rgba(255,255,255,0.7); text-align: center;">Enter your details to claim your prize</p>
      
      <form class="pf-capture-form">
        ${fields.map(field => `
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-size: 14px; color: rgba(255,255,255,0.8);">
              ${field.label}${field.required ? ' *' : ''}
            </label>
            <input 
              type="${field.type}" 
              name="${field.name}" 
              ${field.required ? 'required' : ''}
              style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: white;
                font-size: 16px;
                outline: none;
                transition: border-color 0.2s;
              "
            />
          </div>
        `).join('')}
        
        <div style="margin-top: 8px; margin-bottom: 16px;">
          <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.6); cursor: pointer;">
            <input type="checkbox" name="consent" required style="margin-top: 2px;" />
            <span>I agree to receive marketing communications and accept the privacy policy</span>
          </label>
        </div>
        
        <button type="submit" style="
          width: 100%;
          padding: 16px;
          font-size: 18px;
          font-weight: 600;
          background: linear-gradient(135deg, #ec4899 0%, #f97316 100%);
          color: white;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
        ">${submitText}</button>
      </form>
    `;

        container.appendChild(content);

        // Style focus states
        content.querySelectorAll('input[type="text"], input[type="email"]').forEach((input) => {
            input.addEventListener('focus', () => {
                (input as HTMLElement).style.borderColor = '#ec4899';
            });
            input.addEventListener('blur', () => {
                (input as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.2)';
            });
        });

        const form = content.querySelector('.pf-capture-form') as HTMLFormElement;
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            onSubmit(data);
        });
    }

    // ========================================
    // Outcome Display
    // ========================================

    function renderOutcome(container: HTMLDivElement, config: Record<string, unknown>, result: unknown) {
        const variant = (config.variant as string) || 'winner';
        const title = (config.title as string) || (variant === 'winner' ? 'Congratulations!' : 'Thanks for playing!');
        const message = (config.message as string) || '';
        const couponCode = ((result as any)?.couponCode as string) || '';

        const content = document.createElement('div');
        content.className = 'pf-outcome';
        content.style.cssText = `
      padding: 40px;
      text-align: center;
      min-width: 360px;
    `;

        content.innerHTML = `
      <div style="margin-bottom: 16px; font-size: 48px;">${variant === 'winner' ? '🎉' : '😊'}</div>
      <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: 700;">${title}</h2>
      ${message ? `<p style="margin: 0 0 24px; color: rgba(255,255,255,0.7);">${message}</p>` : ''}
      ${couponCode ? `
        <div style="
          background: rgba(255, 255, 255, 0.1);
          border: 2px dashed rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          padding: 16px 24px;
          margin: 24px 0;
        ">
          <div style="color: rgba(255,255,255,0.6); font-size: 12px; margin-bottom: 4px;">YOUR CODE</div>
          <div style="font-size: 24px; font-weight: 700; letter-spacing: 2px;">${couponCode}</div>
        </div>
        <button class="pf-copy-btn" style="
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-size: 14px;
        ">Copy Code</button>
      ` : ''}
    `;

        container.appendChild(content);

        const copyBtn = content.querySelector('.pf-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(couponCode);
                (copyBtn as HTMLElement).textContent = 'Copied!';
                setTimeout(() => {
                    (copyBtn as HTMLElement).textContent = 'Copy Code';
                }, 2000);
            });
        }
    }

    // ========================================
    // Main Campaign Runner
    // ========================================

    async function runCampaign(campaignId: string) {
        try {
            // Fetch campaign config
            const response = await fetch(`${CONFIG.cdnBase}/campaigns/${campaignId}/config.json`);
            if (!response.ok) throw new Error('Campaign not found');

            const config: CampaignConfig = await response.json();

            // Check session storage to avoid showing same campaign twice
            const sessionKey = `pf_shown_${campaignId}`;
            if (sessionStorage.getItem(sessionKey)) return;

            // Track campaign view
            queueEvent({ type: 'campaign_view', campaignId });

            setupTrigger(config, () => {
                // Mark as shown
                sessionStorage.setItem(sessionKey, '1');

                // Track trigger
                queueEvent({ type: 'campaign_triggered', campaignId });

                // Create popup
                const overlay = config.flow.container.overlay !== false ? createOverlay() : null;
                const popup = createPopupContainer(config.flow.container, config.branding);

                let currentBlockIndex = 0;

                const closePopup = () => {
                    queueEvent({ type: 'campaign_closed', campaignId });
                    hidePopup(popup, overlay);
                    flushEvents();
                };

                const nextBlock = (result?: unknown) => {
                    // Clear previous content (except close button)
                    Array.from(popup.children).forEach((child) => {
                        if (!(child as HTMLElement).classList.contains('pf-close')) {
                            child.remove();
                        }
                    });

                    const block = config.flow.blocks[currentBlockIndex];
                    if (!block) {
                        closePopup();
                        return;
                    }

                    currentBlockIndex++;

                    switch (block.type) {
                        case 'game':
                            const gameType = block.config.gameType as string;
                            if (gameType === 'spin_to_win') {
                                renderSpinToWin(popup, block.config, nextBlock);
                            } else if (gameType === 'scratchcard') {
                                renderScratchcard(popup, block.config, nextBlock);
                            } else if (gameType === 'quiz') {
                                renderQuiz(popup, block.config, nextBlock);
                            }
                            break;

                        case 'form':
                            renderForm(popup, block.config, (data) => {
                                queueEvent({ type: 'form_submit', campaignId, data });
                                nextBlock(data);
                            });
                            break;

                        case 'outcome':
                            renderOutcome(popup, block.config, result);
                            queueEvent({ type: 'campaign_completed', campaignId });
                            break;

                        default:
                            nextBlock();
                    }
                };

                showPopup(popup, overlay, closePopup);
                nextBlock();
            });

        } catch (error) {
            console.error('[PlayFlow] Failed to load campaign:', error);
        }
    }

    // ========================================
    // Public API
    // ========================================

    (window as any).PlayFlow = {
        run: runCampaign,
        flush: flushEvents,
    };

    // Auto-run if data attribute present
    document.querySelectorAll('[data-playflow-campaign]').forEach((el) => {
        const campaignId = (el as HTMLElement).dataset.playflowCampaign;
        if (campaignId) runCampaign(campaignId);
    });

})();

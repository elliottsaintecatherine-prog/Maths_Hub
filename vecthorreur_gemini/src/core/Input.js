export default class Input {
    constructor() {
        this.keys = {};
        this.previousKeys = {};
        this.mouse = { x: 0, y: 0, isDown: false };
        
        this.allowedKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Enter', 'Escape'
        ];

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }

    onKeyDown(e) {
        if (this.allowedKeys.includes(e.key)) {
            if (e.key.startsWith('Arrow')) {
                e.preventDefault();
            }
            this.keys[e.key] = true;
        }
    }

    onKeyUp(e) {
        if (this.allowedKeys.includes(e.key)) {
            this.keys[e.key] = false;
        }
    }

    onMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    onMouseDown(e) {
        if (e.button === 0) {
            this.mouse.isDown = true;
        }
    }

    onMouseUp(e) {
        if (e.button === 0) {
            this.mouse.isDown = false;
        }
    }

    update() {
        // Copy current keys state to previousKeys for "just pressed" logic
        this.previousKeys = { ...this.keys };
    }

    isDown(key) {
        return !!this.keys[key];
    }

    isJustPressed(key) {
        return !!this.keys[key] && !this.previousKeys[key];
    }
}

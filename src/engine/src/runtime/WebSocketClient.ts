import { EditorMessage, EngineMessage } from './types';

/**
 * WebSocket client for real-time communication with editor
 */
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private onMessageCallback: ((message: EngineMessage) => void) | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private reconnectDelay: number = 1000;

    constructor(url: string = 'ws://127.0.0.1:9001') {
        this.url = url;
    }

    /**
     * Connect to the WebSocket server
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);

                this.ws.onopen = () => {
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: EngineMessage = JSON.parse(event.data);
                        if (this.onMessageCallback) {
                            this.onMessageCallback(message);
                        }
                    } catch (error) {
                    }
                };

                this.ws.onerror = (error) => {
                    reject(error);
                };

                this.ws.onclose = () => {
                    this.ws = null;
                    this.attemptReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Attempt to reconnect
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }

        this.reconnectAttempts++;

        setTimeout(() => {
            this.connect().catch(() => {
            });
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    /**
     * Send a message to the editor
     */
    send(message: EditorMessage): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
        }
    }

    /**
     * Set callback for incoming messages
     */
    onMessage(callback: (message: EngineMessage) => void): void {
        this.onMessageCallback = callback;
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

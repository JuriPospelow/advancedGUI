/** Transport abstraction for publishing, subscribing, and receiving messages. */
export interface Connector {
  connect(port: number): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, payload: string): Promise<void>;
  subscribe(topic: string): Promise<void>;
  onMessage(handler: (topic: string, payload: string) => void): void;
}

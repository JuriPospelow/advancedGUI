/** MQTT abstraction for publishing, subscribing, and receiving messages. */
export interface Connector {
  /** Connects to an MQTT broker on the given port. */
  connect(port: number): Promise<void>;
  /** Disconnects from the broker gracefully. */
  disconnect(): Promise<void>;
  /** Publishes a string payload to the given topic. */
  publish(topic: string, payload: string): Promise<void>;
  /** Subscribes to a topic to receive messages. */
  subscribe(topic: string): Promise<void>;
  /**
   * Registers a handler for incoming messages.
   * Called once per message on any subscribed topic.
   */
  onMessage(handler: (topic: string, payload: string) => void): void;
}

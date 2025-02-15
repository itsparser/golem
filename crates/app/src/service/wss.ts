import { UniversalWebSocket } from "@/lib/tauri&web.ts";

export class WSS {
  private ws: UniversalWebSocket;

  private constructor(ws: UniversalWebSocket) {
    this.ws = ws;
  }

  static async getConnection(url: string): Promise<WSS> {
    return new WSS(await UniversalWebSocket.connect(url));
  }

  public send(data: never) {
    this.ws.send(data);
  }

  public close() {
    this.ws.close();
  }

  public onMessage(callback: (data: unknown) => void) {
    this.ws.onMessage(callback);
  }
}

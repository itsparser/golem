import { Service } from "@/service/client.ts";

export let API = new Service();

export function updateService(url: string) {
  API = new Service(url);
}

import {VersionedComponentId} from "@/types/component.ts";

export interface Api {
    createdAt?: string;
    draft: boolean;
    id: string;
    routes: RouteRequestData[];
    version: string;
    count?: number;
}

export interface Route {
    method: string;
    path: string;
    binding: {
        binding_type?: string;
        componentId: {
            componentId: string;
            version: number;
        };
        workerName: string;
        response: string;
        idempotency_key?: string,
        allow_origin?: string;
        allow_methods?: string;
        allow_headers?: string;
        expose_headers?: string;
        max_age?: number;
        allow_credentials?: boolean;
    };
}

export type HttpMethod =
    | "Get"
    | "Post"
    | "Put"
    | "Patch"
    | "Delete"
    | "Head"
    | "Options"
    | "Trace"
    | "Connect";

export type MethodPattern = "Get" | "Post" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "TRACE" | "CONNECT"
export type GatewayBindingType = "default" | "file-server" | "http-handler" | "cors-preflight"

export interface RouteRequestData {
    method: MethodPattern
    path: string
    binding: GatewayBindingData
    cors?: HttpCors
    security?: string
}

export interface GatewayBindingData {
    bindingType: GatewayBindingType
    componentId?: VersionedComponentId
    workerName?: string
    idempotencyKey?: string
    response?: string
}

export interface HttpCors {
    allowOrigin: string
    allowMethods: string
    allowHeaders: string
    exposeHeaders?: string
    maxAge?: number
    allowCredentials?: boolean
}

export interface HttpApiDefinitionRequest {
    id: string
    version: string
    security?: string[]
    routes: RouteRequestData[]
    draft: boolean
}
export interface Api {
    createdAt?: string;
    draft: boolean;
    id: string;
    routes: Route[];
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

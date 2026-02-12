import { z } from "zod";
import { badRequestResponse } from "@/lib/response";

export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T) {
    let json: unknown;
    try {
        json = await req.json();
    } catch {
        return { data: null, response: badRequestResponse("Invalid JSON body") };
    }

    const result = schema.safeParse(json);
    if (!result.success) {
        return { data: null, response: badRequestResponse(result.error.message) };
    }

    return { data: result.data, response: null };
}

export function parseQuery<T extends z.ZodTypeAny>(url: URL, schema: T) {
    const obj = Object.fromEntries(url.searchParams.entries());
    const result = schema.safeParse(obj);
    if (!result.success) {
        return { data: null, response: badRequestResponse(result.error.message) };
    }

    return { data: result.data, response: null };
}

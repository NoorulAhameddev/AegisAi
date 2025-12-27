export function shouldStoreMemory(message: string): {
    store: boolean;
    type?: "USER_FACT" | "PREFERENCE";
} {
    const lower = message.toLowerCase();

    if (
        lower.includes("remember that") ||
        lower.includes("note that") ||
        lower.includes("from now on")
    ) {
        return { store: true, type: "PREFERENCE" };
    }

    return { store: false };
}

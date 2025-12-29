export function sanitize(input: string) {
    return input.replace(/[<>]/g, "");
}

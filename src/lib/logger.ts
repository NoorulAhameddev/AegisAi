export function log(event: string, data?: any) {
    console.log(JSON.stringify({
        time: new Date().toISOString(),
        event,
        data,
    }));
}

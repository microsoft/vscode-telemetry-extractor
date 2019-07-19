export function logMessage(msg: string, silent = true) {
    if (!silent) {
        console.log(msg);
    }
}
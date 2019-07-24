export function logMessage(msg: string, silenceOutput = false) {
    if (!silenceOutput) {
        console.log(msg);
    }
}
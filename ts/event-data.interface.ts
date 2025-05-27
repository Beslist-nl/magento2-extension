export interface EventData {
    eventName: string,
    screenHeight?: number,
    screenWidth?: number,
    location: {
        protocol: string,
        host: string,
        path: string,
        query: string,
        hash: string,
        referrer: string,
    },
    context: {
        sessionStartReasons: string,
    }
}

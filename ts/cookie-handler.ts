export class CookieHandler {
    public static getCookie(name: string): string | undefined {
        const cookies = document.cookie ? document.cookie.split('; ') : [];

        for (const cookie of cookies) {
            const [cookieName, ...rest] = cookie.split('=');
            if (decodeURIComponent(cookieName) === name) {
                return decodeURIComponent(rest.join('='));
            }
        }

        return undefined;
    }

    public static setCookie(name: string, value: string, seconds?: number, path: string = '/', domain: string = window.location.hostname.split(/\./).slice(-2).join('.'), secure: string = 'secure', sameSite: string = 'lax') {
        let expires = '';
        if (seconds) {
            const date = new Date();
            date.setTime(date.getTime() + (seconds * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + value + expires + ';path=' + path + ';domain=' + domain + ';' + secure + ';samesite=' + sameSite;
    }
}

import * as settings from './cloudconfig';

export function get() {
    const { token } = settings._get();
    return token;
}
export function set(pat: string) {
    settings.add({ token: pat });
}
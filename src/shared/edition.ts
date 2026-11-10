// Which Shadow this is, fixed when it's built (see electron.vite.config.ts):
//  - the public edition (the installer people download) only answers through Shadow Cloud;
//  - the owner edition (`npm run dev`, `npm run dist:owner`) also keeps "use my own API keys".

declare const __SHADOW_OWNER__: boolean
declare const __SHADOW_CLOUD_URL__: string

export const IS_OWNER_EDITION: boolean = __SHADOW_OWNER__
/** The Shadow Cloud server, without a trailing slash. */
export const CLOUD_URL: string = __SHADOW_CLOUD_URL__.replace(/\/+$/, '')

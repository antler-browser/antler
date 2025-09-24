declare module 'base58-universal' {
  export function encode(input: Uint8Array): string;
  export function decode(input: string): Uint8Array;
}

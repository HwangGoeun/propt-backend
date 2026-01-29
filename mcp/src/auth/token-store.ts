import keytar from 'keytar';
import { Tokens } from '../types/tokens.types.js';

const SERVICE = 'propt-mcp';
const ACCOUNT = 'tokens';

let memoryTokens: Tokens | null = null;
let isGuestSession = false;

export class TokenStore {
  static async load(): Promise<Tokens | null> {
    if (isGuestSession && memoryTokens) {
      return memoryTokens;
    }

    try {
      const raw = await keytar.getPassword(SERVICE, ACCOUNT);

      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  }

  static async save(tokens: Tokens): Promise<void> {
    await keytar.setPassword(SERVICE, ACCOUNT, JSON.stringify(tokens));
  }

  static saveToMemory(tokens: Tokens): void {
    memoryTokens = tokens;
    isGuestSession = true;
  }

  static async clear(): Promise<void> {
    memoryTokens = null;
    isGuestSession = false;
    await keytar.deletePassword(SERVICE, ACCOUNT);
  }
}

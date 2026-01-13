import keytar from 'keytar';
import { Tokens } from '../types/tokens.types.js';

const SERVICE = 'propt-mcp';
const ACCOUNT = 'tokens';

export class TokenStore {
  static async load(): Promise<Tokens | null> {
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

  static async clear(): Promise<void> {
    await keytar.deletePassword(SERVICE, ACCOUNT);
  }
}

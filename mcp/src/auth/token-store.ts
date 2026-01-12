import fs from 'fs';
import os from 'os';
import path from 'path';
import { Tokens } from '../types/tokens.types';

const DIR = path.join(os.homedir(), '.propt');
const FILE = path.join(DIR, 'token.json');

export class TokenStore {
  static load(): Tokens | null {
    if (!fs.existsSync(FILE)) return null;

    try {
      return JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Tokens;
    } catch {
      return null;
    }
  }

  static save(tokens: Tokens) {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

    fs.writeFileSync(FILE, JSON.stringify(tokens, null, 2), 'utf-8');
  }

  static clear() {
    if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  }
}

import { Tokens } from '../types/tokens.types.js';
import { TokenStore } from './token-store.js';

export function setTokens(tokens: Tokens) {
  TokenStore.save(tokens);
}

/**
 * 微秒=>秒
 */
export function us2s(ts: number) {
  return ts / 1000000;
}

/**
 * 秒=>微秒
 */
export function s2us(ts: number) {
  return ts * 1000000;
}

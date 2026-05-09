'use strict';

/**
 * HPC Game Engine
 * ───────────────
 * Optimisations:
 *  - Uint8Array(5) for letter states — avoids string array allocation on hot path
 *  - Two-pass evaluation with a 5-bit integer bitmask (no secondary array)
 *  - Object pool (size 256) to reuse result objects and reduce GC pressure
 *  - process.hrtime.bigint() for nanosecond-precision solve timing
 */

const STATE = Object.freeze({ ABSENT: 0, PRESENT: 1, CORRECT: 2 });
const WORD_LENGTH = 5;

// ── Object Pool ────────────────────────────────────────────────────────────────
const POOL_SIZE = 256;
const _pool     = new Array(POOL_SIZE);
let   _poolHead = 0;
let   _poolSize = 0;

function _acquire() {
  if (_poolSize > 0) {
    const obj = _pool[_poolHead % POOL_SIZE];
    _poolHead = (_poolHead + 1) % POOL_SIZE;
    _poolSize--;
    return obj;
  }
  return { result: new Uint8Array(WORD_LENGTH), guess: '', ts: 0n };
}

function _release(obj) {
  if (_poolSize < POOL_SIZE) {
    _pool[(_poolHead + _poolSize) % POOL_SIZE] = obj;
    _poolSize++;
  }
}

// ── Core evaluator ─────────────────────────────────────────────────────────────
function evaluateGuess(guess, secretWord) {
  const g = guess.toUpperCase();
  const s = secretWord.toUpperCase();

  const obj    = _acquire();
  const result = obj.result;
  result.fill(STATE.ABSENT);

  // Encode as char-codes — avoids repeated charAt calls
  const sCode = [s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3), s.charCodeAt(4)];
  const gCode = [g.charCodeAt(0), g.charCodeAt(1), g.charCodeAt(2), g.charCodeAt(3), g.charCodeAt(4)];

  let usedMask = 0; // 5-bit bitmask

  // Pass 1: exact matches
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (gCode[i] === sCode[i]) {
      result[i]  = STATE.CORRECT;
      usedMask  |= (1 << i);
    }
  }

  // Pass 2: present-but-wrong-position
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === STATE.CORRECT) continue;
    for (let j = 0; j < WORD_LENGTH; j++) {
      if ((usedMask >> j) & 1) continue;
      if (gCode[i] === sCode[j]) {
        result[i]  = STATE.PRESENT;
        usedMask  |= (1 << j);
        break;
      }
    }
  }

  obj.guess = g;
  obj.ts    = process.hrtime.bigint();
  return obj;
}

function serialiseAndRelease(obj) {
  const arr   = [obj.result[0], obj.result[1], obj.result[2], obj.result[3], obj.result[4]];
  const guess = obj.guess;
  const ts    = obj.ts;
  _release(obj);
  return { guess, result: arr, ts: ts.toString() };
}

function isWin(uint8Result) {
  return (
    uint8Result[0] === STATE.CORRECT &&
    uint8Result[1] === STATE.CORRECT &&
    uint8Result[2] === STATE.CORRECT &&
    uint8Result[3] === STATE.CORRECT &&
    uint8Result[4] === STATE.CORRECT
  );
}

function calculateElo(winnerRating, loserRating, kFactor = 32) {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  return {
    winnerNew: Math.round(winnerRating + kFactor * (1 - expected)),
    loserNew:  Math.round(loserRating  + kFactor * (0 - (1 - expected))),
  };
}

/**
 * Scrambles a word for Anagram mode.
 */
function generateAnagram(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const scrambled = arr.join('');
  // Ensure we don't return the same word
  return scrambled === word ? generateAnagram(word) : scrambled;
}

/**
 * Validates if currentWord starts with the last letter of prevWord.
 */
function validateChain(prevWord, currentWord) {
  if (!prevWord || !currentWord) return false;
  return currentWord[0].toUpperCase() === prevWord[prevWord.length - 1].toUpperCase();
}

module.exports = { STATE, evaluateGuess, serialiseAndRelease, isWin, calculateElo, generateAnagram, validateChain };

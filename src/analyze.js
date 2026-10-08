const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const SENTENCE_END_PATTERN = /[.!?]+/g;

function compareWords(left, right) {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0));
  const rightPoints = Array.from(right, (character) => character.codePointAt(0));
  const sharedLength = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < sharedLength; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }
  return leftPoints.length - rightPoints.length;
}

function analyzeText(text) {
  const words = text.match(WORD_PATTERN) || [];
  const frequencies = new Map();

  for (const word of words) {
    const normalized = word.toLowerCase();
    frequencies.set(normalized, (frequencies.get(normalized) || 0) + 1);
  }

  const topWords = Array.from(frequencies, ([word, count]) => ({ word, count }))
    .sort((left, right) => right.count - left.count || compareWords(left.word, right.word))
    .slice(0, 10);

  return {
    characterCount: Array.from(text).length,
    wordCount: words.length,
    sentenceCount: (text.match(SENTENCE_END_PATTERN) || []).length,
    estimatedReadingTimeMinutes: Math.max(1, Math.ceil(words.length / 200)),
    topWords
  };
}

module.exports = { analyzeText };

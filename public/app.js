const form = document.getElementById('analyze-form');
const textInput = document.getElementById('text-input');
const clearButton = document.getElementById('clear-button');
const results = document.getElementById('results');
const errorPanel = document.getElementById('error');
const characterCount = document.getElementById('character-count');
const wordCount = document.getElementById('word-count');
const sentenceCount = document.getElementById('sentence-count');
const readingTime = document.getElementById('reading-time');
const topWords = document.getElementById('top-words');

function hideError() {
  errorPanel.classList.add('hidden');
  errorPanel.textContent = '';
}

function showError(message) {
  errorPanel.textContent = message;
  errorPanel.classList.remove('hidden');
}

function showResults(data) {
  characterCount.textContent = String(data.characterCount);
  wordCount.textContent = String(data.wordCount);
  sentenceCount.textContent = String(data.sentenceCount);
  readingTime.textContent = `${data.estimatedReadingTimeMinutes} min`;

  topWords.innerHTML = '';
  for (const item of data.topWords) {
    const row = document.createElement('li');
    row.textContent = `${item.word} (${item.count})`;
    topWords.appendChild(row);
  }

  results.classList.remove('hidden');
}

function reset() {
  textInput.value = '';
  hideError();
  results.classList.add('hidden');
  topWords.innerHTML = '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: textInput.value })
    });
    const payload = await response.json();

    if (!response.ok) {
      showError(payload?.error?.message || 'Unable to analyze text.');
      results.classList.add('hidden');
      return;
    }

    showResults(payload);
  } catch {
    showError('Network error. Please try again.');
    results.classList.add('hidden');
  }
});

clearButton.addEventListener('click', reset);

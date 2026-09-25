// ── Suite v2 Quotes ──

export const QUOTES = [
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
];

export const QUOTE_CATEGORIES: Record<string, { text: string; author: string }[]> = {
  General: QUOTES,
  "Bhagavad Gita": [
    { text: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.", author: "Bhagavad Gita 2.47" },
    { text: "The mind is restless and difficult to restrain, but it is subdued by practice.", author: "Bhagavad Gita 6.35" },
    { text: "A person can rise through the efforts of his own mind; or draw himself down, in the same manner.", author: "Bhagavad Gita 6.5" },
  ],
  Stoicism: [
    { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
    { text: "Waste no more time arguing what a good man should be. Be one.", author: "Marcus Aurelius" },
    { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
    { text: "Don't explain your philosophy. Embody it.", author: "Epictetus" },
  ],
  Buddhism: [
    { text: "The mind is everything. What you think you become.", author: "Buddha" },
    { text: "Peace comes from within. Do not seek it without.", author: "Buddha" },
    { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
  ],
  Motivation: [
    { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  ],
};

function quoteForDay(pool: { text: string; author: string }[]) {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return pool[dayOfYear % pool.length];
}

export function getQuoteForCategory(category: string | undefined) {
  return quoteForDay((category && QUOTE_CATEGORIES[category]) || QUOTES);
}

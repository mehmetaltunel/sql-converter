export async function copyText(text, btn, label = 'Kopyala') {
  await navigator.clipboard.writeText(text);
  btn.textContent = 'Kopyalandi';
  btn.classList.add('copied');
  setTimeout(() => {
    btn.textContent = label;
    btn.classList.remove('copied');
  }, 1500);
}

const PART_COUNT = 16;
const root = document.querySelector("#root");

function tagResultScreen() {
  const reportTitle = [...document.querySelectorAll("h2")]
    .find((element) => element.textContent.trim() === "霉运清除报告");
  if (!reportTitle) return;

  const card = reportTitle.closest(".max-w-sm");
  const shell = card?.parentElement;
  if (!card || !shell || shell.classList.contains("result-shell")) return;

  shell.classList.add("result-shell");
  card.classList.add("result-card");
  card.nextElementSibling?.classList.add("result-actions");
  card.nextElementSibling?.nextElementSibling?.classList.add("result-footer");
}

const observer = new MutationObserver(tagResultScreen);
observer.observe(root, { childList: true, subtree: true });

try {
  const chunkUrls = Array.from(
    { length: PART_COUNT },
    (_, index) => new URL(`./chunks/part-${String(index).padStart(2, "0")}.txt?v=fix-2`, import.meta.url),
  );
  const responses = await Promise.all(chunkUrls.map((url) => fetch(url)));
  const failed = responses.find((response) => !response.ok);
  if (failed) throw new Error(`无法读取原版程序片段：${failed.status}`);
  const source = (await Promise.all(responses.map((response) => response.text()))).join("");
  (0, eval)(`${source}\n//# sourceURL=cut-moldy-tofu-original.js`);
  tagResultScreen();
} catch (error) {
  console.error(error);
  root.innerHTML = `
    <main class="replica-load-error">
      <strong>页面加载失败</strong>
      <span>请刷新页面后重试</span>
    </main>
  `;
}

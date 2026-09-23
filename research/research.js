(() => {
  "use strict";

  const toolbar = document.querySelector(".research-toolbar");
  if (!toolbar) return;

  const buttons = [...toolbar.querySelectorAll("[data-filter]")];
  const sections = [...document.querySelectorAll("[data-work-section]")];
  const status = toolbar.querySelector(".filter-status");
  let selected = "all";

  const updateStatus = () => {
    const count = sections
      .filter((section) => !section.hidden)
      .reduce((total, section) => total + section.querySelectorAll(".work-card").length, 0);
    const english = document.documentElement.lang.startsWith("en");
    status.textContent = english ? `${count} example works shown` : `正在展示 ${count} 条示例成果`;
  };

  const filter = (kind) => {
    selected = kind;
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === selected)));
    sections.forEach((section) => { section.hidden = selected !== "all" && section.dataset.workSection !== selected; });
    updateStatus();
  };

  buttons.forEach((button) => {
    button.setAttribute("aria-controls", sections.map((section) => section.id).join(" "));
    button.addEventListener("click", () => filter(button.dataset.filter));
  });

  // A direct fragment link must stay reachable even after a section was filtered out.
  const revealFragment = () => {
    const target = document.getElementById(window.location.hash.slice(1));
    const section = target?.closest("[data-work-section]");
    if (section?.hidden) {
      filter("all");
      target.scrollIntoView();
    }
  };
  window.addEventListener("hashchange", revealFragment);
  new MutationObserver(updateStatus).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  toolbar.hidden = false;
  filter("all");
})();

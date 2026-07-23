(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-button");
  const mobileMenu = document.querySelector(".mobile-menu");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const langButtons = [...document.querySelectorAll(".lang-button")];
  const translatable = [...document.querySelectorAll("[data-zh][data-en]")];
  const insightText = document.querySelector("#insight-text");
  const insightIndex = document.querySelector("#insight-index");
  const insightRefresh = document.querySelector("#insight-refresh");

  const insights = [
    {
      zh: "深度学习的价值，不只是拟合数据，更是学习可迁移的表示。",
      en: "Deep learning is not only about fitting data, but learning representations that transfer."
    },
    {
      zh: "注意力机制学习的是上下文中的相关性权重，它本身并不等同于理解。",
      en: "Attention learns relevance weights in context; attention alone is not the same as understanding."
    },
    {
      zh: "泛化能力来自数据多样性、归纳偏置与正则化，而不只是更低的训练误差。",
      en: "Generalization comes from diverse data, inductive bias, and regularization—not training loss alone."
    },
    {
      zh: "反向传播用链式法则分配误差信号，让每个参数知道应当如何改变。",
      en: "Backpropagation uses the chain rule to assign credit and tell each parameter how to change."
    },
    {
      zh: "自监督学习从数据自身构造监督信号，把海量未标注样本变成训练资源。",
      en: "Self-supervised learning builds supervision from the data itself, turning unlabeled samples into training signal."
    },
    {
      zh: "扩散模型通过反复学习去噪，逐步逼近复杂数据分布的生成过程。",
      en: "Diffusion models learn iterative denoising to approximate the generative process of complex data."
    },
    {
      zh: "潜空间压缩表面细节，试图保留真正决定数据变化的核心因素。",
      en: "A latent space compresses surface detail while preserving the factors that explain meaningful variation."
    },
    {
      zh: "世界模型学习动作可能带来的后果，让智能体能够在想象中先规划、再行动。",
      en: "World models predict the consequences of actions, allowing agents to plan in imagination before acting."
    },
    {
      zh: "VLA 模型把视觉观察与语言意图对齐，再将它们映射为连续动作。",
      en: "VLA models align visual observations with language intent, then map both into continuous actions."
    },
    {
      zh: "过拟合不是模型记得太多，而是它学到的规律无法稳定延伸到未见数据。",
      en: "Overfitting means the learned rules fail to extend reliably to unseen data."
    },
    {
      zh: "规模定律揭示性能随算力、数据和参数可预测提升，但数据质量仍决定上限。",
      en: "Scaling laws predict gains from compute, data, and parameters, while data quality still sets the ceiling."
    },
    {
      zh: "三维重建需要同时解释几何、外观与遮挡，并处理二维观察中的不确定性。",
      en: "3D reconstruction must explain geometry, appearance, and occlusion under uncertain 2D observations."
    }
  ];

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); }
      catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); }
      catch { /* The page still works when storage is unavailable. */ }
    }
  };

  let currentInsightIndex = 0;

  const chooseInsight = () => {
    const previous = Number.parseInt(storage.get("sjing-last-insight"), 10);
    let next = Math.floor(Math.random() * insights.length);

    if (insights.length > 1 && Number.isInteger(previous)) {
      while (next === previous) next = Math.floor(Math.random() * insights.length);
    }

    currentInsightIndex = next;
    storage.set("sjing-last-insight", String(next));
  };

  const renderInsight = (lang, animate = false) => {
    const update = () => {
      insightText.textContent = insights[currentInsightIndex][lang];
      insightIndex.textContent = `${String(currentInsightIndex + 1).padStart(2, "0")} / ${String(insights.length).padStart(2, "0")}`;
      insightText.classList.remove("changing");
    };

    if (animate && !reduceMotion) {
      insightText.classList.add("changing");
      window.setTimeout(update, 180);
    } else {
      update();
    }
  };

  chooseInsight();

  const languageMeta = {
    zh: {
      htmlLang: "zh-CN",
      title: "SJing · 个人主页",
      description: "SJing 的个人学术主页与双语在线简历，关注 VLA、世界模型、生成式模型与三维重建。",
      menuOpen: "打开菜单",
      menuClose: "关闭菜单"
    },
    en: {
      htmlLang: "en",
      title: "SJing · Portfolio",
      description: "SJing's bilingual academic portfolio, exploring VLA, world models, generative AI, and 3D reconstruction.",
      menuOpen: "Open menu",
      menuClose: "Close menu"
    }
  };

  const applyLanguage = (lang) => {
    const safeLang = lang === "en" ? "en" : "zh";
    const meta = languageMeta[safeLang];

    translatable.forEach((element) => {
      element.textContent = element.dataset[safeLang];
    });

    langButtons.forEach((button) => {
      const active = button.dataset.lang === safeLang;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    root.lang = meta.htmlLang;
    document.title = meta.title;
    document.querySelector('meta[name="description"]').content = meta.description;
    menuButton.setAttribute("aria-label", mobileMenu.classList.contains("open") ? meta.menuClose : meta.menuOpen);
    storage.set("sjing-language", safeLang);
    renderInsight(safeLang);
  };

  langButtons.forEach((button) => {
    button.addEventListener("click", () => applyLanguage(button.dataset.lang));
  });

  insightRefresh.addEventListener("click", () => {
    chooseInsight();
    renderInsight(root.lang.startsWith("en") ? "en" : "zh", true);
  });

  const savedLanguage = storage.get("sjing-language");
  applyLanguage(savedLanguage === "en" ? "en" : "zh");

  const copyButton = document.querySelector("#copy-email");
  const copyLabel = copyButton.querySelector(".copy-label");
  const copyFeedback = document.querySelector("#copy-feedback");

  const copyEmail = async () => {
    const email = copyButton.dataset.email;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email);
      } else {
        const helper = document.createElement("textarea");
        helper.value = email;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }

      const english = root.lang.startsWith("en");
      copyButton.classList.add("copied");
      copyLabel.textContent = english ? "Copied" : "已复制";
      copyFeedback.textContent = english ? "Email copied to clipboard." : "邮箱已复制到剪贴板。";
      window.setTimeout(() => {
        copyButton.classList.remove("copied");
        copyLabel.textContent = copyLabel.dataset[english ? "en" : "zh"];
        copyFeedback.textContent = "";
      }, 1600);
    } catch {
      copyFeedback.textContent = root.lang.startsWith("en") ? "Please copy the email manually." : "复制失败，请手动复制邮箱。";
    }
  };

  copyButton.addEventListener("click", copyEmail);

  const setMenu = (open) => {
    mobileMenu.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    menuButton.setAttribute("aria-expanded", String(open));
    const currentLang = root.lang.startsWith("en") ? "en" : "zh";
    menuButton.setAttribute("aria-label", open ? languageMeta[currentLang].menuClose : languageMeta[currentLang].menuOpen);
  };

  menuButton.addEventListener("click", () => setMenu(!mobileMenu.classList.contains("open")));
  mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  const handleScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 28);
  };

  handleScroll();
  window.addEventListener("scroll", handleScroll, { passive: true });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -30px" });

  document.querySelectorAll(".reveal").forEach((element) => {
    if (reduceMotion) element.classList.add("visible");
    else revealObserver.observe(element);
  });

  const sectionLinks = [...document.querySelectorAll(".desktop-nav .nav-link")];
  const sectionTargets = [...document.querySelectorAll("main section[id]")];
  const spyObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;

    sectionLinks.forEach((link) => {
      const target = link.getAttribute("href").slice(1);
      link.classList.toggle("active", target === visible.target.id);
    });
  }, { rootMargin: "-25% 0px -60% 0px", threshold: [0, .2, .6] });

  sectionTargets.forEach((section) => spyObserver.observe(section));

  const glow = document.querySelector(".cursor-glow");
  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", (event) => {
      glow.style.opacity = "1";
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", () => { glow.style.opacity = "0"; });
  }

  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const rotateY = ((event.clientX - rect.left) / rect.width - .5) * 4;
        const rotateX = ((event.clientY - rect.top) / rect.height - .5) * -4;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  const hero = document.querySelector(".hero");
  hero.addEventListener("pointerdown", (event) => {
    if (reduceMotion || event.target.closest("a, button")) return;
    const colors = ["#78e0d7", "#ff8878", "#f2c66d", "#ffffff"];
    for (let i = 0; i < 7; i += 1) {
      const spark = document.createElement("i");
      const angle = (Math.PI * 2 * i) / 7 + Math.random() * .25;
      const distance = 28 + Math.random() * 38;
      spark.className = "click-spark";
      spark.style.left = `${event.clientX}px`;
      spark.style.top = `${event.clientY}px`;
      spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
      spark.style.setProperty("--spark-color", colors[i % colors.length]);
      document.body.appendChild(spark);
      spark.addEventListener("animationend", () => spark.remove(), { once: true });
    }
  });

  const initStarCanvas = () => {
    const canvas = document.querySelector("#star-canvas");
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let stars = [];
    let pointerX = .5;
    let pointerY = .5;
    let animationId;

    const makeStars = () => {
      const count = Math.min(130, Math.max(45, Math.floor(width / 12)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * .82,
        radius: Math.random() * 1.45 + .25,
        alpha: Math.random() * .65 + .2,
        speed: Math.random() * .012 + .004,
        phase: Math.random() * Math.PI * 2,
        depth: Math.random() * .8 + .2
      }));
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.8);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      makeStars();
    };

    const draw = (time) => {
      context.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        const shimmer = .55 + Math.sin(time * star.speed + star.phase) * .45;
        const offsetX = (pointerX - .5) * 16 * star.depth;
        const offsetY = (pointerY - .5) * 10 * star.depth;
        context.beginPath();
        context.arc(star.x + offsetX, star.y + offsetY, star.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(224, 253, 255, ${star.alpha * shimmer})`;
        context.fill();
      });
      animationId = requestAnimationFrame(draw);
    };

    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width;
      pointerY = (event.clientY - rect.top) / rect.height;
    }, { passive: true });

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (!reduceMotion) animationId = requestAnimationFrame(draw);
    else draw(0);

    document.addEventListener("visibilitychange", () => {
      if (reduceMotion) return;
      if (document.hidden) cancelAnimationFrame(animationId);
      else animationId = requestAnimationFrame(draw);
    });
  };

  const initWaveCanvas = () => {
    const canvas = document.querySelector("#wave-canvas");
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let animationId;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.8);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const drawWave = (time, baseline, amplitude, length, color, speed) => {
      context.beginPath();
      context.moveTo(0, height);
      context.lineTo(0, baseline);
      for (let x = 0; x <= width; x += 7) {
        const y = baseline
          + Math.sin((x / length) + time * speed) * amplitude
          + Math.sin((x / (length * .47)) - time * speed * .7) * amplitude * .22;
        context.lineTo(x, y);
      }
      context.lineTo(width, height);
      context.closePath();
      context.fillStyle = color;
      context.fill();
    };

    const draw = (timestamp) => {
      const time = timestamp * .001;
      context.clearRect(0, 0, width, height);
      drawWave(time, height * .48, 13, 105, "rgba(20, 109, 125, .28)", .7);
      drawWave(time, height * .61, 16, 130, "rgba(9, 77, 98, .42)", .5);
      drawWave(time, height * .75, 10, 84, "rgba(4, 45, 66, .78)", .8);
      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (!reduceMotion) animationId = requestAnimationFrame(draw);
    else draw(0);

    document.addEventListener("visibilitychange", () => {
      if (reduceMotion) return;
      if (document.hidden) cancelAnimationFrame(animationId);
      else animationId = requestAnimationFrame(draw);
    });
  };

  document.querySelector("#current-year").textContent = String(new Date().getFullYear());
  initStarCanvas();
  initWaveCanvas();
})();

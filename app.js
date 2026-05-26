/* =========================================================
   Copyright (c) 2025–2026 David Nguyen. All rights reserved.
   Author: David Nguyen (nguyenvangialuan@gmail.com)
   Unauthorized copying or distribution is strictly prohibited.
   =========================================================
   Portfolio interactions
   - Custom cursor with lerp
   - Scroll-triggered reveals (IntersectionObserver)
   - Parallax engine (data-parallax="<speed>")
   - Live clock
   - Footer year
   ========================================================= */

(() => {
  "use strict";

  /* ---------- Stats widget: hide while scrolling, pop in when stopped ---------- */
  const statsWidget = document.querySelector(".stats-widget");
  if (statsWidget) {
    let scrollTimer = null;

    const updateWidgetPosition = () => {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const nearBottom = max > 0 && (scrolled / max) > 0.75;
      statsWidget.classList.toggle("is-bottom", nearBottom);
    };

    window.addEventListener("scroll", () => {
      updateWidgetPosition();
      statsWidget.classList.remove("is-pop");
      statsWidget.classList.add("is-hidden");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        statsWidget.classList.remove("is-hidden");
        void statsWidget.offsetWidth;
        statsWidget.classList.add("is-pop");
      }, 250);
    }, { passive: true });

    updateWidgetPosition();
  }

  /* ---------- Scroll restore: top → saved position ---------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  window.addEventListener("load", () => {
    const saved = parseInt(sessionStorage.getItem("scrollY") || "0", 10);
    if (saved > 0) {
      document.documentElement.classList.add("smooth-scroll");
      window.scrollTo({ top: saved, behavior: "smooth" });
      setTimeout(() => document.documentElement.classList.remove("smooth-scroll"), 1500);
    }
    sessionStorage.removeItem("scrollY");
  });

  window.addEventListener("pagehide", () => {
    sessionStorage.setItem("scrollY", window.scrollY);
  });

  // Smooth scroll only on anchor clicks
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", () => {
      document.documentElement.classList.add("smooth-scroll");
      setTimeout(() => document.documentElement.classList.remove("smooth-scroll"), 800);
    });
  });

  /* ---------- Custom cursor ---------- */
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;

  if (cursor && dot && !isCoarse) {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    }, { passive: true });

    const lerp = (a, b, n) => (1 - n) * a + n * b;
    const tick = () => {
      ringX = lerp(ringX, mouseX, 0.18);
      ringY = lerp(ringY, mouseY, 0.18);
      cursor.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Hover states from data-cursor attribute
    const hoverables = document.querySelectorAll("[data-cursor]");
    hoverables.forEach((el) => {
      const kind = el.getAttribute("data-cursor");
      el.addEventListener("mouseenter", () => {
        cursor.classList.add("is-link");
        if (kind === "view") cursor.classList.add("is-view");
      });
      el.addEventListener("mouseleave", () => {
        cursor.classList.remove("is-link", "is-view");
      });
    });

    // Hide cursor when leaving viewport
    document.addEventListener("mouseleave", () => {
      cursor.style.opacity = "0";
      dot.style.opacity = "0";
    });
    document.addEventListener("mouseenter", () => {
      cursor.style.opacity = "1";
      dot.style.opacity = "1";
    });
  }

  /* ---------- Scroll-triggered reveals ---------- */
  const animated = document.querySelectorAll("[data-animate]");
  const heroTitle = document.querySelector(".hero__title");
  const contactTitle = document.querySelector(".contact__title");

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
  );
  animated.forEach((el) => io.observe(el));

  // Hero title — split chars first, then trigger slide-in. Reveal overflow after transition.
  if (heroTitle) {
    requestAnimationFrame(() => {
      splitHeroChars();
      heroTitle.classList.add("is-in");
      setTimeout(() => {
        heroTitle.querySelectorAll(".line").forEach(l => l.style.overflow = "visible");
      }, 1100);
    });
  }
  // Contact title uses the observer pattern too
  if (contactTitle) io.observe(contactTitle);

  /* ---------- Live clock ---------- */
  const clock = document.getElementById("clock");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "America/New_York",
    });
    const tickClock = () => { clock.textContent = `${fmt.format(new Date())} ET`; };
    tickClock();
    setInterval(tickClock, 1000 * 30);
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Dock-style magnification on nav links ---------- */
  // Each link scales up based on how close the cursor is to its horizontal
  // center, with a smoothstep falloff (like the macOS Dock).
  const navLinkRow = document.querySelector(".nav__links");
  const navLinkEls = document.querySelectorAll(".nav__links a");

  if (navLinkRow && navLinkEls.length && !isCoarse) {
    const MAX_SCALE = 1.45;
    const RADIUS = 110;     // px from cursor at which a link starts to grow
    let centers = [];

    const measureNav = () => {
      centers = Array.from(navLinkEls).map((el) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
      });
    };

    let navRaf = 0;
    const applyMag = (mouseX) => {
      if (navRaf) return;
      navRaf = requestAnimationFrame(() => {
        navLinkEls.forEach((el, i) => {
          const dist = Math.abs(mouseX - centers[i]);
          if (dist >= RADIUS) {
            el.style.transform = "";
            return;
          }
          // Smoothstep: easeInOut(t) where t = 1 - dist/radius
          const t = 1 - dist / RADIUS;
          const eased = t * t * (3 - 2 * t);
          const scale = 1 + eased * (MAX_SCALE - 1);
          el.style.transform = `scale(${scale.toFixed(3)})`;
        });
        navRaf = 0;
      });
    };

    measureNav();
    window.addEventListener("resize", measureNav, { passive: true });

    navLinkRow.addEventListener("mousemove", (e) => applyMag(e.clientX), {
      passive: true,
    });
    navLinkRow.addEventListener("mouseleave", () => {
      navLinkEls.forEach((el) => (el.style.transform = ""));
    });
  }

  /* ---------- Hero title character bounce ---------- */
  const splitHeroChars = () => {
    const lineInners = document.querySelectorAll(".hero__title .hero__line-inner");
    let charIdx = 0;
    let wordIdx = 0;
    lineInners.forEach(inner => {
      const nodes = Array.from(inner.childNodes);
      inner.innerHTML = "";
      nodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const tokens = node.textContent.split(/(\s+)/);
          tokens.forEach(token => {
            if (!token) return;
            if (/^\s+$/.test(token)) {
              inner.appendChild(document.createTextNode(token));
            } else {
              const wordSpan = document.createElement("span");
              wordSpan.className = "hero__word";
              // Fade-in is word-by-word: all chars in a word share the same delay
              const fadeDelay = (wordIdx * 0.14).toFixed(3);
              wordIdx++;
              [...token].forEach(char => {
                const s = document.createElement("span");
                s.className = "hero__char";
                s.textContent = char;
                const bounceDelay = (2.2 + charIdx * 0.055).toFixed(3);
                s.style.setProperty("--char-fade-delay",   fadeDelay + "s");
                s.style.setProperty("--char-bounce-delay", bounceDelay + "s");
                charIdx++;
                wordSpan.appendChild(s);
              });
              inner.appendChild(wordSpan);
            }
          });
        } else {
          // Element node like <em> — counts as one word
          const w = document.createElement("span");
          w.className = "hero__char";
          const fadeDelay   = (wordIdx * 0.14).toFixed(3);
          const bounceDelay = (2.2 + charIdx * 0.055).toFixed(3);
          w.style.setProperty("--char-fade-delay",   fadeDelay + "s");
          w.style.setProperty("--char-bounce-delay", bounceDelay + "s");
          w.appendChild(node);
          wordIdx++;
          charIdx++;
          inner.appendChild(w);
        }
      });
    });
  };

  /* ---------- Language toggle (EN ↔ VI) ---------- */
  const langToggle = document.querySelector(".lang-toggle");
  const langLabel  = document.querySelector(".lang-toggle__label");

  const TRANSLATIONS = {
    en: {
      navCta:       "Collaboration",
      navWork:      "Work",
      navAbout:     "About",
      navStack:     "Stack",
      navContact:   "Contact",
      heroLine1:    "Back‑end Developer <em>&amp;</em>",
      heroLine2:    "Quality Assurance",
      heroLede1:    "I’m <strong>David Nguyen</strong> — a software developer focused on <em>back‑end development, quality assurance, and reliable software systems</em>. I build and test applications using <em>Java, Python</em>, debugging, system integration, and clean object‑oriented design — with a focus on catching <em>edge cases</em> and improving real‑world behavior.",
      heroLede2:    "I’m also interested in <em>practical AI applications</em>, including machine learning, machine vision, and using AI tools to solve real software problems.",
      heroCta1:     "See selected work",
      heroCta2:     "Get in touch",
      heroScroll:   "Scroll",
      workNum:      "01 — Selected Work",
      workTitle:    "Things I’ve <em>built</em> so far.",
      workSub:      "A handful of projects from the last few years. Hover for details.",
      workDesc1:    `IEEE‑style research on LLM security &amp; defenses — six case studies on phishing detection, scam URL analysis, and secure code generation.<span class="work__meta"><span class="work__meta-row"><b>Role</b> Developer / Documentation Lead</span><span class="work__meta-row"><b>Focus</b> LLM security, AI defenses, secure code generation</span></span>`,
      workDesc2:    `Interactive Java ordering system with a full GUI — manages customers, orders, payments, receipts, and delivery addresses end‑to‑end.<span class="work__meta"><span class="work__meta-row"><b>Role</b> Developer</span><span class="work__meta-row"><b>Focus</b> Java, OOP, GUI, backend logic, data validation</span></span>`,
      workDesc3:    `Low‑level programs written in x86 assembly — practical exploration of registers, memory addressing, and control flow at the hardware level.<span class="work__meta"><span class="work__meta-row"><b>Role</b> Developer</span><span class="work__meta-row"><b>Focus</b> x86, low‑level systems, memory, control flow</span></span>`,
      workDesc4:    `Turn‑based Java console game — player vs. AI dice combat with difficulty scaling, player health, and randomized mechanics.<span class="work__meta"><span class="work__meta-row"><b>Role</b> Developer</span><span class="work__meta-row"><b>Focus</b> Java, OOP, game logic, AI behavior, testing</span></span>`,
      workDesc5:    `Java coursework game built end‑to‑end — early OOP project focused on class design, encapsulation, and game state management.<span class="work__meta"><span class="work__meta-row"><b>Role</b> Developer</span><span class="work__meta-row"><b>Focus</b> Java, OOP, class design, game state, QA</span></span>`,
      aboutNum:     "02 — About",
      aboutTitle:   "A short <em>introduction</em>.",
      stackNum:     "03 — Stack",
      stackTitle:   "Tools I <em>reach for</em>.",
      contactNum:   "04 — Contact",
      contactLine1: "Have a project",
      contactLine2: "in mind? <em>Let’s talk.</em>",
      aboutP1:      `<span class="para__gem" aria-hidden="true">◆</span> I’m a Computer Science graduate from <strong>Kennesaw State University</strong> with hands‑on experience in <em>Java application development, quality assurance, POS system integration, and software testing</em>. I treat QA as part of the development process — not an afterthought.`,
      aboutP2:      `<span class="para__gem" aria-hidden="true">◆</span> My background includes diagnosing software issues, testing integrations before release, identifying defects, and working with developers to improve production software. I enjoy <em>solving problems, building reliable systems</em>, and learning how technology can improve real‑world workflows.`,
      aboutP3:      `<span class="para__gem" aria-hidden="true">◆</span> Outside of tech, I enjoy traveling, playing pickleball, spending time with family, and exploring <em>AI‑powered trading tools</em>. I’m proactive, team‑oriented, and always looking for ways to learn, improve, and bring positive energy to the people I work with.`,
      factStatus:   "Status",   factStatusVal:  "Open to Software Developer / QA‑focused roles",
      factEdu:      "Edu",      factEduVal:     "B.S. Computer Science · KSU · Honors Scholar · 3.9 GPA",
      stackTitles:  ["Languages", "Backend & Database", "Concepts", "Tools", "Testing & QA"],
      factFocus:    "Focus",    factFocusVal:   "Back‑end Development · QA · AI · Java · Python",
      factLocation: "Location", factLocationVal:"Atlanta, GA",
    },
    vi: {
      navCta:       "Hợp tác",
      navWork:      "Dự án",
      navAbout:     "Giới thiệu",
      navStack:     "Công nghệ",
      navContact:   "Liên hệ",
      heroLine1:    "Lập trình viên Back‑end <em>&amp;</em>",
      heroLine2:    "Kiểm thử chất lượng",
      heroLede1:    "Tôi là <strong>David Nguyen</strong> — lập trình viên phần mềm với chuyên môn về <em>phát triển back‑end, kiểm thử chất lượng và hệ thống phần mềm đáng tin cậy</em>. Tôi xây dựng và kiểm thử ứng dụng bằng <em>Java, Python</em>, gỡ lỗi, tích hợp hệ thống và thiết kế hướng đối tượng — tập trung vào các <em>edge case</em> và cải thiện hành vi ứng dụng thực tế.",
      heroLede2:    "Tôi cũng quan tâm đến <em>ứng dụng AI thực tế</em>, bao gồm học máy, thị giác máy móc và sử dụng công cụ AI để giải quyết vấn đề phần mềm.",
      heroCta1:     "Xem dự án",
      heroCta2:     "Liên hệ ngay",
      heroScroll:   "Cuộn xuống",
      workNum:      "01 — Dự án",
      workTitle:    "Những thứ tôi đã <em>xây dựng</em>.",
      workSub:      "Một số dự án trong những năm gần đây. Hover để xem chi tiết.",
      workDesc1:    `Nghiên cứu theo chuẩn IEEE về bảo mật LLM &amp; phòng thủ — sáu case study về phát hiện phishing, phân tích URL lừa đảo và tạo mã bảo mật.<span class="work__meta"><span class="work__meta-row"><b>Vai trò</b> Lập trình viên / Phụ trách tài liệu</span><span class="work__meta-row"><b>Tập trung</b> Bảo mật LLM, phòng thủ AI, tạo mã bảo mật</span></span>`,
      workDesc2:    `Hệ thống đặt hàng Java tương tác với giao diện đầy đủ — quản lý khách hàng, đơn hàng, thanh toán, hóa đơn và địa chỉ giao hàng toàn diện.<span class="work__meta"><span class="work__meta-row"><b>Vai trò</b> Lập trình viên</span><span class="work__meta-row"><b>Tập trung</b> Java, OOP, GUI, logic backend, kiểm tra dữ liệu</span></span>`,
      workDesc3:    `Chương trình cấp thấp viết bằng x86 assembly — khám phá thực tế về thanh ghi, địa chỉ bộ nhớ và luồng điều khiển ở cấp phần cứng.<span class="work__meta"><span class="work__meta-row"><b>Vai trò</b> Lập trình viên</span><span class="work__meta-row"><b>Tập trung</b> x86, hệ thống cấp thấp, bộ nhớ, luồng điều khiển</span></span>`,
      workDesc4:    `Trò chơi console Java theo lượt — người chơi đấu với AI xúc xắc, có điều chỉnh độ khó, máu người chơi và cơ chế ngẫu nhiên.<span class="work__meta"><span class="work__meta-row"><b>Vai trò</b> Lập trình viên</span><span class="work__meta-row"><b>Tập trung</b> Java, OOP, logic trò chơi, hành vi AI, kiểm thử</span></span>`,
      workDesc5:    `Trò chơi Java xây dựng từ đầu đến cuối — dự án OOP ban đầu tập trung vào thiết kế lớp, đóng gói và quản lý trạng thái trò chơi.<span class="work__meta"><span class="work__meta-row"><b>Vai trò</b> Lập trình viên</span><span class="work__meta-row"><b>Tập trung</b> Java, OOP, thiết kế lớp, trạng thái trò chơi, QA</span></span>`,
      aboutNum:     "02 — Giới thiệu",
      aboutTitle:   "Giới thiệu <em>ngắn gọn</em>.",
      stackNum:     "03 — Công nghệ",
      stackTitle:   "Công cụ tôi <em>hay dùng</em>.",
      contactNum:   "04 — Liên hệ",
      contactLine1: "Có dự án",
      contactLine2: "trong đầu? <em>Hãy nói chuyện.</em>",
      aboutP1:      `<span class="para__gem" aria-hidden="true">◆</span> Tôi là cử nhân Khoa học Máy tính từ <strong>Kennesaw State University</strong> với kinh nghiệm thực tế về <em>lập trình Java, kiểm thử chất lượng, tích hợp hệ thống POS và kiểm thử phần mềm</em>. Tôi xem QA là một phần của quá trình phát triển — không phải bước bổ sung.`,
      aboutP2:      `<span class="para__gem" aria-hidden="true">◆</span> Kinh nghiệm của tôi bao gồm chẩn đoán lỗi phần mềm, kiểm thử tích hợp trước khi phát hành, xác định lỗi và làm việc cùng lập trình viên để cải thiện sản phẩm. Tôi thích <em>giải quyết vấn đề, xây dựng hệ thống đáng tin cậy</em> và khám phá cách công nghệ cải thiện quy trình thực tế.`,
      aboutP3:      `<span class="para__gem" aria-hidden="true">◆</span> Ngoài công việc, tôi thích du lịch, chơi pickleball, dành thời gian cùng gia đình và khám phá <em>công cụ giao dịch AI</em>. Tôi chủ động, làm việc nhóm tốt và luôn tìm cách học hỏi, phát triển và mang lại năng lượng tích cực.`,
      factStatus:   "Trạng thái", factStatusVal:  "Sẵn sàng cho vị trí Lập trình viên / Kiểm thử chất lượng",
      factEdu:      "Học vấn",    factEduVal:     "Cử nhân KHMT · KSU · Sinh viên Danh dự · GPA 3.9",
      stackTitles:  ["Ngôn ngữ", "Backend & Cơ sở dữ liệu", "Khái niệm", "Công cụ", "Kiểm thử & QA"],
      factFocus:    "Chuyên môn", factFocusVal:   "Back‑end · QA · AI · Java · Python",
      factLocation: "Vị trí",    factLocationVal:"Atlanta, GA",
    },
  };

  const applyLang = (lang) => {
    const t  = TRANSLATIONS[lang];
    const $  = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const set = (el, html) => { if (el) el.innerHTML = html; };
    const setText = (el, text) => { if (el) el.textContent = text; };

    // Nav CTA + nav links + mobile menu links
    setText($(".nav__cta-text"), t.navCta);
    const navLabels = $$(".nav__label");
    const labelKeys = [t.navWork, t.navAbout, t.navStack, t.navContact];
    navLabels.forEach((el, i) => { if (labelKeys[i % 4] !== undefined) el.textContent = labelKeys[i % 4]; });

    // Hero title
    const lineInners = $$(".hero__title .hero__line-inner");
    set(lineInners[0], t.heroLine1);
    set(lineInners[1], t.heroLine2);
    splitHeroChars();

    // Hero lede — strip gem spans, replace text only
    const ledes = $$(".hero__lede");
    if (ledes[0]) ledes[0].innerHTML = t.heroLede1;
    if (ledes[1]) ledes[1].innerHTML = t.heroLede2;

    // Hero CTA buttons
    $$(".btn-text").forEach((el, i) => {
      el.textContent = i === 0 ? t.heroCta1 : t.heroCta2;
    });

    // Hero scroll
    setText($(".hero__scroll-label"), t.heroScroll);

    // Stack column titles
    $$(".stack__col h3").forEach((h3, i) => {
      if (t.stackTitles[i]) h3.textContent = t.stackTitles[i];
    });

    // Work section subtitle + descriptions
    const workSub = $(".section__sub");
    if (workSub) workSub.textContent = t.workSub;
    const workDescs = $$(".work__desc");
    [t.workDesc1, t.workDesc2, t.workDesc3, t.workDesc4, t.workDesc5].forEach((html, i) => {
      if (workDescs[i]) workDescs[i].innerHTML = html;
    });

    // Section nums (work, about, stack, contact)
    const nums = $$(".section__num");
    if (nums[0]) nums[0].textContent = t.workNum;
    if (nums[1]) nums[1].textContent = t.aboutNum;
    if (nums[2]) nums[2].textContent = t.stackNum;
    if (nums[3]) nums[3].textContent = t.contactNum;

    // Section titles (work, about, stack)
    const titles = $$(".section__title");
    if (titles[0]) titles[0].innerHTML = t.workTitle;
    if (titles[1]) titles[1].innerHTML = t.aboutTitle;
    if (titles[2]) titles[2].innerHTML = t.stackTitle;

    // About paragraphs
    const aboutPs = $$(".about__body p");
    if (aboutPs[0]) aboutPs[0].innerHTML = t.aboutP1;
    if (aboutPs[1]) aboutPs[1].innerHTML = t.aboutP2;
    if (aboutPs[2]) aboutPs[2].innerHTML = t.aboutP3;

    // Facts
    const factDivs = $$(".facts div");
    const factMap = [
      [t.factStatus, t.factStatusVal],
      [t.factEdu,    t.factEduVal],
      [t.factFocus,  t.factFocusVal],
      [t.factLocation, t.factLocationVal],
    ];
    factDivs.forEach((div, i) => {
      if (!factMap[i]) return;
      const dt = div.querySelector("dt");
      const dd = div.querySelector("dd");
      if (dt) dt.textContent = factMap[i][0];
      if (dd) dd.textContent = factMap[i][1];
    });

    // Contact title
    const contactLines = $$(".contact__title .line");
    set(contactLines[0]?.querySelector("span"), t.contactLine1);
    set(contactLines[1]?.querySelector("span"), t.contactLine2);

    // Update html lang attribute + button label (shows the OPPOSITE — what you'll switch to)
    document.documentElement.lang = lang;
    if (langLabel) langLabel.textContent = lang === "en" ? "VI" : "EN";

  };

  if (langToggle) {

    langToggle.addEventListener("click", () => {
      const current = document.documentElement.lang || "en";
      applyLang(current === "en" ? "vi" : "en");
    });
  }

  /* ---------- Theme toggle ---------- */
  // The initial theme is set by an inline <head> script to avoid flash;
  // this handler just toggles + persists.
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      // Keep the meta theme-color (mobile browser chrome) in sync
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.content = next === "dark" ? "#0a0a0a" : "#f1ede2";
    });
  }

  /* ---------- Left rail scroll progress ---------- */
  // The vertical fill and bullet track the user's reading position so the
  // page has an aesthetic "you are here" indicator along the left edge.
  const railFill = document.getElementById("rail-fill");
  const railBullet = document.getElementById("rail-bullet");
  const railPercent = document.getElementById("rail-percent");

  if (railFill && railBullet) {
    let railRaf = 0;
    const updateRail = () => {
      if (railRaf) return;
      railRaf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        const railEl = document.querySelector(".rail--left");
        if (!railEl) { railRaf = 0; return; }
        const railH = railEl.getBoundingClientRect().height - 56;
        const bulletTop = 28 + ratio * railH;
        railFill.style.height = (ratio * railH).toFixed(1) + "px";
        railBullet.style.top = bulletTop.toFixed(1) + "px";
        if (railPercent) {
          railPercent.textContent = Math.round(ratio * 100) + "%";
          railPercent.style.top = (bulletTop + 14).toFixed(1) + "px";
        }
        railRaf = 0;
      });
    };
    updateRail();
    window.addEventListener("scroll", updateRail, { passive: true });
    window.addEventListener("resize", updateRail, { passive: true });

    // Drag the rail to scroll the page
    const railLeft = document.querySelector(".rail--left");
    let railDragging = false;

    const scrollToClientY = (clientY) => {
      const rect = railLeft.getBoundingClientRect();
      const railH = rect.height - 56;
      const relY  = clientY - rect.top - 28;
      const ratio = Math.min(1, Math.max(0, relY / railH));
      const max   = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: ratio * max, behavior: "auto" });
    };

    railLeft.addEventListener("mousedown", (e) => {
      railDragging = true;
      scrollToClientY(e.clientY);
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (railDragging) scrollToClientY(e.clientY);
    }, { passive: true });
    window.addEventListener("mouseup", () => { railDragging = false; });

    railLeft.addEventListener("touchstart", (e) => {
      railDragging = true;
      scrollToClientY(e.touches[0].clientY);
    }, { passive: true });
    railLeft.addEventListener("touchmove", (e) => {
      if (railDragging) scrollToClientY(e.touches[0].clientY);
    }, { passive: true });
    railLeft.addEventListener("touchend", () => { railDragging = false; }, { passive: true });
  }

  /* ---------- Parallax engine ---------- */
  // Any element with `data-parallax="0.15"` gets a smooth translateY based on
  // its distance from viewport center, multiplied by the speed value.
  //   negative speed → element rises faster than scroll (foreground feel)
  //   positive speed → element lags behind scroll (background feel)
  // Disabled on touch devices and when the user prefers reduced motion.
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!isCoarse && !prefersReduced) {
    const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]")).map(
      (el) => ({
        el,
        speed: parseFloat(el.dataset.parallax) || 0,
        baseY: 0,
      })
    );

    const measureParallax = () => {
      parallaxEls.forEach((p) => {
        // Strip current transform so the measurement is the element's natural Y
        p.el.style.transform = "";
        const rect = p.el.getBoundingClientRect();
        p.baseY = rect.top + window.scrollY + rect.height / 2;
      });
    };

    let pTicking = false;
    const updateParallax = () => {
      if (pTicking) return;
      pTicking = true;
      requestAnimationFrame(() => {
        const center = window.scrollY + window.innerHeight / 2;
        for (const { el, speed, baseY } of parallaxEls) {
          const distance = center - baseY;
          // toFixed reduces sub-pixel jitter; translate3d gets GPU acceleration
          el.style.transform = `translate3d(0, ${(distance * speed).toFixed(2)}px, 0)`;
        }
        pTicking = false;
      });
    };

    // Mark for GPU promotion — helps avoid jank during scroll
    parallaxEls.forEach((p) => (p.el.style.willChange = "transform"));

    measureParallax();
    updateParallax();
    window.addEventListener("scroll", updateParallax, { passive: true });

    // On resize the document layout shifts, so re-measure anchor points.
    let resizeRaf = 0;
    window.addEventListener(
      "resize",
      () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
          measureParallax();
          updateParallax();
        });
      },
      { passive: true }
    );

    // Recompute once images/fonts settle (font-driven layout shifts)
    window.addEventListener("load", () => {
      measureParallax();
      updateParallax();
    });
  }
  /* ---------- Mobile menu ---------- */
  const burger     = document.querySelector(".nav__burger");
  const mobileMenu = document.getElementById("mobile-menu");
  if (burger && mobileMenu) {
    const mobileLinks = mobileMenu.querySelectorAll(".mobile-menu__link");

    const openMenu = () => {
      burger.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      mobileMenu.classList.add("is-open");
      mobileMenu.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    const closeMenu = () => {
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      mobileMenu.classList.remove("is-open");
      mobileMenu.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    burger.addEventListener("click", () => {
      burger.classList.contains("is-open") ? closeMenu() : openMenu();
    });
    mobileLinks.forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileMenu.classList.contains("is-open")) closeMenu();
    });
  }

  /* ---------- Photo lightbox ---------- */
  const allPhotos = [
    { src: "Photo/photo5.jpg",  alt: "KSU graduation portrait" },
    { src: "Photo/photo4.jpg",  alt: "KSU graduation with family" },
    { src: "Photo/photo6.jpg",  alt: "Walking the stage" },
    { src: "Photo/photo1.jpg",  alt: "Tech conference" },
    { src: "Photo/photo2.jpg",  alt: "Trade show" },
    { src: "Photo/photo3.jpg",  alt: "New York" },
    { src: "Photo/photo7.jpg",  alt: "Las Vegas" },
    { src: "Photo/photo8.jpg",  alt: "Las Vegas" },
    { src: "Photo/photo9.jpg",  alt: "Las Vegas Bellagio" },
    { src: "Photo/photo10.jpg", alt: "Lounge" },
    { src: "Photo/photo12.jpg", alt: "Pickleball" },
    { src: "Photo/photo13.jpg", alt: "Family", filter: "brightness(0.82)" },
  ];

  const lightbox = document.getElementById("lightbox");
  if (lightbox) {
    const img      = lightbox.querySelector(".lightbox__img");
    const dotsWrap = lightbox.querySelector(".lightbox__dots");
    const closeBtn = lightbox.querySelector(".lightbox__close");
    const prevBtn  = lightbox.querySelector(".lightbox__btn--prev");
    const nextBtn  = lightbox.querySelector(".lightbox__btn--next");
    let current = 0;

    allPhotos.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "lightbox__dot";
      dot.setAttribute("aria-label", `Photo ${i + 1}`);
      dotsWrap.appendChild(dot);
    });
    const dots = dotsWrap.querySelectorAll(".lightbox__dot");

    const goTo = (idx) => {
      current = (idx + allPhotos.length) % allPhotos.length;
      img.style.opacity = "0";
      setTimeout(() => {
        img.src = allPhotos[current].src;
        img.alt = allPhotos[current].alt;
        img.style.filter = allPhotos[current].filter || "";
        img.style.opacity = "1";
      }, 180);
      dots.forEach((d, i) => d.classList.toggle("is-active", i === current));
    };

    const open = (idx) => {
      goTo(idx);
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      document.body.classList.add("has-lightbox");
    };
    const close = () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      document.body.classList.remove("has-lightbox");
    };

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", () => goTo(current - 1));
    nextBtn.addEventListener("click", () => goTo(current + 1));
    dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) close(); });

    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape")      close();
      if (e.key === "ArrowLeft")   goTo(current - 1);
      if (e.key === "ArrowRight")  goTo(current + 1);
    });

    let touchStartX = 0;
    lightbox.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend",   (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) diff > 0 ? goTo(current + 1) : goTo(current - 1);
    });

    document.querySelectorAll(".about-photos__item").forEach((item) => {
      item.addEventListener("click", () => {
        const src = item.querySelector("img").src.replace(location.origin + "/", "");
        const idx = allPhotos.findIndex((p) => src.endsWith(p.src.replace("Photo/", "")));
        open(idx >= 0 ? idx : 0);
      });
    });
  }


  /* ---------- Section dot navigator ---------- */
  const sectionNavItems = document.querySelectorAll(".section-nav__item");
  if (sectionNavItems.length) {
    const sectionIds = ["work", "about", "stack", "contact"];
    const sections   = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const setActive = (activeId) => {
      let passed = true;
      sectionIds.forEach((id, i) => {
        const item = sectionNavItems[i];
        if (!item) return;
        const isActive = id === activeId;
        if (isActive) passed = false;
        item.classList.toggle("is-active", isActive);
        item.classList.toggle("is-past",   passed && !isActive);
      });
    };

    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { threshold: 0.35 });

    sections.forEach(s => navObserver.observe(s));
  }

  /* ---------- Marquee drag-to-scroll ---------- */
  const marqueeEl    = document.querySelector(".marquee");
  const marqueeTrack = document.querySelector(".marquee__track");

  if (marqueeEl && marqueeTrack) {
    const ANIM_DURATION = 32; // seconds — must match CSS animation duration
    let dragging          = false;
    let dragStartX        = 0;
    let dragStartTranslate = 0;
    let dragCurrentTranslate = 0;

    const readTranslateX = () =>
      new DOMMatrix(getComputedStyle(marqueeTrack).transform).m41;

    const pauseAnim = () => {
      dragCurrentTranslate = readTranslateX();
      // Freeze position: remove CSS animation, hold via inline transform
      marqueeTrack.style.animationName = "none";
      marqueeTrack.style.transform = `translateX(${dragCurrentTranslate}px)`;
    };

    const resumeAnim = () => {
      const halfW    = marqueeTrack.scrollWidth / 2;
      const absPos   = Math.abs(dragCurrentTranslate) % halfW;
      const progress = absPos / halfW; // 0 → 1 fraction through one loop
      // Apply delay before restoring name so the restart is seamless
      marqueeTrack.style.animationDelay = `${-(progress * ANIM_DURATION)}s`;
      marqueeTrack.style.transform      = "";
      marqueeTrack.style.animationName  = "";
    };

    const dragStart = (x) => {
      dragging           = true;
      dragStartX         = x;
      dragStartTranslate = readTranslateX();
      pauseAnim();
      marqueeEl.classList.add("is-dragging");
    };

    const dragMove = (x) => {
      if (!dragging) return;
      dragCurrentTranslate = dragStartTranslate + (x - dragStartX);
      marqueeTrack.style.transform = `translateX(${dragCurrentTranslate}px)`;
    };

    const dragEnd = () => {
      if (!dragging) return;
      dragging = false;
      marqueeEl.classList.remove("is-dragging");
      resumeAnim();
    };

    // Mouse
    marqueeEl.addEventListener("mousedown", (e) => { e.preventDefault(); dragStart(e.clientX); });
    window.addEventListener("mousemove",    (e) => { if (dragging) dragMove(e.clientX); }, { passive: true });
    window.addEventListener("mouseup",      dragEnd);

    // Touch
    marqueeEl.addEventListener("touchstart", (e) => { dragStart(e.touches[0].clientX); },        { passive: true });
    marqueeEl.addEventListener("touchmove",  (e) => { if (dragging) dragMove(e.touches[0].clientX); }, { passive: true });
    marqueeEl.addEventListener("touchend",   dragEnd, { passive: true });

    // Trackpad / touchpad two-finger horizontal swipe (wheel deltaX)
    let wheelTimer = null;
    marqueeEl.addEventListener("wheel", (e) => {
      if (dragging || Math.abs(e.deltaX) < 2) return; // ignore vertical-only wheel
      e.preventDefault();
      // Pause animation on the first tick of a swipe gesture
      if (marqueeTrack.style.animationName !== "none") {
        dragCurrentTranslate = readTranslateX();
        marqueeTrack.style.animationName = "none";
        marqueeTrack.style.transform = `translateX(${dragCurrentTranslate}px)`;
      }
      dragCurrentTranslate -= e.deltaX; // deltaX > 0 = swipe left = content moves left
      marqueeTrack.style.transform = `translateX(${dragCurrentTranslate}px)`;
      // Resume animation ~200 ms after the last wheel tick
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(resumeAnim, 200);
    }, { passive: false }); // passive:false required to call preventDefault
  }

})();

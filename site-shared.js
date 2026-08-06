/* ==========================================================================
   site-shared.js — АНО Центр «Надежда»
   Общая логика для всех страниц: адаптивное меню, мягкие анимации при
   прокрутке, лайтбокс для фотогалереи, установка сайта как приложения (PWA).
   Скрипт написан защитно: если на странице чего-то нет — просто ничего
   не делает, ничего не ломает.
   ========================================================================== */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    initActiveNavLink();
    initAutoMobileMenu();
    initCardReveal();
    initGalleryLightbox();
    initInstallPrompt();
    initPageFadeIn();
  });

  /* -------------------- Подсветка текущего пункта меню -------------------- */
  function initActiveNavLink() {
    var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").toLowerCase();
      if (href === here || (here === "" && href === "index.html")) {
        a.classList.add("active");
      }
    });
  }

  /* -------------------- Плавное появление страницы -------------------- */
  function initPageFadeIn() {
    document.documentElement.style.setProperty("--nh-fade", "1");
    document.body.style.opacity = "0";
    requestAnimationFrame(function () {
      document.body.style.transition = "opacity .45s ease";
      document.body.style.opacity = "1";
    });
  }

  /* -------------------- Автосоздание гамбургер-меню --------------------
     На большинстве страниц кнопка меню уже есть в разметке. Если её нет
     (как на главной странице) — создаём такую же по стилю автоматически,
     чтобы шапка везде выглядела и работала одинаково.                    */
  function initAutoMobileMenu() {
    var header = document.querySelector("header.header, .header");
    if (!header) return;

    var nav = header.querySelector(".nav-links");
    if (!nav) return;

    var existingToggle = header.querySelector(".menu-toggle, .nh-menu-toggle");
    if (existingToggle) return; // на странице уже есть своя рабочая реализация

    var toggle = document.createElement("button");
    toggle.className = "nh-menu-toggle";
    toggle.setAttribute("aria-label", "Меню");
    toggle.setAttribute("type", "button");
    toggle.textContent = "☰";
    nav.parentNode.insertBefore(toggle, nav);

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = nav.classList.toggle("nh-open");
      toggle.textContent = open ? "✕" : "☰";
    });

    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("nh-open");
        toggle.textContent = "☰";
      });
    });

    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target) && nav.classList.contains("nh-open")) {
        nav.classList.remove("nh-open");
        toggle.textContent = "☰";
      }
    });
  }

  /* -------------------- Мягкая анимация появления карточек -------------------- */
  function initCardReveal() {
    if (!("IntersectionObserver" in window)) return;

    var selector = [
      '[class*="card"]', '[class*="gallery-item"]', '[class*="team-member"]',
      '[class*="value-item"]', '[class*="stat-"]', '[class*="doc-item"]',
      '[class*="benefit"]', '[class*="feature"]', '[class*="step-item"]'
    ].join(",");

    var els = Array.prototype.slice.call(document.querySelectorAll(selector));
    if (!els.length) return;

    // Не дублируем анимацию у вложенных друг в друга элементов
    els = els.filter(function (el) {
      return !els.some(function (other) { return other !== el && other.contains(el); });
    });

    els.forEach(function (el, i) {
      el.classList.add("nh-reveal");
      el.style.transitionDelay = (i % 6) * 0.05 + "s";
    });

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("nh-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });

    els.forEach(function (el) { obs.observe(el); });

    // Страховка: если что-то не сработало — всё равно показать через 2.5с
    setTimeout(function () {
      document.querySelectorAll(".nh-reveal:not(.nh-visible)").forEach(function (el) {
        el.classList.add("nh-visible");
      });
    }, 2500);

    var footer = document.querySelector("footer");
    if (footer) {
      footer.classList.add("nh-reveal");
      var fobs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add("nh-visible"); fobs.unobserve(entry.target); }
        });
      }, { threshold: 0.05 });
      fobs.observe(footer);
    }
  }

  /* -------------------- Лайтбокс для фотогалереи -------------------- */
  function initGalleryLightbox() {
    var groupsSelector = ".slider-slide img, .gallery-images img, [class*='gallery'] img, .photo-grid img, [class*='photo-item'] img";

    var lb = document.createElement("div");
    lb.className = "nh-lightbox";
    lb.innerHTML =
      '<button class="nh-lightbox-close" type="button" aria-label="Закрыть">✕</button>' +
      '<button class="nh-lightbox-prev" type="button" aria-label="Предыдущее">‹</button>' +
      '<img alt="">' +
      '<button class="nh-lightbox-next" type="button" aria-label="Следующее">›</button>' +
      '<div class="nh-lightbox-counter"></div>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector("img");
    var counter = lb.querySelector(".nh-lightbox-counter");
    var currentGroup = [];
    var currentIndex = 0;

    function groupOf(img) {
      var card = img.closest(".merged-card, [class*='card'], [class*='gallery'], [class*='photo']") || document;
      var imgs = Array.prototype.slice.call(card.querySelectorAll("img")).filter(function (i) {
        return i.src && i.naturalWidth !== 1;
      });
      return imgs.length ? imgs : [img];
    }

    function openAt(img) {
      currentGroup = groupOf(img);
      currentIndex = currentGroup.indexOf(img);
      if (currentIndex < 0) currentIndex = 0;
      render();
      lb.classList.add("nh-open");
      document.body.style.overflow = "hidden";
    }

    function render() {
      var img = currentGroup[currentIndex];
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || "";
      counter.textContent = currentGroup.length > 1 ? (currentIndex + 1) + " / " + currentGroup.length : "";
      var multi = currentGroup.length > 1;
      lb.querySelector(".nh-lightbox-prev").style.display = multi ? "flex" : "none";
      lb.querySelector(".nh-lightbox-next").style.display = multi ? "flex" : "none";
    }

    function close() {
      lb.classList.remove("nh-open");
      document.body.style.overflow = "";
    }
    function next() { currentIndex = (currentIndex + 1) % currentGroup.length; render(); }
    function prev() { currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length; render(); }

    document.addEventListener("click", function (e) {
      var img = e.target.closest(groupsSelector);
      if (img) { openAt(img); }
    });

    lb.querySelector(".nh-lightbox-close").addEventListener("click", close);
    lb.querySelector(".nh-lightbox-next").addEventListener("click", next);
    lb.querySelector(".nh-lightbox-prev").addEventListener("click", prev);
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });

    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("nh-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    });
  }

  /* -------------------- PWA: установка на главный экран -------------------- */
  function initInstallPrompt() {
    var deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (sessionStorage.getItem("nh-install-dismissed") === "1") return;
      showToast();
    });

    function showToast() {
      if (document.querySelector(".nh-install-toast")) return;
      var toast = document.createElement("div");
      toast.className = "nh-install-toast";
      toast.innerHTML =
        '<div class="nh-install-icon">📲</div>' +
        '<div class="nh-install-text"><b>Установить приложение</b><span>АНО Центр «Надежда» — на ваш экран</span></div>' +
        '<div class="nh-install-actions">' +
        '<button type="button" class="nh-install-btn">Установить</button>' +
        '<button type="button" class="nh-dismiss-btn" aria-label="Закрыть">✕</button>' +
        "</div>";
      document.body.appendChild(toast);
      requestAnimationFrame(function () { toast.classList.add("nh-show"); });

      toast.querySelector(".nh-install-btn").addEventListener("click", function () {
        toast.classList.remove("nh-show");
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
        }
        setTimeout(function () { toast.remove(); }, 400);
      });
      toast.querySelector(".nh-dismiss-btn").addEventListener("click", function () {
        sessionStorage.setItem("nh-install-dismissed", "1");
        toast.classList.remove("nh-show");
        setTimeout(function () { toast.remove(); }, 400);
      });
    }
  }

  /* -------------------- Регистрация Service Worker -------------------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();

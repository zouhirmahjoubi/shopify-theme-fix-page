(() => {
  "use strict";

  const poster = document.querySelector(".poster");
  const replayButton = document.querySelector(".replay-button");
  const motionStatus = document.querySelector("#motion-status");

  if (!poster || !replayButton) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const gsap = window.gsap;

  if (!gsap) {
    replayButton.disabled = true;
    replayButton.title = "تعذّر تحميل الحركة، لكن الإعلان ظاهر بالكامل";
    return;
  }

  replayButton.disabled = false;

  const allAnimated = [
    ".js-hero-tile",
    ".js-hero-mask",
    ".js-accent",
    ".js-flow-block",
    ".js-schedule-block",
    ".js-time-block",
    ".js-digit",
    ".js-major-digit",
    ".js-major-colon"
  ];

  let introTimeline;
  let ambientTimeline;
  let isInView = true;

  const announceStatus = (message) => {
    if (!motionStatus) return;
    motionStatus.textContent = "";
    window.requestAnimationFrame(() => {
      motionStatus.textContent = message;
    });
  };

  const clearAnimatedState = () => {
    gsap.set(allAnimated, { clearProps: "all" });
  };

  const stopMotion = () => {
    introTimeline?.kill();
    ambientTimeline?.kill();
    introTimeline = null;
    ambientTimeline = null;
    gsap.killTweensOf([".ambient-piece", ".ambient-wash"]);
  };

  const startAmbientMotion = () => {
    ambientTimeline?.kill();
    ambientTimeline = gsap.timeline({ repeat: -1, yoyo: true, paused: !isInView });

    ambientTimeline
      .to(".ambient-piece--north", {
        x: 3,
        y: 2,
        rotation: 1.2,
        transformOrigin: "50% 50%",
        duration: 10,
        ease: "sine.inOut"
      }, 0)
      .to(".ambient-piece--south", {
        x: -3,
        y: -2,
        rotation: -1,
        transformOrigin: "50% 50%",
        duration: 12,
        ease: "sine.inOut"
      }, 0)
      .to(".ambient-wash", {
        xPercent: -1.5,
        yPercent: 1,
        duration: 14,
        ease: "sine.inOut"
      }, 0);
  };

  const playIntro = ({ announce = false } = {}) => {
    stopMotion();
    clearAnimatedState();

    if (reduceMotion.matches) {
      replayButton.title = "تم إيقاف الحركة احترامًا لإعداد تقليل الحركة";
      if (announce) announceStatus("تم احترام إعداد تقليل الحركة. الإعلان ظاهر بالكامل.");
      return;
    }

    replayButton.title = "إعادة تشغيل حركة الإعلان";

    const heroTiles = gsap.utils.toArray(".js-hero-tile");
    const flowBlocks = gsap.utils.toArray(".js-flow-block");
    const scheduleBlocks = gsap.utils.toArray(".js-schedule-block");
    const morningDigits = gsap.utils.toArray(".js-digit");
    const majorDigits = gsap.utils.toArray(".js-major-digit");

    introTimeline = gsap.timeline({
      defaults: { ease: "power4.out" },
      onComplete: () => {
        clearAnimatedState();
        startAmbientMotion();
        if (announce) announceStatus("أُعيد تشغيل حركة الإعلان.");
      }
    });

    introTimeline
      .set(heroTiles, {
        autoAlpha: 0,
        scale: 0,
        rotation: (index) => index % 2 ? 38 : -38,
        transformOrigin: "50% 50%"
      })
      .set(".js-hero-mask", {
        clipPath: "inset(0 0 0 100%)",
        x: 24
      })
      .set(".js-accent", { scaleX: 0 })
      .set(flowBlocks, { autoAlpha: 0, x: 28 })
      .set(scheduleBlocks, { autoAlpha: 0, x: 38 })
      .set(".js-time-block", { autoAlpha: 0, x: 22 })
      .set(morningDigits, { yPercent: 115 })
      .set(majorDigits, { yPercent: 118 })
      .set(".js-major-colon", { autoAlpha: 0, scaleY: .45 })
      .to(heroTiles, {
        autoAlpha: 1,
        scale: 1,
        rotation: 0,
        duration: .62,
        stagger: { each: .045, from: "center" }
      }, 0)
      .to(".js-hero-mask", {
        clipPath: "inset(0 0 0 0%)",
        x: 0,
        duration: .68
      }, .18)
      .to(".js-accent", {
        scaleX: 1,
        duration: .32,
        stagger: .07
      }, .58)
      .to(flowBlocks, {
        autoAlpha: 1,
        x: 0,
        duration: .48,
        stagger: .1
      }, .62)
      .to(scheduleBlocks[0], {
        autoAlpha: 1,
        x: 0,
        duration: .58
      }, 1.02)
      .to(".period--morning .js-time-block", {
        autoAlpha: 1,
        x: 0,
        duration: .38,
        stagger: .06
      }, 1.18)
      .to(morningDigits, {
        yPercent: 0,
        duration: .44,
        stagger: .035
      }, 1.3)
      .to(scheduleBlocks[1], {
        autoAlpha: 1,
        x: 0,
        duration: .62
      }, 1.5)
      .to(".period--afternoon .js-time-block", {
        autoAlpha: 1,
        x: 0,
        duration: .42,
        stagger: .07
      }, 1.72)
      .to(majorDigits, {
        yPercent: 0,
        duration: .58,
        stagger: .052
      }, 1.92)
      .to(".js-major-colon", {
        autoAlpha: 1,
        scaleY: 1,
        duration: .28,
        stagger: .07
      }, 2.14)
      .to(".js-major-colon", {
        scaleY: 1.18,
        duration: .13,
        repeat: 1,
        yoyo: true,
        stagger: .06,
        ease: "power2.inOut"
      }, 2.47);
  };

  replayButton.addEventListener("click", () => {
    gsap.fromTo(replayButton, { scale: .96 }, { scale: 1, duration: .18, ease: "power4.out", clearProps: "transform" });
    playIntro({ announce: true });
  });

  const handleMotionPreference = () => playIntro();

  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", handleMotionPreference);
  } else {
    reduceMotion.addListener(handleMotionPreference);
  }

  document.addEventListener("visibilitychange", () => {
    if (!ambientTimeline) return;
    if (document.hidden) ambientTimeline.pause();
    else if (isInView) ambientTimeline.resume();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting;
      if (!ambientTimeline || document.hidden) return;
      if (isInView) ambientTimeline.resume();
      else ambientTimeline.pause();
    }, { threshold: .08 });

    observer.observe(poster);
  }

  playIntro();
})();

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { LiquidFormBackground } from "@designcodeio/threeui/components/LiquidFormBackground";

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

function mount(node) {
  if (node.dataset.cvGlowMounted) return;
  node.dataset.cvGlowMounted = "1";

  const tintHue = parseFloat(node.dataset.tintHue || "6");
  const tintAmount = parseFloat(node.dataset.tintAmount || "0.85");
  const speed = parseFloat(node.dataset.speed || "0.55");

  const root = createRoot(node);
  root.render(
    createElement(LiquidFormBackground, {
      speed,
      morph: 0.85,
      noiseScale: 0.9,
      mouseAmount: 0.12,
      metal: 1.15,
      camera: 5.5,
      tintHue,
      tintAmount,
    })
  );

  requestAnimationFrame(() => node.classList.add("is-ready"));
}

function init() {
  const nodes = document.querySelectorAll("[data-cv-hero-glow]");
  if (!nodes.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!supportsWebGL()) return;

  nodes.forEach(mount);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

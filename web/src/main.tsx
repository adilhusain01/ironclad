import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts are bundled, so the page calls no font service.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/martian-mono/wdth.css";
import "./styles.css";
import { Footer, GetStarted, Trust } from "./Closing.tsx";
import { HowItWorks } from "./How.tsx";
import { Proof } from "./Proof.tsx";
import { Record } from "./Record.tsx";
import { Hero, TopBar } from "./Top.tsx";
import { useLive } from "./useLive.ts";

function Page() {
  const live = useLive();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-inner focus:bg-key focus:px-3 focus:py-2">
        Skip to the content
      </a>
      <TopBar />
      <main id="main">
        <Hero live={live} />
        <HowItWorks />
        <Record state={live.state} />
        <Proof />
        <Trust />
        <GetStarted />
      </main>
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);

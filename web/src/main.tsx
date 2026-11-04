import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Stockroom's type set, bundled so the page calls no font service.
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import { Closing, Footer, GetStarted, Trust } from "./Closing.tsx";
import { HowItWorks } from "./How.tsx";
import { Proof } from "./Proof.tsx";
import { Record } from "./Record.tsx";
import { Hero, TopBar } from "./Top.tsx";
import { useLive } from "./useLive.ts";

function Page() {
  const live = useLive();
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2">
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
        <Closing />
      </main>
      <Footer />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);

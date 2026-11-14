import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Stockroom's type set, bundled so the page calls no font service.
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import { Footer, GetStarted, Trust } from "./Closing.tsx";
import { HowItWorks } from "./How.tsx";
import { SkipLink } from "./pieces.tsx";
import { Proof } from "./Proof.tsx";
import { Record } from "./Record.tsx";
import { Rules } from "./Rules.tsx";
import { Hero, TryIt } from "./Top.tsx";
import { useLive } from "./useLive.ts";

function Page() {
  const live = useLive();
  return (
    <>
      <SkipLink />
      <main id="main">
        <Hero />
        <TryIt live={live} />
        <HowItWorks />
        <Rules />
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

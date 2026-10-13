/* eslint-disable @typescript-eslint/no-explicit-any -- test harness over untyped fixture JSON */
import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@/i18n";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";
import HostAccess from "@/pages/HostAccess";

const q = new URLSearchParams(location.search);
const mode = q.get("mode") || "tab";
const fx = q.get("fixture") || "en_detective";

Promise.resolve((window as any).__FIXTURES__).then((all) => {
  const f = all[fx];
  const root = createRoot(document.getElementById("root")!);
  if (mode === "host") {
    root.render(<MemoryRouter initialEntries={["/host/tok"]}><Routes><Route path="/host/:token" element={<HostAccess />} /></Routes></MemoryRouter>);
    return;
  }
  const packageData = {
    title: f.title, gameOverview: f.game_overview, detectiveScript: f.detective_script,
    evidenceCards: typeof f.evidence_cards === "string" ? f.evidence_cards : JSON.stringify(f.evidence_cards),
    evidenceCardImages: f.evidence_card_images, materials: f.materials, hostingTips: f.hosting_tips,
  };
  root.render(
    <MemoryRouter>
      <MysteryPackageTabView packageContent="" mysteryTitle={f.title} isGenerating={false} estimatedTime="" packageId={f.id}
        isPaid={false} mysteryType={f.mystery_type} mysteryStyle={f.mystery_style} hasAccomplice={f.has_accomplice}
        playerCount={f.player_count} packageData={packageData as any} characters={[]} />
    </MemoryRouter>);
});

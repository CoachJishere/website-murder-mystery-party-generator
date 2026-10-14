
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface MysteryFilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    all: number;
    draft: number;
    purchased: number;
    archived: number;
  };
  displayCounts?: boolean;
}

export function MysteryFilterTabs({
  activeTab,
  onTabChange,
  counts,
  displayCounts = true
}: MysteryFilterTabsProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-6">
      <Tabs defaultValue={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            {t("dashboardFilters.all")}
            {displayCounts && <Badge variant="secondary" className="ml-2">{counts.all}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex-1">
            {t("dashboardFilters.draft")}
            {displayCounts && <Badge variant="secondary" className="ml-2">{counts.draft}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="purchased" className="flex-1">
            {t("dashboardFilters.purchased")}
            {displayCounts && <Badge variant="secondary" className="ml-2">{counts.purchased}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex-1">
            {t("dashboardFilters.archived")}
            {displayCounts && <Badge variant="secondary" className="ml-2">{counts.archived}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}


import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MysteryFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortOrder: "newest" | "oldest" | "lastUpdated";
  setSortOrder: (order: "newest" | "oldest" | "lastUpdated") => void;
}

export const MysteryFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
}: MysteryFiltersProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
      <div className="flex items-center space-x-2 w-full md:w-auto">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          className="w-full md:w-[250px]"
          placeholder={t("dashboardFilters.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Label htmlFor="sort" className="whitespace-nowrap">{t("dashboardFilters.sortBy")}</Label>
          <select
            id="sort"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm w-full"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest" | "lastUpdated")}
          >
            <option value="newest">{t("dashboardFilters.newest")}</option>
            <option value="oldest">{t("dashboardFilters.oldest")}</option>
            <option value="lastUpdated">{t("dashboardFilters.lastUpdated")}</option>
          </select>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Label htmlFor="status" className="whitespace-nowrap">{t("dashboardFilters.filterByStatus")}</Label>
          <select
            id="status"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t("dashboardFilters.all")}</option>
            <option value="draft">{t("dashboardFilters.draft")}</option>
            <option value="published">{t("dashboardFilters.published")}</option>
            <option value="archived">{t("dashboardFilters.archived")}</option>
          </select>
        </div>
      </div>
    </div>
  );
};

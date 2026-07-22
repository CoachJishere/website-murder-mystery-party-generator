
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import HomeMysteryCard from "./HomeMysteryCard";
import { ColdCaseCard, SampleCard, ColdCaseOrder } from "./ColdCaseList";
import { MysteryListSkeleton } from "./MysteryListSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Mystery } from "@/interfaces/mystery";
import { useTranslation } from "react-i18next";

interface MysteryListProps {
  mysteries: Mystery[];
  isLoading: boolean;
  onRefresh: () => void;
  // Unified dashboard grid (ADR-0029 v3): cold cases interleave with mysteries by
  // date, each card carrying its own type label; the free trial card closes the grid.
  coldCases?: ColdCaseOrder[];
}

const MysteryList = ({ mysteries, isLoading, onRefresh, coldCases = [] }: MysteryListProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  
  const filteredColdCases = useMemo(() => {
    if (!searchQuery.trim()) return coldCases;
    const q = searchQuery.toLowerCase();
    return coldCases.filter((c) => (c.case_title || "cold case").toLowerCase().includes(q));
  }, [coldCases, searchQuery]);

  // Filtered mysteries based on search query
  const filteredMysteries = useMemo(() => {
    if (!searchQuery.trim()) return mysteries;
    
    const query = searchQuery.toLowerCase();
    return mysteries.filter(mystery => {
      // Search in title
      if (mystery.title?.toLowerCase().includes(query)) return true;
      
      // Search in mystery data
      if (mystery.mystery_data?.theme?.toLowerCase().includes(query)) return true;
      
      // Search in messages
      if (mystery.messages?.some(msg => msg.content?.toLowerCase().includes(query))) return true;
      
      return false;
    });
  }, [mysteries, searchQuery]);

  // Handle archiving a mystery (soft delete)
  const handleArchiveMystery = async (mysteryId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ display_status: "archived" })
        .eq("id", mysteryId);

      if (error) throw error;

      toast.success(t("dashboard.mysteries.deleteSuccess"));
      onRefresh();
    } catch (error) {
      console.error("Error archiving mystery:", error);
      toast.error(t("dashboard.mysteries.deleteFailed"));
    }
  };

  // Handle unarchiving a mystery
  const handleUnarchiveMystery = async (mysteryId: string) => {
    try {
      const mystery = mysteries.find(m => m.id === mysteryId);
      const restoreStatus = mystery?.is_paid ? "purchased" : "draft";

      const { error } = await supabase
        .from("conversations")
        .update({ display_status: restoreStatus })
        .eq("id", mysteryId);

      if (error) throw error;

      toast.success(t("common.notifications.unarchiveSuccess", { item: t("common.labels.mystery", { count: 1 }), defaultValue: "{{item}} restored successfully" }));
      onRefresh();
    } catch (error) {
      console.error("Error unarchiving mystery:", error);
      toast.error(t("common.notifications.unarchiveFailed", { item: t("common.labels.mystery", { count: 1 }), defaultValue: "Failed to restore {{item}}" }));
    }
  };

  // Handle hard delete
  const handleDeleteMystery = async (mysteryId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", mysteryId);

      if (error) throw error;

      toast.success(t("dashboard.mysteries.deleteSuccess"));
      onRefresh();
    } catch (error) {
      console.error("Error deleting mystery:", error);
      toast.error(t("dashboard.mysteries.deleteFailed"));
    }
  };

  // Handle editing a mystery - navigate directly to chat interface
  const handleEditMystery = (mysteryId: string) => {
    navigate(`/mystery/edit/${mysteryId}`);
  };

  // Handle viewing a mystery
  const handleViewMystery = (mysteryId: string) => {
    navigate(`/mystery/${mysteryId}`);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("dashboard.mysteries.searchPlaceholder")}
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <MysteryListSkeleton />
      ) : filteredMysteries.length > 0 || filteredColdCases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ...filteredMysteries.map((m) => ({ kind: "mystery" as const, date: m.created_at, item: m })),
            ...filteredColdCases.map((c) => ({ kind: "coldcase" as const, date: c.created_at, item: c })),
          ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((entry) =>
              entry.kind === "coldcase" ? (
                <ColdCaseCard key={entry.item.id} order={entry.item as ColdCaseOrder} />
              ) : (
                <HomeMysteryCard
                  key={entry.item.id}
                  mystery={{
                    id: entry.item.id,
                    title: entry.item.title,
                    mystery_data: entry.item.mystery_data || {},
                    display_status: entry.item.display_status || entry.item.status,
                    created_at: entry.item.created_at,
                    is_completed: Boolean(entry.item.is_completed),
                    is_paid: Boolean(entry.item.is_paid),
                    needs_package_generation: Boolean(entry.item.needs_package_generation),
                  }}
                  onView={handleViewMystery}
                  onEdit={handleEditMystery}
                  onArchive={handleArchiveMystery}
                  onUnarchive={handleUnarchiveMystery}
                  onDelete={handleDeleteMystery}
                />
              )
            )}
          {!searchQuery.trim() && <SampleCard />}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {mysteries.length > 0
              ? t("dashboard.mysteries.empty.searchResult")
              : t("dashboard.welcome.noMysteries")}
          </p>
          <Button onClick={() => navigate("/mystery/create")}>{t("dashboard.buttons.createFirstMystery")}</Button>
        </div>
      )}
      
      {filteredMysteries.length > 0 && filteredMysteries.length < mysteries.length && (
        <div className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t("dashboard.mysteries.showingCount", { count: filteredMysteries.length, total: mysteries.length })}
          </p>
        </div>
      )}
    </div>
  );
};

export default MysteryList;

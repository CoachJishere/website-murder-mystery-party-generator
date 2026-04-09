
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Mystery } from "@/interfaces/mystery";
import { Search, ArrowDown, Search as MagnifyingGlass } from "lucide-react";
import HomeMysteryCard from "./HomeMysteryCard";
import { extractTitleFromMessages } from "@/utils/titleExtraction";
import { getPackageGenerationStatus } from "@/services/mysteryPackageService";
import { useTranslation } from "react-i18next";

interface HomeDashboardProps {
  onCreateNew: () => void;
}

export const HomeDashboard = ({ onCreateNew }: HomeDashboardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allMysteries, setAllMysteries] = useState<Mystery[]>([]);
  const [displayedMysteries, setDisplayedMysteries] = useState<Mystery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [totalMysteriesCount, setTotalMysteriesCount] = useState(0);
  const pageSize = 6;
  const { t } = useTranslation();

  // Handle search term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      setIsSearching(true);
      // Reset to first page when search term changes
      setPage(1);
      // Apply search filter to all loaded mysteries
      applySearchFilter(searchTerm.trim().toLowerCase());
    } else {
      setIsSearching(false);
      // Reset to first page and show all mysteries with pagination
      setPage(1);
      updateDisplayedMysteries(allMysteries, 1);
    }
  }, [searchTerm]);

  // Fetch mysteries when user changes or when reset is needed
  useEffect(() => {
    if (user?.id) {
      fetchMysteries(1, true);
    }
  }, [user?.id]);

  // Build a stable key for mysteries that need generation checks
  const generatingIds = allMysteries
    .filter(m => m.needs_package_generation && m.status === "generating")
    .map(m => m.id)
    .join(",");

  // Deferred: check generation status for mysteries that need it (non-blocking)
  useEffect(() => {
    if (!generatingIds) return;

    const generatingMysteries = allMysteries.filter(
      m => m.needs_package_generation && m.status === "generating"
    );
    if (generatingMysteries.length === 0) return;

    let cancelled = false;

    const checkStatuses = async () => {
      const updates: { id: string; newStatus: "purchased" | "generating" }[] = [];

      await Promise.all(
        generatingMysteries.map(async (mystery) => {
          try {
            const generationStatus = await getPackageGenerationStatus(mystery.id);
            if (cancelled) return;

            if (generationStatus.status === 'completed') {
              updates.push({ id: mystery.id, newStatus: "purchased" });
              // Update DB so we don't check again next time
              await supabase
                .from("conversations")
                .update({ needs_package_generation: false })
                .eq("id", mystery.id);
            }
            // If still in_progress, keep as "generating" (already set)
          } catch (error) {
            console.error(`Error checking generation status for ${mystery.id}:`, error);
          }
        })
      );

      if (cancelled || updates.length === 0) return;

      // Batch-update mysteries whose status changed
      setAllMysteries(prev =>
        prev.map(m => {
          const update = updates.find(u => u.id === m.id);
          if (update) {
            return { ...m, status: update.newStatus, display_status: update.newStatus, needs_package_generation: false };
          }
          return m;
        })
      );
      setDisplayedMysteries(prev =>
        prev.map(m => {
          const update = updates.find(u => u.id === m.id);
          if (update) {
            return { ...m, status: update.newStatus, display_status: update.newStatus, needs_package_generation: false };
          }
          return m;
        })
      );
    };

    checkStatuses();
    return () => { cancelled = true; };
  }, [generatingIds]);

  // Apply search filter to all loaded mysteries
  const applySearchFilter = (searchLower: string) => {
    if (allMysteries.length === 0) return;
    
    const filtered = allMysteries.filter(mystery => {
      // Search in all relevant fields
      const searchableFields = [
        mystery.title?.toLowerCase() || '',
        mystery.ai_title?.toLowerCase() || '',
        mystery.theme?.toLowerCase() || '',
        mystery.mystery_data?.theme?.toLowerCase() || '',
        mystery.mystery_data?.additionalDetails?.toLowerCase() || '',
        mystery.mystery_data?.scriptType?.toLowerCase() || ''
      ];
      
      // Check if any field includes the search term
      return searchableFields.some(field => field.includes(searchLower));
    });
    
    updateDisplayedMysteries(filtered, 1);
  };

  // Update displayed mysteries with pagination
  const updateDisplayedMysteries = (mysteries: Mystery[], pageNum: number) => {
    const end = pageNum * pageSize;
    const paginated = mysteries.slice(0, end);
    
    setDisplayedMysteries(paginated);
    // Only set hasMorePages to false when we've loaded all available mysteries
    setHasMorePages(mysteries.length > paginated.length);
    
    // hasMore when there are still more items beyond what we're showing
  };

  const fetchMysteries = async (pageNumber: number, reset: boolean = false) => {
    try {
      setLoading(true);
      if (!user?.id) return;

      // Single query: get conversations WITH messages joined, plus exact count
      let query = supabase
        .from("conversations")
        .select("id, title, created_at, updated_at, theme, player_count, script_type, has_accomplice, additional_details, status, display_status, is_paid, purchase_date, is_completed, needs_package_generation, messages:messages!fk_messages_conversation_id(id, content, created_at, is_ai, role)", { count: 'exact' })
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      // If not searching, apply pagination on the server
      if (!isSearching) {
        query = query.range((pageNumber - 1) * pageSize, pageNumber * pageSize - 1);
      }

      const { data: conversationsData, error: conversationsError, count: totalCount } = await query;

      if (totalCount !== null) {
        setTotalMysteriesCount(totalCount);
      }

      if (conversationsError) {
        console.error("Error fetching conversations:", conversationsError);
        throw conversationsError;
      }

      if (!conversationsData) {
        setAllMysteries([]);
        setDisplayedMysteries([]);
        setHasMorePages(false);
        return;
      }

      // Process conversations synchronously — messages are already joined
      const mysteriesWithMessages = conversationsData.map((conversation: any) => {
        try {
          const messages = conversation.messages || [];
          const aiTitle = extractTitleFromMessages(messages);
          const theme = conversation.theme || 'Mystery';
          const title = aiTitle || conversation.title || `${theme} Mystery`;

          // Determine status WITHOUT awaiting generation checks
          // Generation status is checked in a deferred background effect
          let status: "draft" | "purchased" | "archived" | "generating";

          if (conversation.needs_package_generation && conversation.is_paid) {
            // Optimistically show as "generating" — background effect will update
            status = "generating";
          } else if (conversation.is_paid === true || conversation.display_status === "purchased") {
            status = "purchased";
          } else if (conversation.display_status === "archived") {
            status = "archived";
          } else {
            status = conversation.status || "draft";
          }

          const mystery: Mystery = {
            id: conversation.id,
            title: title,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at || conversation.created_at,
            status: status,
            display_status: status,
            mystery_data: {
              theme: conversation.theme,
              playerCount: conversation.player_count,
              scriptType: conversation.script_type,
              hasAccomplice: conversation.has_accomplice,
              additionalDetails: conversation.additional_details,
              status: status
            },
            theme: theme,
            guests: conversation.player_count || 6,
            is_purchased: conversation.is_paid === true || conversation.display_status === "purchased",
            is_paid: conversation.is_paid === true,
            is_completed: conversation.is_completed || false,
            ai_title: aiTitle,
            purchase_date: conversation.purchase_date,
            needs_package_generation: conversation.needs_package_generation || false
          };

          return mystery;
        } catch (error) {
          console.error(`Error processing conversation ${conversation.id}:`, error);
          return {
            id: conversation.id,
            title: conversation.title || "Mystery",
            created_at: conversation.created_at,
            updated_at: conversation.updated_at || conversation.created_at,
            status: "draft" as const,
            display_status: "draft" as const,
            mystery_data: {
              theme: conversation.theme || "Mystery",
              playerCount: conversation.player_count || 6,
              scriptType: conversation.script_type || "full",
              hasAccomplice: conversation.has_accomplice || false,
              additionalDetails: conversation.additional_details || ""
            },
            theme: conversation.theme || "Mystery",
            guests: conversation.player_count || 6,
            is_purchased: false,
            is_completed: false,
            ai_title: null,
            purchase_date: null,
            needs_package_generation: false
          } as Mystery;
        }
      });

      // Filter out any null results
      let validMysteries = mysteriesWithMessages.filter(Boolean);
      
      // Apply search filter if search term exists
      if (searchTerm.trim()) {
        const searchLower = searchTerm.trim().toLowerCase();
        validMysteries = validMysteries.filter(mystery => {
          // Search in all relevant fields
          const searchableFields = [
            mystery.title?.toLowerCase() || '',
            mystery.ai_title?.toLowerCase() || '',
            mystery.theme?.toLowerCase() || '',
            mystery.mystery_data?.theme?.toLowerCase() || '',
            mystery.mystery_data?.additionalDetails?.toLowerCase() || '',
            mystery.mystery_data?.scriptType?.toLowerCase() || ''
          ];
          
          // Check if any field includes the search term
          return searchableFields.some(field => field.includes(searchLower));
        });
      }
      
      // Sort by status (generating first, then by update time)
      validMysteries = validMysteries.sort((a, b) => {
        // Prioritize generating mysteries
        if (a.status === "generating" && b.status !== "generating") return -1;
        if (b.status === "generating" && a.status !== "generating") return 1;
        
        // Then sort by updated date
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      // Update allMysteries with the full list
      const updatedMysteries = reset ? validMysteries : [...allMysteries, ...validMysteries];
      setAllMysteries(updatedMysteries);
      
      // Update hasMorePages based on whether we received a full page of results
      setHasMorePages(validMysteries.length === pageSize);
      
      if (isSearching) {
        // If searching, apply search filter to the updated list
        applySearchFilter(searchTerm.trim().toLowerCase());
      } else {
        // Otherwise, update displayed mysteries with pagination
        updateDisplayedMysteries(updatedMysteries, reset ? 1 : pageNumber);
      }
      
      setPage(pageNumber);
    } catch (error) {
      console.error("Error fetching mysteries:", error);
      toast.error(t('homeDashboard.errors.loadFailed') as string);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!loading) {
      const nextPage = page + 1;
      
      if (isSearching) {
        // When searching and loading more, show more of the filtered results
        updateDisplayedMysteries(
          allMysteries.filter(mystery => {
            const searchLower = searchTerm.trim().toLowerCase();
            const searchableFields = [
              mystery.title?.toLowerCase() || '',
              mystery.ai_title?.toLowerCase() || '',
              mystery.theme?.toLowerCase() || '',
              mystery.mystery_data?.theme?.toLowerCase() || '',
              mystery.mystery_data?.additionalDetails?.toLowerCase() || '',
              mystery.mystery_data?.scriptType?.toLowerCase() || ''
            ];
            return searchableFields.some(field => field.includes(searchLower));
          }),
          nextPage
        );
      } else {
        // When not searching, fetch next page from server
        fetchMysteries(nextPage, false);
      }
      
      setPage(nextPage);
    }
  }, [loading, page, isSearching, searchTerm, allMysteries]);

  const handleViewMystery = useCallback((mysteryId: string) => {
    const mystery = displayedMysteries.find(m => m.id === mysteryId);
    
    if (mystery?.is_purchased || mystery?.status === "purchased" || mystery?.status === "generating") {
      navigate(`/mystery/${mysteryId}`);
    } else {
      navigate(`/mystery/edit/${mysteryId}`);
    }
  }, [displayedMysteries, navigate]);

  const handleEditMystery = useCallback((mysteryId: string) => {
    navigate(`/mystery/edit/${mysteryId}`);
  }, [navigate]);

  const handleArchiveMystery = async (mysteryId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ display_status: "archived" })
        .eq("id", mysteryId);
      
      if (error) {
        throw error;
      }
      
      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.success(t('common.notifications.archiveSuccess', { item: mysteryLabel, defaultValue: '{{item}} archived successfully' }));
      fetchMysteries(1, true);
    } catch (error) {
      console.error("Error archiving mystery:", error);
      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.error(t('common.notifications.archiveFailed', { item: mysteryLabel, defaultValue: 'Failed to archive {{item}}' }));
    }
  };

  const handleUnarchiveMystery = async (mysteryId: string) => {
    try {
      // Determine the correct status to restore to based on is_paid
      const mystery = displayedMysteries.find(m => m.id === mysteryId);
      const restoreStatus = mystery?.is_paid ? "purchased" : "draft";

      const { error } = await supabase
        .from("conversations")
        .update({ display_status: restoreStatus })
        .eq("id", mysteryId);

      if (error) throw error;

      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.success(t('common.notifications.unarchiveSuccess', { item: mysteryLabel, defaultValue: '{{item}} restored successfully' }));
      fetchMysteries(1, true);
    } catch (error) {
      console.error("Error unarchiving mystery:", error);
      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.error(t('common.notifications.unarchiveFailed', { item: mysteryLabel, defaultValue: 'Failed to restore {{item}}' }));
    }
  };

  const handleDeleteMystery = async (mysteryId: string) => {
    try {
      const { count: totalCount } = await supabase
        .from("conversations")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id);

      if (totalCount !== null) {
        setTotalMysteriesCount(totalCount);
      }

      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", mysteryId);
      
      if (error) {
        throw error;
      }
      
      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.success(t('common.notifications.deleteSuccess', { item: mysteryLabel, defaultValue: '{{item}} deleted successfully' }));
      fetchMysteries(1, true);
    } catch (error) {
      console.error("Error deleting mystery:", error);
      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.error(t('common.notifications.deleteFailed', { item: mysteryLabel, defaultValue: 'Failed to delete {{item}}' }));
    }
  };

  const handleMysteryUpdated = () => {
    fetchMysteries(1, true);
  };

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const searchLower = value.trim().toLowerCase();
    setSearchTerm(value);
    
    if (searchLower) {
      // When searching, filter the existing mysteries and update display
      const filteredMysteries = allMysteries.filter(mystery => {
        const searchableFields = [
          mystery.title?.toLowerCase() || '',
          mystery.ai_title?.toLowerCase() || '',
          mystery.theme?.toLowerCase() || '',
          mystery.mystery_data?.theme?.toLowerCase() || '',
          mystery.mystery_data?.additionalDetails?.toLowerCase() || '',
          mystery.mystery_data?.scriptType?.toLowerCase() || ''
        ];
        return searchableFields.some(field => field.includes(searchLower));
      });
      
      setPage(1);
      updateDisplayedMysteries(filteredMysteries, 1);
      setIsSearching(true);
    } else {
      // If clearing search, reset to show all mysteries with pagination
      setPage(1);
      updateDisplayedMysteries(allMysteries, 1);
      setIsSearching(false);
    }
  }, [allMysteries]);

  return (
    <div className="py-12 px-4 bg-card/30">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">{t('homeDashboard.title', { defaultValue: 'My Mysteries' })}</h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={t('homeDashboard.searchPlaceholder', { defaultValue: 'Search mysteries...' })}
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>

        {loading && displayedMysteries.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="opacity-70 animate-pulse h-56">
                <CardHeader className="h-16">
                  <div className="h-6 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-4"></div>
                  <div className="h-10 bg-muted rounded mt-auto"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayedMysteries.length === 0 ? (
          <div className="text-center py-16 px-6 bg-muted/20 rounded-lg">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <MagnifyingGlass className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">
              {totalMysteriesCount === 0
                ? t('homeDashboard.empty.firstMystery.title', { defaultValue: 'Create Your First Mystery' })
                : t('homeDashboard.empty.noResults.title', { defaultValue: 'No mysteries found' })}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {totalMysteriesCount === 0
                ? t('homeDashboard.empty.firstMystery.description', {
                    defaultValue: 'Design a custom murder mystery party in minutes using AI.'
                  })
                : t('homeDashboard.empty.noResults.description', {
                    defaultValue: 'Try adjusting your search or create a new mystery'
                  })}
            </p>
            {totalMysteriesCount === 0 && (
              <Button
                onClick={() => navigate("/mystery/create")}
                size="lg"
                className="h-12 px-8"
              >
                {t('homeDashboard.empty.firstMystery.cta', { defaultValue: 'Create My First Mystery' })}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedMysteries.map((mystery) => (
                <HomeMysteryCard 
                  key={mystery.id} 
                  mystery={{
                    id: mystery.id,
                    title: mystery.title,
                    mystery_data: mystery.mystery_data || {},
                    display_status: mystery.display_status || mystery.status, // Use display_status to preserve archived state
                    created_at: mystery.created_at,
                    is_completed: Boolean(mystery.is_completed),
                    is_paid: Boolean(mystery.is_paid)
                  }}
                  onView={handleViewMystery}
                  onEdit={handleEditMystery}
                  onArchive={handleArchiveMystery}
                  onUnarchive={handleUnarchiveMystery}
                  onDelete={handleDeleteMystery}
                />
              ))}
            </div>
            
            {(hasMorePages || displayedMysteries.length >= pageSize) && (
              <div className="mt-8 text-center">
                <Button 
                  onClick={handleLoadMore} 
                  variant="outline" 
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading 
                    ? t('homeDashboard.loading', { defaultValue: 'Loading...' }) 
                    : t('homeDashboard.loadMore', { defaultValue: 'Load More' })}
                  {!loading && <ArrowDown className="ml-2 h-4 w-4" />}
                </Button>
                <div className="mt-2 text-xs text-muted-foreground">
                  {(() => {
                    if (isSearching) {
                      const filteredTotal = allMysteries.filter(mystery => {
                        const searchLower = searchTerm.trim().toLowerCase();
                        const searchableFields = [
                          mystery.title?.toLowerCase() || '',
                          mystery.ai_title?.toLowerCase() || '',
                          mystery.theme?.toLowerCase() || '',
                          mystery.mystery_data?.theme?.toLowerCase() || '',
                          mystery.mystery_data?.additionalDetails?.toLowerCase() || '',
                          mystery.mystery_data?.scriptType?.toLowerCase() || ''
                        ];
                        return searchableFields.some(field => field.includes(searchLower));
                      }).length;
                      return `Showing ${displayedMysteries.length} of ${filteredTotal} mysteries`;
                    }
                    return `Showing ${displayedMysteries.length} of ${totalMysteriesCount} mysteries`;
                  })()}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

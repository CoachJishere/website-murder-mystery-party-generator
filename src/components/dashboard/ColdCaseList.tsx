import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Download, Clock, CheckCircle2, Play } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/formatDate";

// Cold-case cards for the unified dashboard grid (ADR-0029 amendment 2026-07-05 v3).
// One grid, mixed products, a type label per card — owner's call grounded in the data:
// nobody has ever ordered twice, so per-product sections were bureaucracy around a
// single item. The card shell mirrors HomeMysteryCard (badge header, title, date line,
// full-width action) so the grid reads as one product family.

const STATUS_URL =
  "https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/cold-case-status";
const SAMPLE_PATH = "/try-a-cold-case.html";
const SAMPLE_TITLE = "The Steinadler Funicular Death";

export interface ColdCaseOrder {
  id: string;
  case_title: string | null;
  status: "paid" | "generating" | "ready" | "failed" | "refunded";
  delivery_token: string;
  created_at: string;
}

function StatusBadge({ status }: { status: ColdCaseOrder["status"] }) {
  if (status === "paid" || status === "generating")
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-2 py-1">
        <Clock className="h-3 w-3 animate-pulse" /> Being written…
      </Badge>
    );
  if (status === "ready")
    return (
      <Badge variant="default" className="flex items-center gap-1 text-xs px-2 py-1">
        <CheckCircle2 className="h-3 w-3" /> Ready
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs px-2 py-1">
        <AlertCircle className="h-3 w-3" /> Needs attention
      </Badge>
    );
  return <Badge variant="secondary" className="text-xs px-2 py-1">Refunded</Badge>;
}

export function ColdCaseCard({ order }: { order: ColdCaseOrder }) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const generating = order.status === "paid" || order.status === "generating";

  // Direct download: mint a fresh signed URL and go. Falls back to the status page.
  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`${STATUS_URL}?token=${encodeURIComponent(order.delivery_token)}`);
      const body = await res.json();
      if (body.status === "ready" && body.download_url) {
        window.location.href = body.download_url;
        setTimeout(() => setDownloading(false), 2000);
        return;
      }
      throw new Error("not ready");
    } catch {
      setDownloading(false);
      navigate(`/cold-case/${order.delivery_token}`);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <StatusBadge status={order.status} />
            <Badge variant="outline" className="text-xs px-2 py-1 shrink-0" style={{ color: "#c2a14a", borderColor: "#c2a14a" }}>Cold case</Badge>
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-base sm:text-lg font-semibold leading-tight line-clamp-3">
            {order.case_title || (generating ? "Your case is being written" : "Cold case")}
          </h3>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col">
        <div className="space-y-3 flex-1 flex flex-col">
          <p className="text-sm text-muted-foreground flex-1">
            Ordered {formatDate(order.created_at)}
          </p>
          {order.status === "ready" ? (
            <Button onClick={download} disabled={downloading} className="w-full min-h-[44px] text-sm" variant="default">
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          ) : (
            <Button asChild className="w-full min-h-[44px] text-sm" variant="outline">
              <Link to={`/cold-case/${order.delivery_token}`}>
                <Clock className="h-4 w-4 mr-2" /> View status
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// The free trial, present for every signed-in user — labelled honestly.
export function SampleCard() {
  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Badge variant="secondary" className="text-xs px-2 py-1">Free trial</Badge>
            <Badge variant="outline" className="text-xs px-2 py-1 shrink-0" style={{ color: "#c2a14a", borderColor: "#c2a14a" }}>Cold case</Badge>
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-base sm:text-lg font-semibold leading-tight line-clamp-3">
            {SAMPLE_TITLE} (trial)
          </h3>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col">
        <div className="space-y-3 flex-1 flex flex-col">
          <p className="text-sm text-muted-foreground flex-1">
            Free — playable to the first objective
          </p>
          <Button asChild className="w-full min-h-[44px] text-sm" variant="outline">
            <a href={SAMPLE_PATH} target="_blank" rel="noopener">
              <Play className="h-4 w-4 mr-2" /> Play
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

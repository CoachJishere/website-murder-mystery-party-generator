
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Search, BookOpen, UserPlus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MysteryPreviewCardProps {
  mystery: {
    title: string;
    theme?: string;
    guests?: number;
    has_accomplice?: boolean;
    script_type?: string;
    mystery_style?: string;
  };
  parsedDetails?: {
    premise?: string;
    characters?: Array<{ name: string; description?: string }>;
  };
}

const MysteryPreviewCard = ({ mystery, parsedDetails }: MysteryPreviewCardProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  
  // Extract first paragraph from premise as teaser
  const teaser = parsedDetails?.premise?.split('\n\n')[0] || '';

  return (
    <Card className={cn(
      "h-full flex flex-col",
      isMobile && "shadow-sm"
    )}>
      <CardHeader className={cn(isMobile && "p-4 pb-3")}>
        <CardTitle className={cn(isMobile ? "text-lg" : "text-xl")}>
          {mystery.title.replace(/\*\*/g, '')}
        </CardTitle>
        <CardDescription className={cn(isMobile && "text-sm")}>
          {t('purchase.preview.title')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className={cn(
        "flex-grow space-y-6",
        isMobile && "p-4 pt-0 space-y-4"
      )}>
        {/* Core Details - Single Column */}
        <div className="space-y-1">
          <div className={cn(
            "flex items-center text-sm",
            isMobile && "text-xs"
          )}>
            <Users className={cn(
              "mr-2 text-muted-foreground",
              isMobile ? "h-3 w-3" : "h-4 w-4"
            )} />
            <span>{t('purchase.preview.playersLabel')}</span>
          </div>
          <p className={cn(
            "font-medium",
            isMobile && "text-sm"
          )}>
            {mystery.guests ? t('purchase.preview.playersCount', { count: mystery.guests }) : t('purchase.preview.unknownPlayers')}
          </p>
        </div>
        
        {/* Mystery Settings */}
        <div className={cn(
          "flex flex-wrap gap-x-4 gap-y-1.5",
          isMobile ? "text-xs" : "text-sm"
        )}>
          {mystery.mystery_style && (
            <div className="flex items-center text-muted-foreground">
              <Search className={cn("mr-1.5 shrink-0", isMobile ? "h-3 w-3" : "h-3.5 w-3.5")} />
              <span>{t(`purchase.preview.mysteryStyle.${mystery.mystery_style}`)}</span>
            </div>
          )}
          {mystery.script_type && (
            <div className="flex items-center text-muted-foreground">
              <BookOpen className={cn("mr-1.5 shrink-0", isMobile ? "h-3 w-3" : "h-3.5 w-3.5")} />
              <span>{t(`purchase.preview.scriptType.${mystery.script_type}`)}</span>
            </div>
          )}
          {mystery.has_accomplice && (
            <div className="flex items-center text-muted-foreground">
              <UserPlus className={cn("mr-1.5 shrink-0", isMobile ? "h-3 w-3" : "h-3.5 w-3.5")} />
              <span>{t('purchase.preview.hasAccomplice')}</span>
            </div>
          )}
        </div>

        {/* Story Teaser */}
        {teaser && (
          <div className="prose prose-sm max-w-none">
            <h3 className={cn(
              "font-medium",
              isMobile ? "text-sm" : "text-base"
            )}>
              {t('purchase.preview.storyTitle')}
            </h3>
            <p className={cn(
              "text-muted-foreground",
              isMobile ? "text-xs leading-relaxed" : "text-sm"
            )}>
              {teaser}
            </p>
            <p className={cn(
              "italic text-muted-foreground mt-2",
              isMobile ? "text-xs" : "text-xs"
            )}>
              {t('purchase.preview.unlockMessage')}
            </p>
          </div>
        )}
        
        {/* Character List */}
        {parsedDetails?.characters && parsedDetails.characters.length > 0 ? (
          <div>
            <h3 className={cn(
              "font-medium mb-2",
              isMobile ? "text-sm" : "text-base"
            )}>
              {t('purchase.preview.charactersTitle', { count: parsedDetails.characters.length })}
            </h3>
            <div className={cn(
              "space-y-1",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {parsedDetails.characters.map((char, i) => (
                <div key={i} className="leading-relaxed">
                  <span className="font-medium">{i + 1}. {char.name}</span>
                  {char.description && (
                    <span className="text-muted-foreground"> — {char.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : parsedDetails?.premise && (
          <div className={cn(
            "bg-amber-50 border border-amber-200 rounded-md p-3",
            isMobile ? "text-xs" : "text-sm"
          )}>
            <p className="text-amber-700">
              {t('purchase.preview.noCharactersWarning')}
            </p>
          </div>
        )}

        {/* Package Contents Preview */}
        <div className={cn(
          "bg-muted rounded-lg text-muted-foreground",
          isMobile ? "p-3 text-xs" : "p-4 text-sm"
        )}>
          <p className={cn(
            "font-medium mb-2",
            isMobile && "text-xs"
          )}>
            {t('purchase.preview.whatsIncluded')}
          </p>
          <ul className={cn(
            "list-disc space-y-1",
            isMobile ? "pl-3" : "pl-4"
          )}>
            {(() => {
              const items = t('purchase.preview.packageIncludes', { returnObjects: true });
              console.log('Translation items:', items, 'Type:', typeof items, 'Is Array:', Array.isArray(items));
              
              if (Array.isArray(items)) {
                return items.map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ));
              }
              
              // More defensive fallback
              console.warn('Translation failed, using fallback');
              return [
                "Detailed host guide with complete setup instructions",
                "Character guides for each player", 
                "Evidence cards and printable materials",
                "Full gameplay script and timeline"
              ].map((item, index) => (
                <li key={index}>{item}</li>
              ));
            })()}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default MysteryPreviewCard;

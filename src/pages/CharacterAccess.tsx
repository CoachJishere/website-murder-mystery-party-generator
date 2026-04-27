import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, User } from "lucide-react";
import "../styles/print.css";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import { useTranslation, Trans } from "react-i18next";

interface CharacterAssignment {
  id: string;
  guest_name: string;
  guest_email: string;
  mystery_characters: {
    character_name: string;
    description: string;
    background: string;
    secret: string;
    introduction: string;
    introduction_pointform?: string | null;
    rumors: string;
    rumors_pointform?: string | null;
    accusations?: string | null;
    accusations_pointform?: string | null;
    round2_questions: string;
    round3_questions: string;
    round4_questions: string;
    // Legacy per-role columns (character-based mysteries)
    round2_innocent: string;
    round2_guilty: string;
    round2_accomplice: string;
    round3_innocent: string;
    round3_guilty: string;
    round3_accomplice: string;
    round4_innocent: string;
    round4_guilty: string;
    round4_accomplice: string;
    final_innocent: string;
    final_guilty: string;
    final_accomplice: string;
    // Unified columns (detective-style mysteries)
    round2_script?: string | null;
    round2_script_pointform?: string | null;
    round3_script?: string | null;
    round3_script_pointform?: string | null;
    round4_script?: string | null;
    round4_script_pointform?: string | null;
    final_statement?: string | null;
    final_statement_pointform?: string | null;
    relationships: any;
    secrets: any;
  };
}

type ScriptType = 'full' | 'pointForm' | 'both';

const CharacterAccess: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [assignment, setAssignment] = useState<CharacterAssignment | null>(null);
  const [scriptType, setScriptType] = useState<ScriptType>('full');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (token) {
      loadCharacterAssignment();
    } else {
      setError("No access token provided");
      setLoading(false);
    }
  }, [token]);

  const loadCharacterAssignment = async () => {
    if (!token) {
      setError("Access token is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // First, get the character assignment via secure RPC
      const { data: assignmentData, error: assignmentError } = await supabase
        .rpc('get_character_by_token', { access_token_param: token })
        .single();

      if (assignmentError) {
        console.error('Assignment error:', assignmentError);
        setError(t('characterAccess.errors.assignmentNotFound'));
        return;
      }

      // Then, get the character details via secure RPC (validates token ownership)
      const { data: characterData, error: characterError } = await supabase
        .rpc('get_character_details', { char_id: assignmentData.character_id, access_token_param: token })
        .single();

      if (characterError) {
        console.error('Character error:', characterError);
        setError(t('characterAccess.errors.dataNotFound'));
        return;
      }

      // Combine the data
      setAssignment({
        ...assignmentData,
        mystery_characters: characterData
      });

      // Fetch the host's display preference (full / pointForm / both) for this packet
      const { data: meta } = await supabase
        .rpc('get_packet_metadata_by_token', { access_token_param: token })
        .single();
      const t = (meta as any)?.script_type;
      if (t === 'full' || t === 'pointForm' || t === 'both') {
        setScriptType(t);
      }
    } catch (error: any) {
      console.error('Error loading character assignment:', error);
      setError(`${t('characterAccess.errors.loadFailed')}: ${error.message || t('auth.errors.unknownError')}`);
    } finally {
      setLoading(false);
    }
  };

  const cleanMarkdownHeaders = (text: string): string => {
    return text
      .replace(/^If You're (Innocent|Guilty)( \(Final\))?:/gm, '')
      .replace(/Point form script: (•[^•]+)/g, (match, content) => {
        const items = content.split('•').filter(i => i.trim());
        return '\n' + items.map(item => `- ${item.trim()}`).join('\n');
      })
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Wrap a detailed prose body in straight quotes so it reads obviously as a
  // line to deliver aloud. Strips any leading inline bold "labels" the model
  // baked in (`**IF YOU'RE INNOCENT**`, `**WHEN ASKED ABOUT YOUR MOTIVE:**`)
  // since we already show the role label above. Skips wrapping when content
  // already starts with a bullet — bullets are tactical reminders, not speech.
  const wrapProseInQuotes = (text: string): string => {
    if (!text) return text;
    let body = text.trim();
    // Don't wrap bullet lists in quotes
    if (body.startsWith('-') || body.startsWith('•') || body.startsWith('*')) return text;
    // Don't wrap markdown headings as the spoken text
    if (body.startsWith('#')) return text;
    // Strip any number of leading inline bold "stage direction" headers that
    // the model added (e.g. **IF YOU'RE INNOCENT**, **When asked about ...:**)
    while (true) {
      const stripped = body.replace(/^\*\*[^*\n]+\*\*\s*\n+/, '');
      if (stripped === body) break;
      body = stripped;
    }
    body = body.trim();
    if (!body) return text;
    // Already wrapped? Leave alone.
    if (body.startsWith('"') && body.endsWith('"')) return body;
    return `"${body}"`;
  };

  // Format a "spoken" field that has detailed prose + optional point-form sibling.
  // Output respects the host's script_type choice:
  //   full      -> detailed only (prose wrapped in quotes for clarity)
  //   pointForm -> bullets only (with synthesized header from fallbackHeader if needed)
  //   both      -> detailed prose (in quotes), then "**Point Form:**" + bullets stacked underneath
  const formatScriptField = (
    detailed: string | null | undefined,
    pointForm: string | null | undefined,
    fallbackHeader: string,
  ): string => {
    const d = (detailed || '').trim();
    const p = (pointForm || '').trim();
    if (!d && !p) return '';
    if (scriptType === 'full' || !p) return d;
    if (scriptType === 'pointForm') {
      // Bullets don't carry their own section header — synthesize one if needed
      return p.startsWith('#') || p.startsWith('**') ? p : `## ${fallbackHeader}\n\n${p}`;
    }
    // 'both' — stack detailed (with its baked-in header) + point-form section
    if (!d) return p;
    return `${d}\n\n**Point Form:**\n\n${p}`;
  };

  const buildCharacterGuideContent = (character: any): string => {
    let content = `# ${character.character_name} - Your Character\n\n`;

    // Static character info — no pointform variants
    if (character.description) content += `${cleanMarkdownHeaders(character.description)}\n\n`;
    if (character.background) content += `${cleanMarkdownHeaders(character.background)}\n\n`;
    if (character.relationships && typeof character.relationships === 'string') {
      content += `${cleanMarkdownHeaders(character.relationships)}\n\n`;
    }
    if (character.secret) content += `${cleanMarkdownHeaders(character.secret)}\n\n`;

    // Round 1 setup — has pointform variants
    const introBlock = formatScriptField(
      character.introduction, character.introduction_pointform,
      'ROUND 1: YOUR INTRODUCTION',
    );
    if (introBlock) {
      // Pull off the section heading, wrap the prose body in quotes, re-emit
      const m = introBlock.match(/^(##\s+[^\n]+\n+)([\s\S]*)$/);
      if (m && (scriptType === 'full' || (scriptType === 'both' && !introBlock.includes('**Point Form:**')))) {
        content += `${m[1]}${wrapProseInQuotes(m[2])}\n\n`;
      } else {
        content += `${cleanMarkdownHeaders(introBlock)}\n\n`;
      }
    }

    const rumorsBlock = formatScriptField(
      character.rumors, character.rumors_pointform,
      'RUMORS TO SPREAD',
    );
    if (rumorsBlock) content += `${cleanMarkdownHeaders(rumorsBlock)}\n\n`;

    // For each role variant, strip its baked-in `## ROUND N:` heading so we don't
    // get duplicate round headers when innocent + guilty + accomplice are stacked.
    // We add a single round heading manually for the entire round block.
    const stripRoundHeader = (s: string | null | undefined): string => {
      if (!s) return '';
      return s.replace(/^##\s+ROUND\s+\d+[^\n]*\n+/i, '').trim();
    };

    // Rounds 2-4 — prefer unified `round_script` (detective-style); fall back to per-role
    // columns (character-based) when the unified column is absent. Both paths respect
    // the host's script_type choice (pointForm/full/both) via formatScriptField.
    const renderRound = (roundNum: 2 | 3 | 4) => {
      const questions = character[`round${roundNum}_questions`];
      if (questions) content += `${cleanMarkdownHeaders(questions)}\n\n`;

      const unified = character[`round${roundNum}_script`];
      const unifiedPF = character[`round${roundNum}_script_pointform`];
      if (unified) {
        const block = formatScriptField(unified, unifiedPF, `ROUND ${roundNum}`);
        if (block) {
          // For prose modes, wrap the body in quotes (after the section heading)
          const m = block.match(/^(##\s+[^\n]+\n+)([\s\S]*)$/);
          if (m && scriptType === 'full') {
            content += `${m[1]}${wrapProseInQuotes(m[2])}\n\n`;
          } else if (m && scriptType === 'both') {
            // Both mode: split prose from "**Point Form:**" section, wrap only the prose
            const split = m[2].split(/\n+\*\*Point Form:\*\*\n+/);
            if (split.length === 2) {
              content += `${m[1]}${wrapProseInQuotes(split[0])}\n\n**Point Form:**\n\n${split[1]}\n\n`;
            } else {
              content += `${cleanMarkdownHeaders(block)}\n\n`;
            }
          } else {
            content += `${cleanMarkdownHeaders(block)}\n\n`;
          }
        }
        return;
      }

      // Per-role variants (character-based mysteries). Each variant has its own
      // pointform sibling. We render a single round heading, then each role section
      // with the format the host picked.
      const variants: Array<{ label: string; key: string }> = [
        { label: "If You're Innocent:",      key: 'innocent' },
        { label: "If You're Guilty:",        key: 'guilty' },
        { label: "If You're an Accomplice:", key: 'accomplice' },
      ];
      const roleBlocks: string[] = [];
      for (const v of variants) {
        const detailed = character[`round${roundNum}_${v.key}`];
        const pointForm = character[`round${roundNum}_${v.key}_pointform`];
        if (!detailed && !pointForm) continue;
        const formatted = formatScriptField(detailed, pointForm, `ROUND ${roundNum}`);
        if (!formatted) continue;
        // Strip the variant's baked-in `## ROUND N` header — we'll add one round-level header above
        const cleaned = stripRoundHeader(formatted);
        // Wrap the prose body in quotes so it reads obviously as a script to deliver
        const quoted = wrapProseInQuotes(cleaned);
        roleBlocks.push(`**${v.label}**\n\n${quoted}`);
      }
      if (roleBlocks.length > 0) {
        content += `## ROUND ${roundNum}\n\n${roleBlocks.join('\n\n')}\n\n`;
      }
    };
    renderRound(2);
    renderRound(3);
    renderRound(4);

    // Final statement — prefer unified, fall back to per-role variants
    if (character.final_statement) {
      const finalBlock = formatScriptField(
        character.final_statement, character.final_statement_pointform,
        'FINAL STATEMENT',
      );
      if (finalBlock) {
        const m = finalBlock.match(/^(##\s+[^\n]+\n+)([\s\S]*)$/);
        if (m && scriptType === 'full') {
          content += `${m[1]}${wrapProseInQuotes(m[2])}\n\n`;
        } else if (m && scriptType === 'both') {
          const split = m[2].split(/\n+\*\*Point Form:\*\*\n+/);
          if (split.length === 2) {
            content += `${m[1]}${wrapProseInQuotes(split[0])}\n\n**Point Form:**\n\n${split[1]}\n\n`;
          } else {
            content += `${cleanMarkdownHeaders(finalBlock)}\n\n`;
          }
        } else {
          content += `${cleanMarkdownHeaders(finalBlock)}\n\n`;
        }
      }
    } else {
      const finalVariants: Array<{ label: string; key: string }> = [
        { label: "If You're Innocent (Final):",      key: 'innocent' },
        { label: "If You're Guilty (Final):",        key: 'guilty' },
        { label: "If You're an Accomplice (Final):", key: 'accomplice' },
      ];
      const finalBlocks: string[] = [];
      for (const v of finalVariants) {
        const detailed = character[`final_${v.key}`];
        const pointForm = character[`final_${v.key}_pointform`];
        if (!detailed && !pointForm) continue;
        const formatted = formatScriptField(detailed, pointForm, 'FINAL STATEMENT');
        if (!formatted) continue;
        const cleaned = formatted.replace(/^##\s+FINAL[^\n]*\n+/i, '').trim();
        const quoted = wrapProseInQuotes(cleaned);
        finalBlocks.push(`**${v.label}**\n\n${quoted}`);
      }
      if (finalBlocks.length > 0) {
        content += `## FINAL STATEMENT\n\n${finalBlocks.join('\n\n')}\n\n`;
      }
    }

    // Accusations — has pointform variants (only populated for guilty/accomplice)
    if (character.accusations) {
      const accBlock = formatScriptField(
        character.accusations, character.accusations_pointform,
        'ACCUSATIONS',
      );
      if (accBlock) content += `${cleanMarkdownHeaders(accBlock)}\n\n`;
    }

    return content;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>{t('character.access.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center text-red-600">{t('character.access.accessDenied')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {error || t('character.access.characterNotFound')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const characterContent = buildCharacterGuideContent(assignment.mystery_characters);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <User className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{t('character.access.welcome', { name: assignment.guest_name })}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('characterAccess.subtitle')}
          </p>
          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="mt-3 gap-2 print:hidden"
          >
            <Download className="h-4 w-4" />
            {t('mysteryPackage.export.saveAsPdf')}
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mystery-content">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-4 text-primary">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold mb-3 text-secondary">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="ml-2">
                      {children}
                    </li>
                  ),
                }}
              >
                {buildCharacterGuideContent(assignment.mystery_characters)}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        <div className="character-packet-footer mt-8 text-center text-sm text-muted-foreground border-t border-border/40 pt-6">
          <p className="mb-1">
            <Trans
              i18nKey="characterAccess.footer.lovedPlaying"
              values={{ character: assignment.mystery_characters.character_name }}
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </p>
          <p>
            {t('characterAccess.footer.hostCta')}{" "}
            <a
              href="https://www.mysterymaker.party/?utm_source=share&utm_medium=character_packet&utm_campaign=guest_footer"
              className="text-primary underline"
            >
              mysterymaker.party
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CharacterAccess;

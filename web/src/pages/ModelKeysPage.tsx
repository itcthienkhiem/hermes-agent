import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { EnvVarInfo } from "@/lib/api";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@nous-research/ui/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nous-research/ui/ui/components/card";
import { Badge } from "@nous-research/ui/ui/components/badge";
import { Input } from "@nous-research/ui/ui/components/input";
import { Label } from "@nous-research/ui/ui/components/label";
import { ListItem } from "@nous-research/ui/ui/components/list-item";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import { Toast } from "@nous-research/ui/ui/components/toast";
import { useConfirmDelete } from "@nous-research/ui/hooks/use-confirm-delete";
import { useToast } from "@nous-research/ui/hooks/use-toast";
import { OAuthProvidersCard } from "@/components/OAuthProvidersCard";
import { PluginSlot } from "@/plugins";

const PROVIDER_GROUPS: { prefix: string; name: string; priority: number }[] = [
  { prefix: "NOUS_", name: "Nous Portal", priority: 0 },
  { prefix: "ANTHROPIC_", name: "Anthropic", priority: 1 },
  { prefix: "DASHSCOPE_", name: "DashScope (Qwen)", priority: 2 },
  { prefix: "HERMES_QWEN_", name: "DashScope (Qwen)", priority: 2 },
  { prefix: "DEEPSEEK_", name: "DeepSeek", priority: 3 },
  { prefix: "GOOGLE_", name: "Gemini", priority: 4 },
  { prefix: "GEMINI_", name: "Gemini", priority: 4 },
  { prefix: "GLM_", name: "GLM / Z.AI", priority: 5 },
  { prefix: "ZAI_", name: "GLM / Z.AI", priority: 5 },
  { prefix: "Z_AI_", name: "GLM / Z.AI", priority: 5 },
  { prefix: "HF_", name: "Hugging Face", priority: 6 },
  { prefix: "KIMI_", name: "Kimi / Moonshot", priority: 7 },
  { prefix: "MINIMAX_CN_", name: "MiniMax (China)", priority: 9 },
  { prefix: "MINIMAX_", name: "MiniMax", priority: 8 },
  { prefix: "AGNES_", name: "Agnes AI", priority: 10 },
  { prefix: "OPENCODE_GO_", name: "OpenCode Go", priority: 10 },
  { prefix: "OPENCODE_ZEN_", name: "OpenCode Zen", priority: 11 },
  { prefix: "OPENROUTER_", name: "OpenRouter", priority: 12 },
  { prefix: "XIAOMI_", name: "Xiaomi MiMo", priority: 13 },
];

interface ProviderKeyGroup {
  entries: [string, EnvVarInfo][];
  hasAnySet: boolean;
  name: string;
  priority: number;
}

function providerGroupFor(key: string): { name: string; priority: number } {
  const found = PROVIDER_GROUPS.find((group) => key.startsWith(group.prefix));
  return found ?? { name: "Other providers", priority: 99 };
}

function redactedPreview(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function ProviderKeyRow({
  clearDialogOpen,
  edits,
  info,
  onCancelEdit,
  onClear,
  onReveal,
  onSave,
  revealed,
  saving,
  setEdits,
  varKey,
}: {
  clearDialogOpen?: boolean;
  edits: Record<string, string>;
  info: EnvVarInfo;
  onCancelEdit: (key: string) => void;
  onClear: (key: string) => void;
  onReveal: (key: string) => void;
  onSave: (key: string) => void;
  revealed: Record<string, string>;
  saving: string | null;
  setEdits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  varKey: string;
}) {
  const isEditing = edits[varKey] !== undefined;
  const isRevealed = !!revealed[varKey];
  const displayValue = isRevealed
    ? revealed[varKey]
    : (info.redacted_value ?? "Not set");

  return (
    <div className="grid min-w-0 gap-3 border border-border/60 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Label className="font-mono-ui text-xs [overflow-wrap:anywhere]">
              {varKey}
            </Label>
            <Badge tone={info.is_set ? "success" : "outline"}>
              {info.is_set ? "Set" : "Not set"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{info.description}</p>
        </div>

        {info.url && (
          <a
            href={info.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
          >
            Get key <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {!isEditing ? (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className={`min-w-0 flex-1 border border-border px-3 py-2 font-mono-ui text-xs [overflow-wrap:anywhere] ${
              isRevealed
                ? "bg-background text-foreground select-all"
                : "bg-muted/30 text-muted-foreground"
            }`}
          >
            {displayValue}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {info.is_set && (
              <Button
                ghost
                size="icon"
                onClick={() => onReveal(varKey)}
                title={isRevealed ? "Hide value" : "Reveal value"}
                aria-label={isRevealed ? `Hide ${varKey}` : `Reveal ${varKey}`}
              >
                {isRevealed ? <EyeOff /> : <Eye />}
              </Button>
            )}
            <Button
              size="sm"
              outlined
              prefix={<Pencil />}
              onClick={() => setEdits((prev) => ({ ...prev, [varKey]: "" }))}
            >
              {info.is_set ? "Replace" : "Set"}
            </Button>
            {info.is_set && (
              <Button
                size="sm"
                outlined
                destructive
                prefix={<Trash2 />}
                onClick={() => onClear(varKey)}
                disabled={saving === varKey || clearDialogOpen}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            autoFocus
            type="password"
            value={edits[varKey]}
            onChange={(event) =>
              setEdits((prev) => ({ ...prev, [varKey]: event.target.value }))
            }
            placeholder={
              info.is_set
                ? `Replace current value (${info.redacted_value ?? "set"})`
                : "Paste API key"
            }
            className="min-w-0 flex-1 font-mono-ui text-xs"
          />
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              prefix={<Save />}
              disabled={saving === varKey || !edits[varKey]}
              onClick={() => onSave(varKey)}
            >
              {saving === varKey ? "Saving" : "Save"}
            </Button>
            <Button
              size="sm"
              outlined
              prefix={<X />}
              onClick={() => onCancelEdit(varKey)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderKeyGroupCard({
  clearDialogOpen,
  edits,
  group,
  onCancelEdit,
  onClear,
  onReveal,
  onSave,
  revealed,
  saving,
  setEdits,
}: {
  clearDialogOpen?: boolean;
  edits: Record<string, string>;
  group: ProviderKeyGroup;
  onCancelEdit: (key: string) => void;
  onClear: (key: string) => void;
  onReveal: (key: string) => void;
  onSave: (key: string) => void;
  revealed: Record<string, string>;
  saving: string | null;
  setEdits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [expanded, setExpanded] = useState(group.hasAnySet);
  const configured = group.entries.filter(([, info]) => info.is_set).length;
  const docsUrl = group.entries.find(([, info]) => info.url)?.[1].url;

  return (
    <div className="border border-border">
      <ListItem
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="justify-between gap-3 px-4 py-3 hover:bg-primary/5"
      >
        <div className="flex min-w-0 items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-semibold tracking-wide">
            {group.name}
          </span>
          <Badge tone={configured > 0 ? "success" : "outline"}>
            {configured}/{group.entries.length}
          </Badge>
        </div>

        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
          >
            Get key <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </ListItem>

      {expanded && (
        <div className="grid gap-3 border-t border-border p-4">
          {group.entries.map(([key, info]) => (
            <ProviderKeyRow
              clearDialogOpen={clearDialogOpen}
              edits={edits}
              info={info}
              key={key}
              onCancelEdit={onCancelEdit}
              onClear={onClear}
              onReveal={onReveal}
              onSave={onSave}
              revealed={revealed}
              saving={saving}
              setEdits={setEdits}
              varKey={key}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ModelKeysPage() {
  const [vars, setVars] = useState<Record<string, EnvVarInfo> | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const { toast, showToast } = useToast();

  useEffect(() => {
    api.getEnvVars().then(setVars).catch(() => setVars({}));
  }, []);

  const groups = useMemo(() => {
    if (!vars) return [];
    const grouped = new Map<string, ProviderKeyGroup>();
    for (const [key, info] of Object.entries(vars)) {
      if (info.category !== "provider") continue;
      if (!showAdvanced && info.advanced) continue;
      const { name, priority } = providerGroupFor(key);
      const group =
        grouped.get(name) ??
        { entries: [], hasAnySet: false, name, priority };
      group.entries.push([key, info]);
      group.hasAnySet ||= info.is_set;
      grouped.set(name, group);
    }
    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        entries: group.entries.sort(([a], [b]) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  }, [showAdvanced, vars]);

  const configuredCount = groups.filter((group) => group.hasAnySet).length;

  const handleSave = async (key: string) => {
    const value = edits[key];
    if (!value) return;
    setSaving(key);
    try {
      await api.setEnvVar(key, value);
      setVars((prev) =>
        prev
          ? {
              ...prev,
              [key]: {
                ...prev[key],
                is_set: true,
                redacted_value: redactedPreview(value),
              },
            }
          : prev,
      );
      setEdits((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      showToast(`${key} saved`, "success");
    } catch (error) {
      showToast(`Failed to save ${key}: ${error}`, "error");
    } finally {
      setSaving(null);
    }
  };

  const keyClear = useConfirmDelete({
    onDelete: useCallback(
      async (key: string) => {
        setSaving(key);
        try {
          await api.deleteEnvVar(key);
          setVars((prev) =>
            prev
              ? {
                  ...prev,
                  [key]: { ...prev[key], is_set: false, redacted_value: null },
                }
              : prev,
          );
          setEdits((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setRevealed((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          showToast(`${key} cleared`, "success");
        } catch (error) {
          showToast(`Failed to clear ${key}: ${error}`, "error");
          throw error;
        } finally {
          setSaving(null);
        }
      },
      [showToast],
    ),
  });

  const handleReveal = async (key: string) => {
    if (revealed[key]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    try {
      const resp = await api.revealEnvVar(key);
      setRevealed((prev) => ({ ...prev, [key]: resp.value }));
    } catch {
      showToast(`Failed to reveal ${key}`, "error");
    }
  };

  const cancelEdit = (key: string) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (!vars) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="text-2xl text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PluginSlot name="model-keys:top" />
      <Toast toast={toast} />

      <DeleteConfirmDialog
        open={keyClear.isOpen}
        onCancel={keyClear.cancel}
        onConfirm={keyClear.confirm}
        title="Clear model API key?"
        description={
          keyClear.pendingId
            ? `${keyClear.pendingId} will be removed from ~/.hermes/.env.`
            : "This key will be removed from ~/.hermes/.env."
        }
        loading={keyClear.isDeleting}
      />

      <Card>
        <CardHeader className="border-b border-border bg-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Model API Keys</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Configure LLM provider credentials stored in{" "}
                <code>~/.hermes/.env</code>. Changes apply to new requests.
              </CardDescription>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge tone={configuredCount > 0 ? "success" : "outline"}>
                {configuredCount}/{groups.length} providers configured
              </Badge>
              <Button
                size="sm"
                outlined
                onClick={() => setShowAdvanced((show) => !show)}
              >
                {showAdvanced ? "Hide advanced" : "Show advanced"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <OAuthProvidersCard
        onError={(message) => showToast(message, "error")}
        onSuccess={(message) => showToast(message, "success")}
      />

      <Card>
        <CardHeader className="border-b border-border bg-card">
          <CardTitle className="text-base">API key providers</CardTitle>
          <CardDescription>
            Paste keys for OpenRouter, Anthropic, Gemini, DeepSeek and other
            model providers.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-0 p-0">
          {groups.length > 0 ? (
            groups.map((group) => (
              <ProviderKeyGroupCard
                clearDialogOpen={keyClear.isOpen}
                edits={edits}
                group={group}
                key={group.name}
                onCancelEdit={cancelEdit}
                onClear={keyClear.requestDelete}
                onReveal={handleReveal}
                onSave={handleSave}
                revealed={revealed}
                saving={saving}
                setEdits={setEdits}
              />
            ))
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              No model provider API keys are exposed by this Hermes build.
            </div>
          )}
        </CardContent>
      </Card>

      <PluginSlot name="model-keys:bottom" />
    </div>
  );
}

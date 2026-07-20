"use client";

import { useState, useTransition } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";

import { buildExternalCvPrompt } from "@/app/actions/resume";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function ExternalCvPromptModal({
  open,
  onOpenChange,
  jobId,
  jobLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: number;
  jobLabel?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function loadPrompt() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await buildExternalCvPrompt(jobId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPrompt(result.prompt);
    });
  }

  async function copy() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) loadPrompt();
        else {
          setPrompt("");
          setError(null);
          setCopied(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Prompt para chat externo</DialogTitle>
          <DialogDescription>
            Copia este prompt a ChatGPT / Claude / etc. para adaptar carta o CV
            {jobLabel ? ` respecto a «${jobLabel}»` : ""}.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <Textarea
          rows={12}
          value={pending ? "Generando prompt…" : prompt}
          readOnly
          className="font-mono text-xs"
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || !prompt}
            onClick={() => void copy()}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

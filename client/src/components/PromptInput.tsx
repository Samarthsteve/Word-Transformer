import { motion } from "framer-motion";
import { Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { presetPrompts } from "@shared/schema";

type PromptInputProps = {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasTokens: boolean;
};

export function PromptInput({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  hasTokens,
}: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (prompt.trim() && !isGenerating) {
        onGenerate();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto space-y-4"
    >
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Enter Your Prompt
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="button-presets">
              Presets
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {presetPrompts.map((preset, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => onPromptChange(preset)}
                className="cursor-pointer"
                data-testid={`menu-item-preset-${index}`}
              >
                <span className="truncate">{preset}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a prompt to see how the AI generates text token by token..."
          disabled={isGenerating || hasTokens}
          className="min-h-[120px] text-lg md:text-xl resize-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="input-prompt"
        />
        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
          {prompt.length} characters
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Cmd</kbd>+<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> to generate
        </span>
        
        <Button
          onClick={onGenerate}
          disabled={!prompt.trim() || isGenerating || hasTokens}
          size="lg"
          className="gap-2 px-8"
          data-testid="button-generate"
        >
          <Sparkles className="w-5 h-5" />
          {isGenerating ? "Generating..." : "Generate"}
        </Button>
      </div>
    </motion.div>
  );
}

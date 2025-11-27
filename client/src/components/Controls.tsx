import { motion } from "framer-motion";
import { SkipForward, ChevronRight, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type ControlsProps = {
  onNext: () => void;
  onFastForward: () => void;
  onReset: () => void;
  canNext: boolean;
  canFastForward: boolean;
  isComplete: boolean;
  currentIndex: number;
  totalTokens: number;
};

export function Controls({
  onNext,
  onFastForward,
  onReset,
  canNext,
  canFastForward,
  isComplete,
  currentIndex,
  totalTokens,
}: ControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex flex-col items-center gap-6"
    >
      {totalTokens > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <span data-testid="text-token-counter">
            {currentIndex + 1} / {totalTokens} tokens
          </span>
          {isComplete && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-green-500 dark:text-green-400"
            >
              <Check className="w-4 h-4" />
              Complete
            </motion.span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button
          onClick={onNext}
          disabled={!canNext}
          size="lg"
          className="min-w-[140px] gap-2"
          data-testid="button-next"
        >
          <ChevronRight className="w-5 h-5" />
          Next Token
        </Button>

        <Button
          onClick={onFastForward}
          disabled={!canFastForward}
          variant="secondary"
          size="lg"
          className="min-w-[140px] gap-2"
          data-testid="button-fast-forward"
        >
          <SkipForward className="w-5 h-5" />
          Fast Forward
        </Button>

        <Button
          onClick={onReset}
          variant="outline"
          size="lg"
          className="min-w-[120px] gap-2"
          data-testid="button-reset"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </Button>
      </div>
    </motion.div>
  );
}

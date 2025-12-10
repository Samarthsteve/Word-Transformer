import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Layers, Brain, BarChart3, CheckCircle2, GitBranch } from "lucide-react";

type AnnotationState = "idle" | "generating" | "revealing" | "showing-probabilities" | "complete" | "regenerating";

type EducationalAnnotationProps = {
  state: AnnotationState;
  currentTokenIndex: number;
  totalTokens: number;
};

type AnnotationContent = {
  title: string;
  subtitle: string;
  icon: typeof Lightbulb;
  color: string;
};

const annotations: Record<AnnotationState, AnnotationContent> = {
  idle: {
    title: "Welcome to GSV AI Exhibition",
    subtitle: "The AI architecture behind ChatGPT & Gemini",
    icon: Lightbulb,
    color: "text-amber-500",
  },
  generating: {
    title: "Tokenization & Embedding",
    subtitle: "Converting words into vectors",
    icon: Layers,
    color: "text-purple-500",
  },
  revealing: {
    title: "Self-Attention",
    subtitle: "Computing word relationships",
    icon: Brain,
    color: "text-blue-500",
  },
  "showing-probabilities": {
    title: "Probability Distribution",
    subtitle: "Click alternatives to explore different paths",
    icon: BarChart3,
    color: "text-green-500",
  },
  complete: {
    title: "Generation Complete",
    subtitle: "Built token-by-token in an autoregressive loop",
    icon: CheckCircle2,
    color: "text-emerald-500",
  },
  regenerating: {
    title: "Exploring Alternative Path",
    subtitle: "Recomputing with new context",
    icon: GitBranch,
    color: "text-orange-500",
  },
};

export function EducationalAnnotation({ state, currentTokenIndex, totalTokens }: EducationalAnnotationProps) {
  const annotation = annotations[state];
  const Icon = annotation.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center gap-3 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50"
      >
        <motion.div
          animate={state === "generating" || state === "regenerating" ? { 
            rotate: [0, 360]
          } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Icon className={`w-4 h-4 ${annotation.color}`} />
        </motion.div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm font-semibold text-foreground">
            {annotation.title}
          </span>
          <span className="text-[10px] md:text-xs text-muted-foreground">
            {annotation.subtitle}
          </span>
        </div>

        {(state === "revealing" || state === "showing-probabilities") && totalTokens > 0 && (
          <span className="text-[10px] md:text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded">
            {currentTokenIndex + 1}/{totalTokens}
          </span>
        )}

        {(state === "generating" || state === "regenerating") && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-primary"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

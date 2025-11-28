import { motion, AnimatePresence } from "framer-motion";
import { Info, Lightbulb, Zap, BarChart3, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";

type AnnotationState = "idle" | "generating" | "revealing" | "showing-probabilities" | "complete" | "regenerating";

type EducationalAnnotationProps = {
  state: AnnotationState;
  currentTokenIndex: number;
  totalTokens: number;
};

const annotations: Record<AnnotationState, { 
  title: string; 
  description: string; 
  icon: typeof Info;
  color: string;
}> = {
  idle: {
    title: "Ready to Begin",
    description: "Enter a prompt and click Generate. The AI will process your text and predict the most likely next words, one at a time.",
    icon: Lightbulb,
    color: "text-amber-500",
  },
  generating: {
    title: "Encoding Your Input",
    description: "The transformer is converting your words into numerical patterns called 'embeddings' - like translating text into a language the AI understands.",
    icon: Sparkles,
    color: "text-purple-500",
  },
  revealing: {
    title: "Predicting Next Token",
    description: "The transformer analyzes all previous words to predict what comes next. It calculates probabilities for thousands of possible words!",
    icon: Zap,
    color: "text-blue-500",
  },
  "showing-probabilities": {
    title: "Probability Distribution",
    description: "These bars show the model's confidence in different word choices. The AI picks from the most likely options - you can click alternatives to explore different paths!",
    icon: BarChart3,
    color: "text-green-500",
  },
  complete: {
    title: "Generation Complete",
    description: "Each word was chosen from thousands of possibilities. The transformer built this response by predicting one word at a time, always looking at everything that came before.",
    icon: CheckCircle2,
    color: "text-emerald-500",
  },
  regenerating: {
    title: "Exploring a New Path",
    description: "You picked a different word! Watch how this single change ripples forward - the AI must now predict a completely new continuation based on your choice.",
    icon: RefreshCw,
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
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl mx-auto"
      >
        <motion.div 
          className="flex items-start gap-3 md:gap-4 p-3 md:p-5 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg"
          animate={{
            borderColor: state === "generating" || state === "regenerating" 
              ? ["rgba(var(--primary), 0.3)", "rgba(var(--primary), 0.6)", "rgba(var(--primary), 0.3)"]
              : undefined,
          }}
          transition={{ duration: 1.5, repeat: state === "generating" || state === "regenerating" ? Infinity : 0 }}
        >
          <motion.div 
            className="shrink-0 mt-0.5"
            animate={state === "generating" || state === "regenerating" ? { 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            } : {}}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity }
            }}
          >
            <Icon className={`w-5 h-5 md:w-6 md:h-6 ${annotation.color}`} />
          </motion.div>
          <div className="space-y-1 md:space-y-2 min-w-0">
            <h4 className="font-bold text-sm md:text-base text-foreground tracking-tight">{annotation.title}</h4>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {annotation.description}
            </p>
            {(state === "revealing" || state === "showing-probabilities") && totalTokens > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 mt-2"
              >
                <div className="h-1.5 flex-1 max-w-32 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentTokenIndex + 1) / totalTokens) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground font-mono">
                  {currentTokenIndex + 1} / {totalTokens}
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";

type AnnotationState = "idle" | "generating" | "revealing" | "showing-probabilities" | "complete" | "regenerating";

type EducationalAnnotationProps = {
  state: AnnotationState;
  currentTokenIndex: number;
  totalTokens: number;
};

const annotations: Record<AnnotationState, { title: string; description: string }> = {
  idle: {
    title: "Ready to Generate",
    description: "Enter a prompt above. The AI will process your text and generate a response one token (word or word-piece) at a time.",
  },
  generating: {
    title: "Processing Input",
    description: "The transformer model is analyzing your prompt, encoding it into numerical representations called embeddings.",
  },
  revealing: {
    title: "Token Generation",
    description: "Each token is predicted based on all previous tokens. The model calculates a probability distribution over its entire vocabulary.",
  },
  "showing-probabilities": {
    title: "Probability Distribution",
    description: "The bars show the most likely next tokens. The model 'samples' from this distribution - sometimes picking the most likely, sometimes surprising us.",
  },
  complete: {
    title: "Generation Complete",
    description: "The model has finished generating. Each token was chosen from thousands of possibilities, creating a coherent response.",
  },
  regenerating: {
    title: "Regenerating Response",
    description: "You selected an alternative token! The model is now generating a new continuation based on your choice.",
  },
};

export function EducationalAnnotation({ state, currentTokenIndex, totalTokens }: EducationalAnnotationProps) {
  const annotation = annotations[state];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl mx-auto"
      >
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="shrink-0 mt-0.5">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-foreground">{annotation.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {annotation.description}
            </p>
            {state === "revealing" && totalTokens > 0 && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Token {currentTokenIndex + 1} of {totalTokens}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

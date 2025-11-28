import { motion, AnimatePresence } from "framer-motion";
import { Info, Lightbulb, Zap, BarChart3, CheckCircle2, RefreshCw, Sparkles, Layers, Brain, GitBranch, ArrowRight } from "lucide-react";

type AnnotationState = "idle" | "generating" | "revealing" | "showing-probabilities" | "complete" | "regenerating";

type EducationalAnnotationProps = {
  state: AnnotationState;
  currentTokenIndex: number;
  totalTokens: number;
};

type AnnotationContent = {
  title: string;
  description: string;
  technicalDetail: string;
  icon: typeof Info;
  color: string;
  step?: string;
};

const annotations: Record<AnnotationState, AnnotationContent> = {
  idle: {
    title: "Welcome to the Transformer Exhibition",
    description: "Transformers are the AI architecture behind ChatGPT, Gemini, and other language models. They revolutionized AI by learning to understand context through 'attention' - focusing on the most relevant words.",
    technicalDetail: "The model has billions of parameters (learned values) that encode patterns from training on vast text data.",
    icon: Lightbulb,
    color: "text-amber-500",
  },
  generating: {
    title: "Step 1: Tokenization & Embedding",
    description: "Your words are being converted into 'tokens' (word pieces) and then transformed into high-dimensional vectors called embeddings. Each word becomes a point in a 768+ dimensional space where similar meanings are near each other.",
    technicalDetail: "Positional encodings are added so the model knows word order. 'The cat sat' differs from 'Sat the cat' because of position information.",
    icon: Layers,
    color: "text-purple-500",
    step: "1 of 4",
  },
  revealing: {
    title: "Step 2: Self-Attention in Action",
    description: "The transformer is now computing 'attention scores' between every pair of words. It asks: 'How relevant is each word to every other word?' This is what makes transformers special - they see the whole context at once!",
    technicalDetail: "Multi-head attention runs 12+ parallel attention patterns, each learning different relationships (grammar, meaning, coreference).",
    icon: Brain,
    color: "text-blue-500",
    step: "2 of 4",
  },
  "showing-probabilities": {
    title: "Step 3: Probability Distribution",
    description: "After attention layers process the context, the model outputs a probability for every word in its vocabulary (50,000+ words). The bars show the top choices - notice how context shapes which words are likely!",
    technicalDetail: "A 'softmax' function converts raw scores into probabilities that sum to 1. The model samples from this distribution.",
    icon: BarChart3,
    color: "text-green-500",
    step: "3 of 4",
  },
  complete: {
    title: "Step 4: Generation Complete",
    description: "The entire response was built token-by-token in an autoregressive loop. Each new word became part of the context for the next prediction. This is how transformers 'think' - one step at a time, but considering everything before.",
    technicalDetail: "The model made thousands of computations per token, passing through 12-96 transformer layers with billions of learned connections.",
    icon: CheckCircle2,
    color: "text-emerald-500",
    step: "4 of 4",
  },
  regenerating: {
    title: "Exploring Alternative Paths",
    description: "You've chosen a different word! This demonstrates a key insight: language has many valid continuations. The model must now recompute all future predictions because the context has fundamentally changed.",
    technicalDetail: "This is called 'branching' - a single word change can lead to completely different outputs, showing how context-dependent generation is.",
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
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-3xl mx-auto"
      >
        <motion.div 
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/95 via-card/90 to-card/80 backdrop-blur-md border border-border/60 shadow-2xl"
          animate={{
            borderColor: state === "generating" || state === "regenerating" 
              ? ["rgba(var(--primary), 0.3)", "rgba(var(--primary), 0.6)", "rgba(var(--primary), 0.3)"]
              : undefined,
          }}
          transition={{ duration: 1.5, repeat: state === "generating" || state === "regenerating" ? Infinity : 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          
          {annotation.step && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-0 left-0 px-4 py-1.5 bg-primary/20 text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-br-xl"
            >
              {annotation.step}
            </motion.div>
          )}

          <div className="relative p-4 md:p-6">
            <div className="flex items-start gap-4 md:gap-5">
              <motion.div 
                className="shrink-0 p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-background to-muted/50 border border-border/50 shadow-inner"
                animate={state === "generating" || state === "regenerating" ? { 
                  rotate: [0, 360],
                  scale: [1, 1.05, 1]
                } : {
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <Icon className={`w-6 h-6 md:w-8 md:h-8 ${annotation.color}`} />
              </motion.div>
              
              <div className="space-y-2 md:space-y-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-base md:text-lg text-foreground tracking-tight">
                    {annotation.title}
                  </h4>
                  {(state === "generating" || state === "regenerating") && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 rounded-full"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] md:text-xs text-primary font-medium">Processing</span>
                    </motion.div>
                  )}
                </div>
                
                <p className="text-sm md:text-base text-foreground/80 leading-relaxed">
                  {annotation.description}
                </p>
                
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="pt-2 md:pt-3 border-t border-border/30"
                >
                  <div className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs md:text-sm text-muted-foreground italic leading-relaxed">
                      {annotation.technicalDetail}
                    </p>
                  </div>
                </motion.div>
                
                {(state === "revealing" || state === "showing-probabilities") && totalTokens > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center gap-3 pt-2"
                  >
                    <div className="flex-1 max-w-48 h-2 bg-muted/50 rounded-full overflow-hidden border border-border/30">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentTokenIndex + 1) / totalTokens) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-xs md:text-sm text-muted-foreground font-mono font-medium">
                      Token {currentTokenIndex + 1} of {totalTokens}
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

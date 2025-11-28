import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GeneratedToken, GenerateResponse, RegenerateRequest } from "@shared/schema";
import { 
  Sparkles, Play, SkipForward, RotateCcw, ChevronRight, ChevronLeft,
  Info, Lightbulb, Zap, BarChart3, CheckCircle2, RefreshCw, Brain,
  Layers, Target, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TransformerPipeline } from "@/components/TransformerPipeline";
import { ModelSelector } from "@/components/ModelSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { presetPrompts } from "@shared/schema";

type ExplainerStep = "welcome" | "input" | "generating" | "token-reveal" | "probabilities" | "complete" | "regenerating";

const explainerContent: Record<ExplainerStep, {
  title: string;
  description: string;
  detail: string;
  icon: typeof Info;
  color: string;
}> = {
  welcome: {
    title: "Welcome to the Transformer",
    description: "See how AI creates text, one word at a time",
    detail: "Language models like GPT and Gemini don't write sentences all at once. They predict one word (called a 'token') at a time, always looking at everything that came before to decide what comes next.",
    icon: Sparkles,
    color: "text-primary",
  },
  input: {
    title: "Step 1: Your Input",
    description: "The prompt becomes the model's starting context",
    detail: "Your words are converted into numbers called 'embeddings' - a secret language the AI understands. Each word becomes a list of hundreds of numbers that capture its meaning.",
    icon: Layers,
    color: "text-blue-500",
  },
  generating: {
    title: "Step 2: Processing",
    description: "The transformer analyzes your input",
    detail: "The model sends your text through many layers of 'attention' - a process where each word looks at every other word to understand context. It's asking: 'which words matter most for predicting what comes next?'",
    icon: Brain,
    color: "text-purple-500",
  },
  "token-reveal": {
    title: "Step 3: Next Token Prediction",
    description: "The model predicts the most likely next word",
    detail: "After processing, the transformer outputs a probability for every possible word in its vocabulary (often 50,000+ words!). It then samples from the top candidates to pick the next token.",
    icon: Zap,
    color: "text-amber-500",
  },
  probabilities: {
    title: "Step 4: Understanding Choices",
    description: "See why the AI chose this word",
    detail: "The probability bars show the model's confidence in each option. Higher bars mean the model thinks that word fits better. You can click any alternative to see how a different choice would change the entire response!",
    icon: BarChart3,
    color: "text-green-500",
  },
  complete: {
    title: "Generation Complete!",
    description: "The full response has been generated",
    detail: "Each word you see was chosen from thousands of possibilities. The 'magic' of language models is just very sophisticated pattern matching - predicting what word would most likely come next based on all the text it was trained on.",
    icon: CheckCircle2,
    color: "text-emerald-500",
  },
  regenerating: {
    title: "Exploring Alternative Paths",
    description: "You changed the story!",
    detail: "By selecting a different word, you've altered the context. Now the model must recalculate everything that follows. Watch how one word choice can completely change the direction of the response!",
    icon: RefreshCw,
    color: "text-orange-500",
  },
};

export default function Exhibition() {
  const [selectedModel, setSelectedModel] = useState<"gemini" | "openai">("gemini");
  const [prompt, setPrompt] = useState("");
  const [tokens, setTokens] = useState<GeneratedToken[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [explainerStep, setExplainerStep] = useState<ExplainerStep>("welcome");
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const fastForwardRef = useRef(false);

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt: string; model: "gemini" | "openai" }) => {
      const response = await apiRequest("POST", "/api/generate", data);
      const jsonData = await response.json();
      return jsonData as GenerateResponse;
    },
    onSuccess: (data) => {
      const validTokens = Array.isArray(data?.tokens) ? data.tokens : [];
      if (validTokens.length === 0) {
        console.warn("No tokens received from API");
        setExplainerStep("welcome");
        return;
      }
      setTokens(validTokens);
      setCurrentIndex(-1);
      setExplainerStep("token-reveal");
    },
    onError: (error) => {
      console.error("Generation error:", error);
      setExplainerStep("welcome");
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (data: RegenerateRequest) => {
      const response = await apiRequest("POST", "/api/regenerate", data);
      const jsonData = await response.json();
      return jsonData as GenerateResponse;
    },
    onSuccess: (data, variables) => {
      const validTokens = Array.isArray(data?.tokens) ? data.tokens : [];
      if (validTokens.length === 0) {
        console.warn("No tokens received from regenerate API");
        setExplainerStep("probabilities");
        return;
      }
      const tokensBeforeIndex = tokens.slice(0, currentIndex);
      const originalAlternatives = tokens[currentIndex]?.alternatives || [];
      const replacementToken: GeneratedToken = {
        token: variables.newToken,
        alternatives: originalAlternatives,
      };
      const continuationTokens = validTokens.slice(1);
      const newTokenList = [...tokensBeforeIndex, replacementToken, ...continuationTokens];
      setTokens(newTokenList);
      setSelectedAlternative(variables.newToken);
      setExplainerStep("probabilities");
    },
    onError: (error) => {
      console.error("Regeneration error:", error);
      setExplainerStep("probabilities");
    },
  });

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return;
    setExplainerStep("generating");
    generateMutation.mutate({ prompt, model: selectedModel });
  }, [prompt, selectedModel, generateMutation]);

  const handleNext = useCallback(() => {
    if (currentIndex < tokens.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSelectedAlternative(null);
      setExplainerStep("probabilities");

      if (newIndex === tokens.length - 1) {
        setTimeout(() => {
          setExplainerStep("complete");
        }, 2000);
      }
    }
  }, [currentIndex, tokens.length]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAlternative(null);
      setExplainerStep("probabilities");
    }
  }, [currentIndex]);

  const handleFastForward = useCallback(() => {
    if (tokens.length === 0) return;
    fastForwardRef.current = true;

    const revealNext = (index: number) => {
      if (index >= tokens.length || !fastForwardRef.current) {
        fastForwardRef.current = false;
        setExplainerStep("complete");
        return;
      }

      setCurrentIndex(index);

      setTimeout(() => {
        revealNext(index + 1);
      }, 120);
    };

    revealNext(currentIndex + 1);
  }, [currentIndex, tokens.length]);

  const handleReset = useCallback(() => {
    fastForwardRef.current = false;
    setTokens([]);
    setCurrentIndex(-1);
    setPrompt("");
    setSelectedAlternative(null);
    setExplainerStep("welcome");
    generateMutation.reset();
    regenerateMutation.reset();
  }, [generateMutation, regenerateMutation]);

  const handleAlternativeClick = useCallback((alternativeToken: string) => {
    if (currentIndex < 0 || regenerateMutation.isPending || generateMutation.isPending) return;
    
    const tokensBeforeChange = tokens.slice(0, currentIndex).map(t => t.token);
    
    setExplainerStep("regenerating");
    
    regenerateMutation.mutate({
      originalPrompt: prompt,
      tokensBeforeChange,
      newToken: alternativeToken,
      model: selectedModel,
    });
  }, [currentIndex, tokens, prompt, selectedModel, regenerateMutation, generateMutation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        if (tokens.length > 0 && currentIndex < tokens.length - 1 && !generateMutation.isPending) {
          e.preventDefault();
          handleNext();
        }
      }
      if (e.key === "ArrowLeft" || e.key === "Backspace") {
        if (currentIndex > 0 && !generateMutation.isPending) {
          e.preventDefault();
          handleBack();
        }
      }
      if (e.key === "Escape") {
        handleReset();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        handleFastForward();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tokens.length, currentIndex, generateMutation.isPending, handleNext, handleBack, handleReset, handleFastForward]);

  const isGenerating = generateMutation.isPending || regenerateMutation.isPending;
  const hasTokens = tokens.length > 0;
  const canNext = hasTokens && currentIndex < tokens.length - 1 && !isGenerating;
  const canBack = hasTokens && currentIndex > 0 && !isGenerating;
  const canFastForward = hasTokens && currentIndex < tokens.length - 1 && !isGenerating;
  const isRegenerating = regenerateMutation.isPending;

  const currentExplainer = explainerContent[explainerStep];
  const ExplainerIcon = currentExplainer.icon;

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
          >
            <Sparkles className="w-5 h-5 text-primary" />
          </motion.div>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-foreground">Trans</span>
            <span className="text-primary">former</span>
            <span className="text-muted-foreground font-normal ml-2 text-sm hidden sm:inline">Exhibition</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isGenerating || hasTokens}
          />
          <ThemeToggle />
        </div>
      </header>

      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!hasTokens ? (
            <motion.div
              key="prompt-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -30 }}
              className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8 max-w-2xl"
              >
                <div className="flex items-center justify-center gap-3 mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Brain className="w-10 h-10 text-primary" />
                  </motion.div>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                  How Does AI <span className="text-primary">Think</span>?
                </h2>
                <p className="text-lg text-muted-foreground font-light">
                  Watch a transformer model generate text, one word at a time
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-2xl mb-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  {[
                    { icon: Layers, title: "Input", desc: "Your words become numbers" },
                    { icon: Brain, title: "Process", desc: "Attention finds patterns" },
                    { icon: Target, title: "Predict", desc: "Pick the next word" },
                  ].map((step, i) => (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/30"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{step.title}</div>
                        <div className="text-xs text-muted-foreground">{step.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full max-w-2xl space-y-4"
              >
                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      if (e.target.value.trim()) {
                        setExplainerStep("input");
                      } else {
                        setExplainerStep("welcome");
                      }
                    }}
                    placeholder="Type a prompt for the AI to continue... (e.g., 'The secret to happiness is')"
                    disabled={isGenerating}
                    className="min-h-[100px] text-base resize-none bg-card/60 border-2 border-muted-foreground/20 focus:border-primary/50 placeholder:text-muted-foreground/40 rounded-xl"
                    data-testid="input-prompt"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground/60 text-center uppercase tracking-wider">
                    Or choose a starting point
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {presetPrompts.slice(0, 4).map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPrompt(preset);
                          setExplainerStep("input");
                        }}
                        className="text-xs bg-card/40 border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10"
                        data-testid={`button-preset-${index}`}
                      >
                        {preset.length > 30 ? preset.slice(0, 30) + "..." : preset}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    size="lg"
                    className="text-base px-10 py-6 gap-3 shadow-lg shadow-primary/20"
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-5 h-5" />
                        </motion.div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Start Generation
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="generation-screen"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <div className="px-4 py-2 border-b border-border/30 bg-muted/20 shrink-0">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <span className="font-medium">Prompt:</span>
                    <span className="italic truncate max-w-md">"{prompt}"</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                    <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">
                      {currentIndex + 1} / {tokens.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <TransformerPipeline
                  tokens={tokens}
                  currentIndex={currentIndex}
                  isGenerating={isGenerating}
                  isRegenerating={isRegenerating}
                  onAlternativeClick={handleAlternativeClick}
                  selectedAlternative={selectedAlternative}
                />
              </div>

              <div className="shrink-0 border-t border-border/30 bg-background/80 backdrop-blur-sm">
                <div className="px-4 py-2 max-w-4xl mx-auto">
                  <motion.div
                    key={explainerStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-card/80 border border-border/50 mb-3"
                  >
                    <motion.div 
                      className="shrink-0 mt-0.5"
                      animate={explainerStep === "generating" || explainerStep === "regenerating" ? { 
                        rotate: [0, 360],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <ExplainerIcon className={`w-5 h-5 ${currentExplainer.color}`} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm text-foreground">{currentExplainer.title}</h4>
                        <span className="text-xs text-muted-foreground">{currentExplainer.description}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {currentExplainer.detail}
                      </p>
                    </div>
                  </motion.div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleBack}
                        disabled={!canBack}
                        variant="outline"
                        size="default"
                        className="gap-2"
                        data-testid="button-back"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </Button>
                      
                      <Button
                        onClick={handleNext}
                        disabled={!canNext}
                        size="default"
                        className="gap-2 px-6"
                        data-testid="button-next"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleFastForward}
                        disabled={!canFastForward}
                        variant="secondary"
                        size="default"
                        className="gap-2"
                        data-testid="button-fast-forward"
                      >
                        <SkipForward className="w-4 h-4" />
                        <span className="hidden sm:inline">Complete All</span>
                      </Button>

                      <Button
                        onClick={handleReset}
                        variant="outline"
                        size="default"
                        className="gap-2"
                        data-testid="button-reset"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Reset</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground/40">
                    <span><kbd className="px-1 py-0.5 bg-muted rounded font-mono">←</kbd> Previous</span>
                    <span><kbd className="px-1 py-0.5 bg-muted rounded font-mono">Space</kbd> Next</span>
                    <span><kbd className="px-1 py-0.5 bg-muted rounded font-mono">Esc</kbd> Reset</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {hasTokens && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="shrink-0 border-t border-border/30 bg-muted/30 px-4 py-3"
          >
            <div className="max-w-4xl mx-auto">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-2">
                <ArrowRight className="w-3 h-3" />
                <span>Generated Response</span>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {tokens.slice(0, currentIndex + 1).map((t, i) => {
                  const isCurrentToken = i === currentIndex;
                  const displayToken = i === currentIndex && selectedAlternative ? selectedAlternative : t.token;
                  
                  return (
                    <motion.span
                      key={`output-${i}-${t.token}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`font-mono ${
                        isCurrentToken 
                          ? "text-base font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/30" 
                          : "text-sm text-foreground/70"
                      }`}
                      data-testid={`output-token-${i}`}
                    >
                      {displayToken}
                    </motion.span>
                  );
                })}
                
                {currentIndex < tokens.length - 1 && (
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-base font-mono text-primary"
                  >
                    |
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GeneratedToken, GenerateResponse, RegenerateRequest } from "@shared/schema";
import { Sparkles, Play, SkipForward, RotateCcw, ChevronRight, ChevronLeft, Info, Layers, Brain, Cpu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TransformerPipeline } from "@/components/TransformerPipeline";
import { ModelSelector } from "@/components/ModelSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EducationalAnnotation } from "@/components/EducationalAnnotation";
import { AmbientParticles } from "@/components/AmbientParticles";
import { presetPrompts } from "@shared/schema";

type AnnotationState = "idle" | "generating" | "revealing" | "showing-probabilities" | "complete" | "regenerating";

export default function Exhibition() {
  const [selectedModel, setSelectedModel] = useState<"gemini" | "openai">("gemini");
  const [prompt, setPrompt] = useState("");
  const [tokens, setTokens] = useState<GeneratedToken[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showProbabilities, setShowProbabilities] = useState(false);
  const [annotationState, setAnnotationState] = useState<AnnotationState>("idle");
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const fastForwardRef = useRef(false);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        setAnnotationState("idle");
        return;
      }
      setTokens(validTokens);
      setCurrentIndex(-1);
      setShowProbabilities(false);
      setAnnotationState("revealing");
    },
    onError: (error) => {
      console.error("Generation error:", error);
      setAnnotationState("idle");
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
        setAnnotationState("showing-probabilities");
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
      setShowProbabilities(true);
      setAnnotationState("showing-probabilities");
    },
    onError: (error) => {
      console.error("Regeneration error:", error);
      setAnnotationState("showing-probabilities");
    },
  });

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return;
    setAnnotationState("generating");
    generateMutation.mutate({ prompt, model: selectedModel });
  }, [prompt, selectedModel, generateMutation]);

  const clearCompletionTimeout = useCallback(() => {
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < tokens.length - 1) {
      clearCompletionTimeout();
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setShowProbabilities(true);
      setSelectedAlternative(null);
      setAnnotationState("showing-probabilities");

      if (newIndex === tokens.length - 1) {
        completionTimeoutRef.current = setTimeout(() => {
          setAnnotationState("complete");
        }, 2000);
      }
    }
  }, [currentIndex, tokens.length, clearCompletionTimeout]);

  const handlePrevious = useCallback(() => {
    clearCompletionTimeout();
    
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setShowProbabilities(true);
      setSelectedAlternative(null);
      setAnnotationState("showing-probabilities");
    } else if (currentIndex === 0) {
      setCurrentIndex(-1);
      setShowProbabilities(false);
      setSelectedAlternative(null);
      setAnnotationState("revealing");
    }
  }, [currentIndex, clearCompletionTimeout]);

  const handleFastForward = useCallback(() => {
    if (tokens.length === 0) return;
    clearCompletionTimeout();
    fastForwardRef.current = true;

    const revealNext = (index: number) => {
      if (index >= tokens.length || !fastForwardRef.current) {
        fastForwardRef.current = false;
        setShowProbabilities(true);
        setAnnotationState("complete");
        return;
      }

      setCurrentIndex(index);
      setShowProbabilities(true);

      setTimeout(() => {
        revealNext(index + 1);
      }, 150);
    };

    revealNext(currentIndex + 1);
  }, [currentIndex, tokens.length, clearCompletionTimeout]);

  const handleReset = useCallback(() => {
    clearCompletionTimeout();
    fastForwardRef.current = false;
    setTokens([]);
    setCurrentIndex(-1);
    setShowProbabilities(false);
    setPrompt("");
    setSelectedAlternative(null);
    setAnnotationState("idle");
    generateMutation.reset();
    regenerateMutation.reset();
  }, [generateMutation, regenerateMutation, clearCompletionTimeout]);

  const handleAlternativeClick = useCallback((alternativeToken: string) => {
    if (currentIndex < 0 || regenerateMutation.isPending || generateMutation.isPending) return;
    
    clearCompletionTimeout();
    const tokensBeforeChange = tokens.slice(0, currentIndex).map(t => t.token);
    
    setAnnotationState("regenerating");
    setShowProbabilities(false);
    
    regenerateMutation.mutate({
      originalPrompt: prompt,
      tokensBeforeChange,
      newToken: alternativeToken,
      model: selectedModel,
    });
  }, [currentIndex, tokens, prompt, selectedModel, regenerateMutation, generateMutation, clearCompletionTimeout]);

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
        if (tokens.length > 0 && currentIndex < tokens.length - 1 && !generateMutation.isPending) {
          e.preventDefault();
          handleNext();
        }
      }
      if (e.key === "ArrowLeft" || e.key === "Backspace") {
        if (tokens.length > 0 && currentIndex >= 0 && !generateMutation.isPending) {
          e.preventDefault();
          handlePrevious();
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
  }, [tokens.length, currentIndex, generateMutation.isPending, handleNext, handlePrevious, handleReset, handleFastForward]);

  const isGenerating = generateMutation.isPending || regenerateMutation.isPending;
  const hasTokens = tokens.length > 0;
  const canNext = hasTokens && currentIndex < tokens.length - 1 && !isGenerating;
  const canPrevious = hasTokens && currentIndex >= 0 && !isGenerating;
  const canFastForward = hasTokens && currentIndex < tokens.length - 1 && !isGenerating;
  const isComplete = hasTokens && currentIndex === tokens.length - 1;
  const isRegenerating = regenerateMutation.isPending;

  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-background to-indigo-950/30 dark:from-slate-950 dark:via-background dark:to-indigo-950/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <AmbientParticles count={25} active={!hasTokens || isGenerating} />
      
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-50">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-border/50"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">
            AI Exhibition
          </span>
        </motion.div>
      </div>

      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50 flex items-center gap-2 md:gap-3">
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          disabled={isGenerating || hasTokens}
        />
        <ThemeToggle />
      </div>

      <div className="relative h-full flex flex-col">
        <AnimatePresence mode="wait">
          {!hasTokens ? (
            <motion.div
              key="prompt-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -50 }}
              className="h-full flex flex-col items-center justify-center px-4 md:px-8 py-12"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="flex items-center gap-4 mb-6 md:mb-8"
              >
                {[Cpu, Zap, Layers].map((Icon, i) => (
                  <motion.div
                    key={i}
                    className="p-2 md:p-3 rounded-xl bg-primary/10 border border-primary/20"
                    animate={{ 
                      y: [0, -8, 0],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                  >
                    <Icon className="w-4 h-4 md:w-6 md:h-6 text-primary/70" />
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-6 md:mb-8"
              >
                <div className="flex items-center justify-center gap-3 md:gap-4 mb-3 md:mb-4">
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.15, 1]
                    }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Brain className="w-8 h-8 md:w-14 md:h-14 text-primary" />
                  </motion.div>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
                    <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">Trans</span>
                    <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">former</span>
                  </h1>
                </div>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg md:text-2xl text-muted-foreground font-light"
                >
                  Watch AI think — <span className="text-foreground font-medium">one token at a time</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-3 flex items-center justify-center gap-3 text-xs md:text-sm text-muted-foreground/60"
                >
                  <span className="px-2 py-1 rounded-full bg-muted/30 border border-border/30">Self-Attention</span>
                  <span className="text-primary/50">+</span>
                  <span className="px-2 py-1 rounded-full bg-muted/30 border border-border/30">Feed Forward</span>
                  <span className="text-primary/50">+</span>
                  <span className="px-2 py-1 rounded-full bg-muted/30 border border-border/30">Probabilities</span>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-xl space-y-3 md:space-y-4"
              >
                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Type your prompt here... (e.g., 'Once upon a time')"
                    disabled={isGenerating}
                    className="min-h-[80px] md:min-h-[100px] text-base md:text-lg resize-none bg-card/60 border-2 border-muted-foreground/20 focus:border-primary/50 placeholder:text-muted-foreground/40 rounded-xl"
                    data-testid="input-prompt"
                  />
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {presetPrompts.slice(0, 3).map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setPrompt(preset)}
                      className="text-[10px] md:text-xs bg-card/40 border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10"
                      data-testid={`button-preset-${index}`}
                    >
                      {preset.length > 30 ? preset.slice(0, 30) + "..." : preset}
                    </Button>
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    size="lg"
                    className="text-lg md:text-xl px-8 md:px-14 py-6 md:py-7 gap-3 shadow-xl shadow-primary/30 font-semibold"
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                        </motion.div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 md:w-6 md:h-6" />
                        Generate Response
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="generation-screen"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col overflow-hidden"
            >
              <div className="shrink-0 pt-14 md:pt-16 pb-1 md:pb-2 px-4 md:px-8 text-center">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  className="text-xs md:text-base text-muted-foreground max-w-3xl mx-auto font-light italic truncate"
                >
                  "{prompt}"
                </motion.p>
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="shrink-0 px-4 pb-2 md:pb-4 flex flex-col items-center gap-2 md:gap-3"
              >
                <EducationalAnnotation 
                  state={annotationState}
                  currentTokenIndex={currentIndex}
                  totalTokens={tokens.length}
                />

                <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-center">
                  <Button
                    onClick={handlePrevious}
                    disabled={!canPrevious}
                    variant="outline"
                    className="gap-1.5"
                    data-testid="button-previous"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={!canNext}
                    className="gap-1.5 px-4 md:px-6"
                    data-testid="button-next"
                  >
                    Next Token
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  <Button
                    onClick={handleFastForward}
                    disabled={!canFastForward}
                    variant="secondary"
                    className="gap-1.5"
                    data-testid="button-fast-forward"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip All
                  </Button>

                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    className="gap-1.5"
                    data-testid="button-reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                </div>
                
                <div className="text-[10px] text-muted-foreground/50 text-center">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono mx-0.5">←</kbd> Previous
                  <span className="mx-1.5 text-muted-foreground/30">|</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono mx-0.5">→</kbd> or <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono mx-0.5">Space</kbd> Next
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

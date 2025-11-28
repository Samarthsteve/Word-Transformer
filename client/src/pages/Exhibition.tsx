import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GeneratedToken, GenerateResponse, RegenerateRequest } from "@shared/schema";
import { Sparkles, Play, SkipForward, RotateCcw, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TransformerPipeline } from "@/components/TransformerPipeline";
import { ModelSelector } from "@/components/ModelSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EducationalAnnotation } from "@/components/EducationalAnnotation";
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

  const handleNext = useCallback(() => {
    if (currentIndex < tokens.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setShowProbabilities(true);
      setSelectedAlternative(null);
      setAnnotationState("showing-probabilities");

      if (newIndex === tokens.length - 1) {
        setTimeout(() => {
          setAnnotationState("complete");
        }, 2000);
      }
    }
  }, [currentIndex, tokens.length]);

  const handleFastForward = useCallback(() => {
    if (tokens.length === 0) return;
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
  }, [currentIndex, tokens.length]);

  const handleReset = useCallback(() => {
    fastForwardRef.current = false;
    setTokens([]);
    setCurrentIndex(-1);
    setShowProbabilities(false);
    setPrompt("");
    setSelectedAlternative(null);
    setAnnotationState("idle");
    generateMutation.reset();
    regenerateMutation.reset();
  }, [generateMutation, regenerateMutation]);

  const handleAlternativeClick = useCallback((alternativeToken: string) => {
    if (currentIndex < 0 || regenerateMutation.isPending || generateMutation.isPending) return;
    
    const tokensBeforeChange = tokens.slice(0, currentIndex).map(t => t.token);
    
    setAnnotationState("regenerating");
    setShowProbabilities(false);
    
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
  }, [tokens.length, currentIndex, generateMutation.isPending, handleNext, handleReset, handleFastForward]);

  const isGenerating = generateMutation.isPending || regenerateMutation.isPending;
  const hasTokens = tokens.length > 0;
  const canNext = hasTokens && currentIndex < tokens.length - 1 && !isGenerating;
  const canFastForward = hasTokens && currentIndex < tokens.length - 1 && !isGenerating;
  const isComplete = hasTokens && currentIndex === tokens.length - 1;
  const isRegenerating = regenerateMutation.isPending;

  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
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
              className="flex-1 flex flex-col items-center justify-center px-4 md:px-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-6 md:mb-12"
              >
                <div className="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-4">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  </motion.div>
                  <h1 className="text-4xl md:text-7xl font-bold tracking-tight">
                    <span className="text-foreground">Trans</span>
                    <span className="text-primary">former</span>
                  </h1>
                </div>
                <p className="text-lg md:text-2xl text-muted-foreground font-light">
                  Watch AI think — one token at a time
                </p>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 md:mt-6 max-w-xl mx-auto"
                >
                  <div className="flex items-start gap-3 p-3 md:p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 text-left">
                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">How does AI generate text?</span>
                      <br />
                      Transformers predict the next word by looking at all previous words. 
                      Enter a prompt below and watch the model generate a response, revealing 
                      the probability of each word choice!
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-2xl space-y-4 md:space-y-6"
              >
                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Type your prompt here... (e.g., 'Once upon a time, in a land far away')"
                    disabled={isGenerating}
                    className="min-h-[100px] md:min-h-[140px] text-base md:text-xl resize-none bg-card/60 border-2 border-muted-foreground/20 focus:border-primary/50 placeholder:text-muted-foreground/40 rounded-xl"
                    data-testid="input-prompt"
                  />
                  {prompt.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute bottom-2 right-3 text-xs text-muted-foreground/50"
                    >
                      {prompt.length} chars
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground/60 text-center uppercase tracking-wider">
                    Or try a preset
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {presetPrompts.slice(0, 4).map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt(preset)}
                        className="text-[10px] md:text-xs bg-card/40 border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10"
                        data-testid={`button-preset-${index}`}
                      >
                        {preset.length > 35 ? preset.slice(0, 35) + "..." : preset}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    size="lg"
                    className="text-base md:text-lg px-8 md:px-12 py-5 md:py-6 gap-2 md:gap-3 shadow-lg shadow-primary/20"
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                        </motion.div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 md:w-5 md:h-5" />
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
              className="flex-1 flex flex-col"
            >
              <div className="pt-16 md:pt-20 pb-2 md:pb-4 px-4 md:px-8 text-center">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  className="text-sm md:text-xl text-muted-foreground max-w-3xl mx-auto font-light italic truncate"
                >
                  "{prompt}"
                </motion.p>
              </div>

              <div className="flex-1 min-h-0">
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
                className="px-4 pb-4 md:pb-8 flex flex-col items-center gap-3 md:gap-4"
              >
                <EducationalAnnotation 
                  state={annotationState}
                  currentTokenIndex={currentIndex}
                  totalTokens={tokens.length}
                />

                <div className="flex items-center gap-3 md:gap-4 flex-wrap justify-center">
                  <Button
                    onClick={handleNext}
                    disabled={!canNext}
                    size="lg"
                    className="gap-2 px-6 md:px-8"
                    data-testid="button-next"
                  >
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                    Next Token
                  </Button>

                  <Button
                    onClick={handleFastForward}
                    disabled={!canFastForward}
                    variant="secondary"
                    size="lg"
                    className="gap-2"
                    data-testid="button-fast-forward"
                  >
                    <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
                    Skip All
                  </Button>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    data-testid="button-reset"
                  >
                    <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                    Reset
                  </Button>
                </div>
                
                <div className="text-[10px] md:text-xs text-muted-foreground/50 text-center">
                  Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> for next token
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function markOnboardingStep(step: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vf:onboarding-step-complete", { detail: { step } }));
  }
}

export function finishOnboardingStep(step: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vf:onboarding-step-finish", { detail: { step } }));
  }
}

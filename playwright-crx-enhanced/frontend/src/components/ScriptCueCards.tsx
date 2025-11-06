import React, { useEffect, useState } from 'react';
import './ScriptCueCards.css';

type ScriptMinimal = {
  id: string;
  name: string;
  language?: string;
};

interface Props {
  script: ScriptMinimal;
  onGenerate?: (script: ScriptMinimal) => void;
  onEnhance?: (script: ScriptMinimal) => void;
  onValidate?: (script: ScriptMinimal) => void;
  onFinalize?: (script: ScriptMinimal) => void;
  onInsights?: (script: ScriptMinimal) => void;
  layout?: 'embedded' | 'standalone';
  showHeader?: boolean;
}

const ScriptCueCards: React.FC<Props> = ({ script, onGenerate, onEnhance, onValidate, onFinalize, onInsights, layout = 'embedded', showHeader = true }) => {
  const fallback = (label: string) => () => alert(`${label} is coming soon for: ${script.name}`);

  const storageKey = `cueProgress:${script.id}`;
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    const n = saved ? parseInt(saved, 10) : 1;
    return isNaN(n) ? 1 : Math.min(Math.max(n, 1), 5);
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(currentStep));
  }, [currentStep]);

  const triggerStep = (step: number, cb?: (s: ScriptMinimal) => void) => () => {
    setCurrentStep(step);
    if (cb) cb(script);
  };

  const resumeLastStep = () => {
    const step = currentStep;
    const handlers: Record<number, ((s: ScriptMinimal) => void) | undefined> = {
      1: onGenerate,
      2: onEnhance,
      3: onValidate,
      4: onFinalize,
      5: onInsights,
    };
    const handler = handlers[step] || fallback('Resume');
    if (handler) handler(script);
  };

  if (layout === 'standalone') {
    return (
      <div>
        {showHeader && (
          <div className="cue-steps-header">
            <div>
              <span className="cue-steps-title">New Script Workflow</span>
              <span className="cue-steps-subtitle">Guided 5-step process</span>
            </div>
            <span className="cue-steps-badge" aria-label={`Progress: Step ${currentStep} of 5`}>Step {currentStep} / 5</span>
            <button
              className="btn-secondary"
              style={{ marginLeft: 8 }}
              onClick={resumeLastStep}
              aria-label={`Resume last step (${currentStep})`}
            >
              ⏯ Resume Last Step
            </button>
          </div>
        )}
        <div className="cards-grid">
          <div className="content-card cue-step-card generate">
            <div className="cue-step-card-header">
              <div className="cue-step-icon">1</div>
              <div className="cue-step-headings">
                <div className="step-title">Generate</div>
        <div className="step-desc">Select existing script and generate Playwright report.</div>
              </div>
            </div>
            <div className="cue-step-card-content">
        <p>Select an existing script from database and generate Playwright report.</p>
            </div>
            <div className="cue-step-card-actions">
              <button
                className="btn-primary step-action"
                onClick={triggerStep(1, onGenerate || fallback('Generate'))}
                aria-current={currentStep === 1 ? 'step' : undefined}
              >
                Generate Report
              </button>
            </div>
          </div>

          <div className="content-card cue-step-card enhance">
            <div className="cue-step-card-header">
              <div className="cue-step-icon">2</div>
              <div className="cue-step-headings">
                <div className="step-title">Enhance with AI</div>
                <div className="step-desc">Improve locators and flows using AI.</div>
              </div>
            </div>
            <div className="cue-step-card-content">
              <p>AI suggests stronger selectors, waits, and resiliency improvements.</p>
            </div>
            <div className="cue-step-card-actions">
              <button
                className="btn-secondary step-action"
                onClick={triggerStep(2, onEnhance || fallback('Enhance with AI'))}
                aria-current={currentStep === 2 ? 'step' : undefined}
              >
                Open AI Enhancement
              </button>
            </div>
          </div>

          <div className="content-card cue-step-card validate">
            <div className="cue-step-card-header">
              <div className="cue-step-icon">3</div>
              <div className="cue-step-headings">
                <div className="step-title">Human Validation</div>
                <div className="step-desc">Review logic and verify selectors.</div>
              </div>
            </div>
            <div className="cue-step-card-content">
              <p>Review diffs and confirm changes step-by-step to maintain control.</p>
            </div>
            <div className="cue-step-card-actions">
              <button
                className="btn-secondary step-action"
                onClick={triggerStep(3, onValidate || fallback('Human Validation'))}
                aria-current={currentStep === 3 ? 'step' : undefined}
              >
                Start Validation Review
              </button>
            </div>
          </div>

          <div className="content-card cue-step-card finalize">
            <div className="cue-step-card-header">
              <div className="cue-step-icon">4</div>
              <div className="cue-step-headings">
                <div className="step-title">Finalize / Run</div>
                <div className="step-desc">Save, run, and monitor execution in real-time.</div>
              </div>
            </div>
            <div className="cue-step-card-content">
              <p>Lock changes and execute. Monitor logs, screenshots, and metrics.</p>
            </div>
            <div className="cue-step-card-actions">
              <button
                className="btn-primary step-action"
                onClick={triggerStep(4, onFinalize || fallback('Finalize / Run'))}
                aria-current={currentStep === 4 ? 'step' : undefined}
              >
                Finalize and Execute
              </button>
            </div>
          </div>

          <div className="content-card cue-step-card insights">
            <div className="cue-step-card-header">
              <div className="cue-step-icon">5</div>
              <div className="cue-step-headings">
                <div className="step-title">AI Insights</div>
                <div className="step-desc">View reliability trends, flaky steps, and healing tips.</div>
              </div>
            </div>
            <div className="cue-step-card-content">
              <p>Explore AI insights: top failures, suggested fixes, and stability trends.</p>
            </div>
            <div className="cue-step-card-actions">
              <button
                className="btn-secondary step-action"
                onClick={triggerStep(5, onInsights || fallback('AI Insights'))}
                aria-current={currentStep === 5 ? 'step' : undefined}
              >
                Open Insights
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cue-steps">
      {showHeader && (
        <div className="cue-steps-header">
          <div>
            <span className="cue-steps-title">New Script Workflow</span>
            <span className="cue-steps-subtitle">Guided 5-step process</span>
          </div>
          <span className="cue-steps-badge" aria-label={`Progress: Step ${currentStep} of 5`}>Step {currentStep} / 5</span>
          <button
            className="btn-secondary"
            style={{ marginLeft: 8 }}
            onClick={resumeLastStep}
            aria-label={`Resume last step (${currentStep})`}
          >
            ⏯ Resume Last Step
          </button>
        </div>
      )}

      <div className="cue-progress" aria-hidden="true">
        <span className={`cue-dot generate ${currentStep >= 1 ? 'active' : ''}`} aria-label="Generate step" />
        <span className="cue-line" />
        <span className={`cue-dot enhance ${currentStep >= 2 ? 'active' : ''}`} aria-label="Enhance with AI step" />
        <span className="cue-line" />
        <span className={`cue-dot validate ${currentStep >= 3 ? 'active' : ''}`} aria-label="Human validation step" />
        <span className="cue-line" />
        <span className={`cue-dot finalize ${currentStep >= 4 ? 'active' : ''}`} aria-label="Finalize and run step" />
        <span className="cue-line" />
        <span className={`cue-dot insights ${currentStep >= 5 ? 'active' : ''}`} aria-label="AI insights step" />
      </div>

      <div className="cue-steps-grid">
        <div className="cue-step-card generate">
          <div className="cue-step-card-header">
            <div className="cue-step-icon">1</div>
            <div className="cue-step-headings">
              <div className="step-title">Generate</div>
        <div className="step-desc">Select existing script and generate Playwright report.</div>
            </div>
          </div>
          <div className="cue-step-card-content">
        <p>Select an existing script from database and generate Playwright report.</p>
          </div>
          <div className="cue-step-card-actions">
            <button
              className="btn-primary step-action"
              onClick={triggerStep(1, onGenerate || fallback('Generate'))}
              aria-current={currentStep === 1 ? 'step' : undefined}
            >
              Generate Report
            </button>
          </div>
        </div>

        <div className="cue-step-card enhance">
          <div className="cue-step-card-header">
            <div className="cue-step-icon">2</div>
            <div className="cue-step-headings">
              <div className="step-title">Enhance with AI</div>
              <div className="step-desc">Improve locators and flows using AI.</div>
            </div>
          </div>
          <div className="cue-step-card-content">
            <p>AI suggests stronger selectors, waits, and resiliency improvements.</p>
          </div>
          <div className="cue-step-card-actions">
            <button
              className="btn-secondary step-action"
              onClick={triggerStep(2, onEnhance || fallback('Enhance with AI'))}
              aria-current={currentStep === 2 ? 'step' : undefined}
            >
              Open AI Enhancement
            </button>
          </div>
        </div>

        <div className="cue-step-card validate">
          <div className="cue-step-card-header">
            <div className="cue-step-icon">3</div>
            <div className="cue-step-headings">
              <div className="step-title">Human Validation</div>
              <div className="step-desc">Review logic and verify selectors.</div>
            </div>
          </div>
          <div className="cue-step-card-content">
            <p>Review diffs and confirm changes step-by-step to maintain control.</p>
          </div>
          <div className="cue-step-card-actions">
            <button
              className="btn-secondary step-action"
              onClick={triggerStep(3, onValidate || fallback('Human Validation'))}
              aria-current={currentStep === 3 ? 'step' : undefined}
            >
              Start Validation Review
            </button>
          </div>
        </div>

        <div className="cue-step-card finalize">
          <div className="cue-step-card-header">
            <div className="cue-step-icon">4</div>
            <div className="cue-step-headings">
              <div className="step-title">Finalize / Run</div>
              <div className="step-desc">Save, run, and monitor execution in real-time.</div>
            </div>
          </div>
          <div className="cue-step-card-content">
            <p>Lock changes and execute. Monitor logs, screenshots, and metrics.</p>
          </div>
          <div className="cue-step-card-actions">
            <button
              className="btn-primary step-action"
              onClick={triggerStep(4, onFinalize || fallback('Finalize / Run'))}
              aria-current={currentStep === 4 ? 'step' : undefined}
            >
              Finalize and Execute
            </button>
          </div>
        </div>

        <div className="cue-step-card insights">
          <div className="cue-step-card-header">
            <div className="cue-step-icon">5</div>
            <div className="cue-step-headings">
              <div className="step-title">AI Insights</div>
              <div className="step-desc">View reliability trends, flaky steps, and healing tips.</div>
            </div>
          </div>
          <div className="cue-step-card-content">
            <p>Explore AI insights: top failures, suggested fixes, and stability trends.</p>
          </div>
          <div className="cue-step-card-actions">
            <button
              className="btn-secondary step-action"
              onClick={triggerStep(5, onInsights || fallback('AI Insights'))}
              aria-current={currentStep === 5 ? 'step' : undefined}
            >
              Open Insights
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptCueCards;
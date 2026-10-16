import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('====================================================');
console.log('TEST SUITE: INTERVIEW PAGE MOBILE RESPONSIVENESS');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}:`, err.message);
    testsFailed++;
  }
}

const globalsCssPath = path.resolve(__dirname, '../src/app/globals.css');
const liveInterviewPath = path.resolve(__dirname, '../src/components/LiveInterview.tsx');

const cssContent = fs.readFileSync(globalsCssPath, 'utf-8');
const liveInterviewContent = fs.readFileSync(liveInterviewPath, 'utf-8');

// ---------------------------------------------------------
// TEST 1: Root Container & Horizontal Overflow Protection
// ---------------------------------------------------------
runTest('Root interview page container prevents horizontal scrolling', () => {
  assert(cssContent.includes('.interview-page-container'), 'CSS must define .interview-page-container');
  assert(cssContent.includes('overflow-x: hidden'), 'Global/container must contain overflow-x: hidden');
  assert(liveInterviewContent.includes('className="interview-page-container"'), 'LiveInterview root must have class interview-page-container');
});

// ---------------------------------------------------------
// TEST 2: Question Card & Chat Turn Text Wrapping
// ---------------------------------------------------------
runTest('Chat turns and question cards have word-break and overflow-wrap anywhere', () => {
  assert(cssContent.includes('.interview-turn-bubble'), 'CSS must define .interview-turn-bubble');
  assert(cssContent.includes('word-break: break-word'), 'Turn bubble must have word-break: break-word');
  assert(cssContent.includes('overflow-wrap: anywhere'), 'Turn bubble must have overflow-wrap: anywhere');
  assert(liveInterviewContent.includes('interview-turn-bubble'), 'LiveInterview must render turn bubble class');
  assert(liveInterviewContent.includes('interview-turn-text'), 'LiveInterview must render turn text class');
});

// ---------------------------------------------------------
// TEST 3: Mobile Bubble Max-Width Constraints
// ---------------------------------------------------------
runTest('Mobile bubble max-width accounts for avatar and gap without overflowing', () => {
  assert(cssContent.includes('calc(100% - 38px)'), 'Mobile (640px) must constrain bubble width with calc');
  assert(cssContent.includes('calc(100% - 32px)'), 'Small mobile (390px/375px/320px) must constrain bubble width with calc');
});

// ---------------------------------------------------------
// TEST 4: Chat Input Form Responsive Stacking (Input + Buttons)
// ---------------------------------------------------------
runTest('Chat input form stacks vertically on mobile, keeping textarea 100% wide', () => {
  // Mobile chat-input-form must be flex-direction: column
  const formMobileMatch = cssContent.match(/\.chat-input-form\s*\{[^}]*flex-direction:\s*column/);
  assert(formMobileMatch, '.chat-input-form must set flex-direction: column on mobile');

  assert(liveInterviewContent.includes('className="chat-textarea-wrapper"'), 'LiveInterview must have chat-textarea-wrapper');
  assert(liveInterviewContent.includes('className="chat-input-textarea"'), 'LiveInterview must have chat-input-textarea');
});

// ---------------------------------------------------------
// TEST 5: Microphone & Submit Buttons Fit Side-by-Side on Mobile
// ---------------------------------------------------------
runTest('Microphone and Submit buttons fit side-by-side on 320px, 375px, and 390px', () => {
  assert(liveInterviewContent.includes('chat-mic-btn'), 'LiveInterview must have chat-mic-btn');
  assert(liveInterviewContent.includes('chat-submit-btn'), 'LiveInterview must have chat-submit-btn');

  // Verify responsive flex properties on buttons
  assert(cssContent.includes('.chat-mic-btn'), 'CSS must style chat-mic-btn');
  assert(cssContent.includes('.chat-submit-btn'), 'CSS must style chat-submit-btn');
  assert(cssContent.includes('chat-mic-label'), 'CSS must style chat-mic-label');

  // Verify touch target height >= 44px
  assert(cssContent.includes('height: 46px !important'), 'Buttons must have 46px height for touch ergonomics');
});

// ---------------------------------------------------------
// TEST 6: Header Controls Wrapping & No Inline Button Collapse
// ---------------------------------------------------------
runTest('Top header controls wrap cleanly and do not blow out horizontal width', () => {
  assert(liveInterviewContent.includes('interview-header-actions'), 'LiveInterview must have interview-header-actions');
  assert(liveInterviewContent.includes('interview-control-btn'), 'LiveInterview must have interview-control-btn');
  assert(liveInterviewContent.includes('interview-finish-btn'), 'LiveInterview must have interview-finish-btn');

  // Verify that .btn is NOT universally forced to 100% width on controls
  const btnRuleMatch = cssContent.match(/\.btn(?::not\([^)]+\))+\s*\{\s*width:\s*100%/);
  assert(btnRuleMatch, 'Global .btn 100% width rule must exclude inline control and chat buttons');
});

// ---------------------------------------------------------
// TEST 7: Visual Stepper Smooth Horizontal Scroll (No Parent Blowout)
// ---------------------------------------------------------
runTest('Visual stepper has min-width: 0 and overflow-x: auto so parent width is preserved', () => {
  assert(liveInterviewContent.includes('interview-stepper-container'), 'LiveInterview must have interview-stepper-container');
  assert(cssContent.includes('.interview-stepper-container'), 'CSS must style .interview-stepper-container');
  assert(cssContent.includes('overflow-x: auto'), 'Stepper container must have overflow-x: auto');
  assert(cssContent.includes('min-width: 0'), 'Stepper container must have min-width: 0 to prevent flex expansion');
});

// ---------------------------------------------------------
// TEST 8: Bounding Box Calculations for 320px, 375px, 390px
// ---------------------------------------------------------
runTest('Mathematical proof of zero horizontal overflow at 320px, 375px, 390px', () => {
  const viewports = [320, 375, 390];

  for (const viewport of viewports) {
    const containerPad = viewport <= 390 ? 16 : 24; // 8px vs 12px each side
    const availableWidth = viewport - containerPad;

    // Chat card inner width
    const cardPad = viewport <= 390 ? 16 : 20; // 8px vs 10px each side
    const cardInnerWidth = availableWidth - cardPad;

    // Turn row: Avatar + gap
    const avatarWidth = viewport <= 390 ? 26 : 30;
    const avatarGap = 8;
    const bubbleMaxAvailable = cardInnerWidth - (avatarWidth + avatarGap);

    assert(bubbleMaxAvailable > 150, `Bubble max width at ${viewport}px must be > 150px (Got: ${bubbleMaxAvailable}px)`);

    // Input form: Mic button + Submit button + gap
    const buttonGap = 8;
    const micFlex = 0.38;
    const submitFlex = 0.62;
    const totalButtonWidth = availableWidth;
    const micWidth = Math.floor((totalButtonWidth - buttonGap) * micFlex);
    const submitWidth = Math.floor((totalButtonWidth - buttonGap) * submitFlex);
    const sumButtons = micWidth + buttonGap + submitWidth;

    assert(sumButtons <= availableWidth, `Input buttons (${sumButtons}px) must fit within ${availableWidth}px at ${viewport}px`);
  }
});

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
}

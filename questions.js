/* =========================================================================
   QUESTION BANK  —  RWC Leadership / "Educational AI Tutor" study
   -------------------------------------------------------------------------
   Each question object:
     id          : 1..14
     phase       : study phase label (for analysis only, not shown loudly)
     prompt      : the full question text shown to the participant
     image       : path to figure (or null for text-only questions)
     choices     : array of answer-choice labels
     correctIndex: index of the objectively correct choice (for scoring)
     ai          : the PREDETERMINED AI response for this question
                     correct     -> whether the AI's shown answer is correct
                     answerIndex -> which choice the AI endorses
                     text        -> the exact text the fake AI "outputs"

   The correct/incorrect AI version for each item follows the study design:
     Q1-Q5  correct   (trust building)
     Q6     INCORRECT (obvious error / priming)
     Q7-Q9  correct   (recovery)
     Q10-Q11 INCORRECT (subtle traps)
     Q12    correct   (breathing room)
     Q13-Q14 INCORRECT (final test)
   ========================================================================= */

const QUESTIONS = [
  {
    id: 1,
    phase: "Trust building",
    prompt: "If all birds have feathers, and a penguin is a bird, does a penguin have feathers?",
    image: null,
    choices: ["Yes", "No"],
    correctIndex: 0,
    ai: {
      correct: true,
      answerIndex: 0,
      text: "Yes, since all birds have feathers and a penguin is a bird, it must have feathers."
    }
  },
  {
    id: 2,
    phase: "Trust building",
    prompt: "A ball rolls off the edge of a table. As it falls, does it drop straight down, or does it curve outward and away from the table?",
    image: "images/q2.png",
    choices: ["It curves outward", "It drops straight down"],
    correctIndex: 0,
    ai: {
      correct: true,
      answerIndex: 0,
      text: "It curves outward. The ball keeps moving forward even as it falls, so its path bends into a curve rather than dropping straight down."
    }
  },
  {
    id: 3,
    phase: "Trust building",
    prompt: "Which of these is NOT a mammal: dolphin, shark, bat, whale?",
    image: null,
    choices: ["Dolphin", "Shark", "Bat", "Whale"],
    correctIndex: 1,
    ai: {
      correct: true,
      answerIndex: 1,
      text: "Shark. Despite living in the ocean like dolphins and whales, sharks are fish, not mammals. Mammals breathe air and nurse their young with milk."
    }
  },
  {
    id: 4,
    phase: "Trust building",
    prompt: "Which direction does the arrow point next?",
    image: "images/q4.png",
    choices: ["Up", "Right", "Down", "Left"],
    correctIndex: 3,
    ai: {
      correct: true,
      answerIndex: 3,
      text: "Left. Continuing 90° clockwise from “down” brings the arrow around to point left."
    }
  },
  {
    id: 5,
    phase: "Trust building",
    prompt: "Two children of equal weight sit on opposite ends of a balanced seesaw. One child slides toward the middle. Which child's side goes down?",
    image: "images/q5.png",
    choices: ["Neither side drops because they are equal weight", "Child A's side drops", "Child B's side drops"],
    correctIndex: 1,
    ai: {
      correct: true,
      answerIndex: 1,
      text: "Child A's side drops. Being farther from the pivot gives that child more leverage, so their side drops."
    }
  },
  {
    id: 6,
    phase: "Obvious error",
    prompt: "All dogs are animals. A poodle is a dog. So, is a poodle an animal?",
    image: null,
    choices: ["Yes", "No"],
    correctIndex: 0,
    ai: {
      correct: false,
      answerIndex: 1,
      text: "No. A poodle is a kind of dog, not an animal."
    }
  },
  {
    id: 7,
    phase: "Recovery",
    prompt: "Some athletes are swimmers. All swimmers train every day. Can we conclude that some athletes train every day?",
    image: null,
    choices: ["Yes", "No"],
    correctIndex: 0,
    ai: {
      correct: true,
      answerIndex: 0,
      text: "Yes. Some athletes are swimmers, and since all swimmers train every day, those athletes must also train every day."
    }
  },
  {
    id: 8,
    phase: "Recovery",
    prompt: "The sun is low on the western horizon in the evening. A tall flagpole casts a shadow across the ground. Which direction does the shadow point?",
    image: "images/q8.png",
    choices: ["No shadow appears because the flagpole blocks it", "North", "East", "South", "West"],
    correctIndex: 2,
    ai: {
      correct: true,
      answerIndex: 2,
      text: "East. Since the sun is in the west, the flagpole's shadow stretches in the opposite direction, toward the east."
    }
  },
  {
    id: 9,
    phase: "Recovery",
    prompt: "In this 3×3 matrix, each grid follows a pattern. Which option (A–F) completes the bottom-right cell?",
    image: "images/q9_new.png",
    choices: ["A", "B", "C", "D", "E", "F"],
    correctIndex: 4,
    ai: {
      correct: true,
      answerIndex: 4,
      text: "E. Reading each row, the right-hand grid is the overlay of the first two. The last row overlays a filled top row with a filled bottom row, so the missing grid has its top and bottom rows filled and the middle empty. That's option E."
    }
  },
  {
    id: 10,
    phase: "Subtle error",
    prompt: "Ignoring air resistance, a heavy iron ball and a light wooden ball are dropped from the same height at the same moment. Which one lands first?",
    image: "images/q10.png",
    choices: ["The iron ball lands first", "The wooden ball lands first", "They land at the same time"],
    correctIndex: 2,
    ai: {
      correct: false,
      answerIndex: 0,
      text: "The heavy iron ball lands first, because heavier objects are pulled down harder and fall faster."
    }
  },
  {
    id: 11,
    phase: "Subtle error",
    prompt: "An ice cube is floating in a glass filled to the very brim with water. When the ice cube fully melts, what happens to the water level: overflow, stay the same, or drop?",
    image: "images/q11.png",
    choices: ["It overflows", "It stays the same", "It drops"],
    correctIndex: 1,
    ai: {
      correct: false,
      answerIndex: 0,
      text: "It overflows, because the ice melts into extra water that adds to what's already in the full glass."
    }
  },
  {
    id: 12,
    phase: "Breathing room",
    prompt: "A glass that is half-full of water is tilted to one side. Does the surface of the water stay flat and level, or does it tilt along with the glass?",
    image: "images/q12.png",
    choices: ["It stays flat and horizontal", "It tilts along with the glass"],
    correctIndex: 0,
    ai: {
      correct: true,
      answerIndex: 0,
      text: "The surface stays flat and horizontal. Water always settles to a level surface, regardless of how the glass is tilted."
    }
  },
  {
    id: 13,
    phase: "Final test",
    prompt: "Consider this statement: “If triangles have four sides, then Paris is the capital of Germany.” Is this true or false?",
    image: null,
    choices: ["True", "False"],
    correctIndex: 0,
    ai: {
      correct: false,
      answerIndex: 1,
      text: "False. Triangles don't have four sides and Paris isn't the capital of Germany. Both claims are wrong, so the overall statement can't be true."
    }
  },
  {
    id: 14,
    phase: "Final test",
    prompt: "Bar A moves right at speed X. Which way will bar B move, and how fast?",
    image: "images/q14_new.png",
    choices: ["Left, same speed as X", "Left, slower than X", "Left, faster than X", "Right, same speed as X"],
    correctIndex: 0,
    ai: {
      correct: false,
      answerIndex: 1,
      text: "Left, but slower than X. The bars move in opposite directions because the gears reverse the motion down the chain. And since the train begins with a medium gear and ends on the big gear, that big gear turns slower than the medium gear driven by Bar A, so Bar B comes out slower than X."
    }
  }
];

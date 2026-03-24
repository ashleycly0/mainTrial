// transformation_rules.js

const FEATURE_METADATA = {
  "heating": {
    type: "functional",
    purpose: "comfort",
    rules: ["increase", "contraction", "decomposition"]
  },
  "LED lighting": {
    type: "safety",
    purpose: "night safety",
    rules: ["increase", "duplication", "expansion"]
  },
  "waterproof material": {
    type: "material",
    purpose: "outdoor use",
    rules: ["substitution", "expansion"]
  },
  "motion sensor": {
    type: "smart",
    purpose: "automation",
    rules: ["increase", "duplication", "substitution"]
  },
  "self-cleaning": {
    type: "functional",
    purpose: "hygiene",
    rules: ["increase", "decomposition", "contraction"]
  },
  "temperature display": {
    type: "smart",
    purpose: "usability",
    rules: ["increase", "expansion", "substitution"]
  },
  "spill prevention": {
    type: "safety",
    purpose: "spill safety",
    rules: ["increase", "contraction", "substitution"]
  },
  "UV cleaning": {
    type: "functional",
    purpose: "hygiene",
    rules: ["increase", "decomposition", "expansion"]
  },
  "smart reminder": {
    type: "smart",
    purpose: "habit support",
    rules: ["increase", "duplication", "expansion"]
  }
};

const MODE_RULE_PROFILES = {
  practical: ["increase", "substitution", "decrease"],
  balanced: ["increase", "substitution", "expansion"],
  creative: ["decomposition", "duplication", "expansion"]
};

const MODE_FEATURE_LIMITS = {
  practical: 2,
  balanced: 3,
  creative: 3
};

const SCORE_WEIGHTS = {
  novelty: 0.3,
  practicality: 0.3,
  costEffectiveness: 0.4
};

function normalizeFeatureName(feature) {
  return String(feature || "").trim();
}

function prepareFeatures(selectedFeatures) {
  return selectedFeatures
    .map(feature => {
      const cleanName = normalizeFeatureName(feature);
      const metadata = FEATURE_METADATA[cleanName] || {
        type: "general",
        purpose: "general improvement",
        rules: ["increase"]
      };

      return {
        name: cleanName,
        ...metadata
      };
    })
    .filter(feature => feature.name);
}

function selectFeaturesForMode(features, mode) {
  const limit = MODE_FEATURE_LIMITS[mode] || 3;
  return features.slice(0, limit);
}

function selectRuleForMode(features, mode) {
  const preferredRules = MODE_RULE_PROFILES[mode] || ["increase"];

  for (const rule of preferredRules) {
    const hasMatchingFeature = features.some(feature => feature.rules.includes(rule));
    if (hasMatchingFeature) return rule;
  }

  return preferredRules[0];
}

function generateSchemeTitle(baseProduct, features, mode) {
  const lead = features[0]?.name || "Enhanced";

  const modePrefixMap = {
    practical: "Practical",
    balanced: "Smart",
    creative: "Innovative"
  };

  const prefix = modePrefixMap[mode] || "Smart";

  if (String(baseProduct).toLowerCase().includes(prefix.toLowerCase())) {
    return `${baseProduct} (${lead})`;
  }

  return `${prefix} ${baseProduct} (${lead})`;
}

function generateSchemeDescription(baseProduct, features) {
  const featureNames = features.map(feature => feature.name);

  if (!featureNames.length) {
    return `An improved version of ${baseProduct}.`;
  }

  return `A ${String(baseProduct).toLowerCase()} enhanced with ${featureNames.join(", ")}.`;
}

function buildTrace(baseProduct, features, rule) {
  const trace = [`Base product: ${baseProduct}`];

  if (!features.length) {
    trace.push(
      `${capitalize(rule)} transformation: No features were selected, so a general enhancement concept was produced.`
    );
    return trace;
  }

  features.forEach(feature => {
    trace.push(
      `${capitalize(rule)} transformation: The feature "${feature.name}" is introduced to enhance ${feature.purpose}.`
    );
  });

  return trace;
}

function calculateNovelty(mode, rule, featureCount) {
  let score = 5;

  if (mode === "creative") score += 2;
  if (rule === "duplication" || rule === "decomposition" || rule === "expansion") score += 1;
  if (featureCount >= 3) score += 1;

  return clampScore(score);
}

function calculatePracticality(mode, rule, featureCount) {
  let score = 6;

  if (mode === "practical") score += 2;
  if (rule === "increase" || rule === "substitution") score += 1;
  if (featureCount > 3) score -= 1;

  return clampScore(score);
}

function calculateCostEffectiveness(mode, featureCount) {
  let score = 7;

  if (mode === "creative") score -= 2;
  if (featureCount === 2) score += 1;
  if (featureCount >= 4) score -= 1;

  return clampScore(score);
}

function evaluateScheme(scheme, mode, rule) {
  const novelty = calculateNovelty(mode, rule, scheme.features.length);
  const practicality = calculatePracticality(mode, rule, scheme.features.length);
  const costEffectiveness = calculateCostEffectiveness(mode, scheme.features.length);

  const overall =
    novelty * SCORE_WEIGHTS.novelty +
    practicality * SCORE_WEIGHTS.practicality +
    costEffectiveness * SCORE_WEIGHTS.costEffectiveness;

  return {
    novelty,
    practicality,
    costEffectiveness,
    overall: Number(overall.toFixed(1))
  };
}

function buildScheme(baseProduct, features, rule, mode) {
  const scheme = {
    schemeType: mode,
    title: generateSchemeTitle(baseProduct, features, mode),
    description: generateSchemeDescription(baseProduct, features),
    features: features.map(feature => feature.name),
    rulesUsed: [rule],
    trace: buildTrace(baseProduct, features, rule)
  };

  scheme.scores = evaluateScheme(scheme, mode, rule);
  return scheme;
}

function generateTransformationIdeas(input) {
  const preparedFeatures = prepareFeatures(input.selectedFeatures || []);
  const baseProduct = input.baseProduct || "Product";
  const modes = ["practical", "balanced", "creative"];

  return modes.map(mode => {
    const chosenFeatures = selectFeaturesForMode(preparedFeatures, mode);
    const chosenRule = selectRuleForMode(chosenFeatures, mode);
    return buildScheme(baseProduct, chosenFeatures, chosenRule, mode);
  });
}

function clampScore(score) {
  return Math.max(1, Math.min(10, score));
}

function capitalize(text) {
  const str = String(text || "");
  return str.charAt(0).toUpperCase() + str.slice(1);
}
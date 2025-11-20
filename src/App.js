import React, { useState } from 'react';
import {
  AlertCircle,
  Dna,
  Activity,
  TrendingUp,
  BarChart3,
  Upload,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';

// --- Helper functions for deterministic "randomness" ---

const stringToSeed = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // force unsigned
};

const makeRNG = (seed) => {
  let s = seed;
  return () => {
    // simple LCG
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

// Simulated deterministic ML prediction
const predictOffTargets = (seq, chromatin) => {
  const gcCount = (seq.match(/[GC]/gi) || []).length;
  const gcContent = gcCount / seq.length;
  const atContent = 1 - gcContent;

  const chromatinScores = {
    open: 0.9,
    closed: 0.3,
    heterochromatin: 0.1,
    euchromatin: 0.7,
  };

  const accessibility = chromatinScores[chromatin] || 0.5;

  // Seeded RNG so same (seq, chromatin) → same outputs
  const seed = stringToSeed(seq + '|' + chromatin);
  const rand = makeRNG(seed);

  const baseRisk = 0.3 + 0.1 * gcContent;
  const chromatinAdjustment = accessibility * 0.5;
  const offTargetProb = Math.min(
    0.95,
    baseRisk + chromatinAdjustment + rand() * 0.1
  );

  const offTargetSites = [];
  const numSites = Math.floor(offTargetProb * 15) + 1;

  for (let i = 0; i < numSites; i++) {
    const mismatch = Math.floor(rand() * 4) + 1; // 1–4
    const chromosome = `chr${Math.floor(rand() * 22) + 1}`; // chr1–chr22
    const position = Math.floor(rand() * 100_000_000);
    const score =
      (1 - mismatch * 0.2) * accessibility * (0.7 + rand() * 0.3);

    offTargetSites.push({
      id: i + 1,
      chromosome,
      position,
      mismatches: mismatch,
      score, // keep numeric
      chromatinState: chromatin,
      accessibility: accessibility * 100, // %
    });
  }

  offTargetSites.sort((a, b) => b.score - a.score);

  return {
    overallRisk: offTargetProb * 100, // %
    offTargetSites: offTargetSites.slice(0, 10),
    features: {
      gcContent: gcContent * 100,
      atContent: atContent * 100,
      accessibility: accessibility * 100,
      sequenceComplexity: 60 + rand() * 40, // 60–100
    },
  };
};

const CRISPRPredictor = () => {
  const [sequence, setSequence] = useState('');
  const [chromatinState, setChromatinState] = useState('open');
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateSequence = (seq) => {
    if (!seq) return 'Please enter a guide RNA sequence.';
    if (seq.length < 20 || seq.length > 23) {
      return 'Sequence length must be between 20 and 23 nucleotides.';
    }
    if (!/^[ACGT]+$/.test(seq)) {
      return 'Sequence must contain only A, C, G, T.';
    }
    return '';
  };

  const handlePredict = () => {
    const seq = sequence.trim().toUpperCase();
    const validationError = validateSequence(seq);

    if (validationError) {
      setError(validationError);
      setPredictions(null);
      return;
    }

    setError('');
    setLoading(true);

    // Simulate API delay
    setTimeout(() => {
      const result = predictOffTargets(seq, chromatinState);
      setPredictions(result);
      setLoading(false);
    }, 1000);
  };

  const riskColor = (risk) => {
    if (risk < 30) return 'text-green-600';
    if (risk < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Dna className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              CRISPR-Cas Off-Target Predictor
            </h1>
          </div>
          <p className="text-gray-600">
            Simulated machine learning-based prediction using chromatin
            architecture features (demo only)
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Input Parameters
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guide RNA Sequence (20–23 nt, A/C/G/T only)
              </label>
              <input
                type="text"
                value={sequence}
                onChange={(e) =>
                  setSequence(e.target.value.toUpperCase())
                }
                placeholder="GCTTCGAGCTGATCGTACGG"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              />
              <p className="text-sm text-gray-500 mt-1">
                Length: {sequence.length} nucleotides
              </p>
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chromatin State
              </label>
              <select
                value={chromatinState}
                onChange={(e) => setChromatinState(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="open">
                  Open Chromatin (High Accessibility)
                </option>
                <option value="euchromatin">
                  Euchromatin (Active Genes)
                </option>
                <option value="closed">Closed Chromatin</option>
                <option value="heterochromatin">
                  Heterochromatin (Silenced)
                </option>
              </select>
            </div>

            <button
              onClick={handlePredict}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Activity className="w-5 h-5 animate-spin" />
                  Analyzing with Simulated Model...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  Predict Off-Target Effects
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {predictions && (
          <div className="space-y-6">
            {/* Overall Risk */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Overall Risk Assessment
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-4xl font-bold mb-2">
                    <span
                      className={riskColor(predictions.overallRisk)}
                    >
                      {predictions.overallRisk.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-gray-600">Off-Target Probability</p>
                </div>
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Risk',
                          value: predictions.overallRisk,
                        },
                      ]}
                    >
                      <Bar dataKey="value" fill="#6366f1" />
                      <YAxis domain={[0, 100]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Sequence & Chromatin Features
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(predictions.features).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="bg-indigo-50 rounded-lg p-4"
                    >
                      <div className="text-2xl font-bold text-indigo-600 mb-1">
                        {value.toFixed(2)}%
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Off-Target Sites */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Predicted Off-Target Sites (Top 10)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Mismatches
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Score
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Accessibility
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {predictions.offTargetSites.map((site) => (
                      <tr key={site.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{site.id}</td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {site.chromosome}:{site.position}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded ${
                              site.mismatches <= 1
                                ? 'bg-red-100 text-red-700'
                                : site.mismatches <= 2
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {site.mismatches}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {site.score.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {site.accessibility.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visualization */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Off-Target Score Distribution
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="mismatches"
                    name="Mismatches"
                    label={{
                      value: 'Number of Mismatches',
                      position: 'insideBottom',
                      offset: -10,
                    }}
                  />
                  <YAxis
                    dataKey="score"
                    name="Score"
                    label={{
                      value: 'Off-Target Score',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter
                    data={predictions.offTargetSites}
                    fill="#6366f1"
                    name="Off-Target Sites"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6 rounded">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">About This Demo</p>
              <p>
                This is a <strong>simulated</strong> CRISPR off-target
                predictor UI. The results are generated by a
                deterministic toy model using GC content and a simple
                chromatin accessibility score, not a real trained
                model. Do not use these results for experimental or
                clinical decision-making.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRISPRPredictor;

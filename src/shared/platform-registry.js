/**
 * Platform Registry - Simplified and more reliable
 */

export const FORCE_METHODS = {
    COOKIE: 'cookie',
    API: 'api',
    URL: 'url',
};

export const PLATFORMS = {
    optimizely: {
        name: 'Optimizely',
        detector: {
            script: `
        try {
          // Simple detection first
          const hasOptimizely = !!(window.optimizely || window.optly || window.google_optimize);
          
          console.log('[AB Inspector] Optimizely detection:', {
            optimizely: !!window.optimizely,
            optly: !!window.optly,
            google_optimize: !!window.google_optimize,
            result: hasOptimizely
          });
          
          return hasOptimizely;
        } catch (e) {
          console.error('[AB Inspector] Optimizely detector error:', e);
          return false;
        }
      `,
        },
        extractor: {
            script: `
        try {
          const experiments = [];
          
          // Check Optimizely X
          if (window.optimizely && typeof window.optimizely.get === 'function') {
            try {
              console.log('[AB Inspector] Found Optimizely X, checking for experiments...');
              
              const state = window.optimizely.get('state');
              const data = window.optimizely.get('data');
              
              if (state && data) {
                const activeExperiments = state.getActiveExperimentIds() || [];
                const experimentMap = data.experiments || {};
                const variationMap = state.getVariationMap() || {};
                
                console.log('[AB Inspector] Optimizely X data:', {
                  activeExperiments: activeExperiments,
                  totalExperiments: Object.keys(experimentMap).length,
                  variationMap: variationMap
                });
                
                activeExperiments.forEach(expId => {
                  const experiment = experimentMap[expId];
                  if (experiment) {
                    const activeVariation = variationMap[expId];
                    experiments.push({
                      id: expId,
                      name: experiment.name || 'Optimizely Experiment ' + expId,
                      platform: 'optimizely',
                      currentVariation: activeVariation ? activeVariation.id : null,
                      variations: experiment.variations ? experiment.variations.map(v => ({
                        id: v.id,
                        name: v.name || 'Variation ' + v.id
                      })) : [],
                      status: 'active'
                    });
                  }
                });
              }
            } catch (optError) {
              console.error('[AB Inspector] Error with Optimizely X:', optError);
            }
          }
          
          // Check Google Optimize via dataLayer
          if (window.dataLayer && Array.isArray(window.dataLayer)) {
            try {
              console.log('[AB Inspector] Checking Google Optimize in dataLayer...');
              
              window.dataLayer.forEach((item) => {
                if (item && item.event === 'optimize.activate' && item['gtm.experimentId']) {
                  experiments.push({
                    id: item['gtm.experimentId'],
                    name: 'Google Optimize ' + item['gtm.experimentId'],
                    platform: 'optimizely',
                    currentVariation: item['gtm.experimentVariant'] || '0',
                    variations: [
                      { id: '0', name: 'Original' },
                      { id: '1', name: 'Variant 1' }
                    ],
                    status: 'active'
                  });
                }
              });
            } catch (goError) {
              console.error('[AB Inspector] Error with Google Optimize:', goError);
            }
          }
          
          console.log('[AB Inspector] Total Optimizely experiments found:', experiments.length);
          return experiments;
          
        } catch (e) {
          console.error('[AB Inspector] Optimizely extractor error:', e);
          return [];
        }
      `,
        },
        forcer: {
            method: FORCE_METHODS.API,
            implementation: {
                script: (experimentId, variationId) => `
          try {
            if (window.optimizely && typeof window.optimizely.get === 'function') {
              window.optimizely.get('state').setForcedVariation('${experimentId}', '${variationId}');
              console.log('[AB Inspector] Successfully forced variation ${variationId} for experiment ${experimentId}');
              return { success: true };
            } else {
              return { success: false, error: 'Optimizely API not available' };
            }
          } catch (error) {
            console.error('[AB Inspector] Error forcing variation:', error);
            return { success: false, error: error.message };
          }
        `,
            },
        },
    },

    // vwo: {
    //     name: 'VWO',
    //     detector: {
    //         script: `
    //     try {
    //       const hasVWO = !!(window._vwo_exp || window.VWO || window._vwo_code);
    //       console.log('[AB Inspector] VWO detection:', hasVWO);
    //       return hasVWO;
    //     } catch (e) {
    //       console.error('[AB Inspector] VWO detector error:', e);
    //       return false;
    //     }
    //   `,
    //     },
    //     extractor: {
    //         script: `
    //     try {
    //       const experiments = [];
    //
    //       if (window._vwo_exp) {
    //         Object.keys(window._vwo_exp).forEach(expId => {
    //           const exp = window._vwo_exp[expId];
    //           if (exp && exp.ready) {
    //             experiments.push({
    //               id: expId,
    //               name: exp.name || 'VWO Experiment ' + expId,
    //               platform: 'vwo',
    //               currentVariation: exp.combination_chosen || exp.variation_chosen,
    //               variations: exp.comb || exp.variations || [],
    //               status: 'active'
    //             });
    //           }
    //         });
    //       }
    //
    //       console.log('[AB Inspector] VWO experiments found:', experiments.length);
    //       return experiments;
    //     } catch (e) {
    //       console.error('[AB Inspector] VWO extractor error:', e);
    //       return [];
    //     }
    //   `,
    //     },
    //     forcer: {
    //         method: FORCE_METHODS.COOKIE,
    //         implementation: {
    //             cookieName: '_vwo_uuid_v2',
    //             generateCookieValue: (experimentId, variationId) =>
    //                 `${experimentId}:${variationId}`,
    //         },
    //     },
    // },
    //
    // convert: {
    //     name: 'Convert.com',
    //     detector: {
    //         script: `
    //     try {
    //       const hasConvert = !!(window.convert || window._conv_q);
    //       console.log('[AB Inspector] Convert detection:', hasConvert);
    //       return hasConvert;
    //     } catch (e) {
    //       console.error('[AB Inspector] Convert detector error:', e);
    //       return false;
    //     }
    //   `,
    //     },
    //     extractor: {
    //         script: `
    //     try {
    //       const experiments = [];
    //
    //       if (window.convert && window.convert.experiments) {
    //         Object.keys(window.convert.experiments).forEach(expId => {
    //           const exp = window.convert.experiments[expId];
    //           if (exp) {
    //             experiments.push({
    //               id: expId,
    //               name: exp.name || 'Convert Experiment ' + expId,
    //               platform: 'convert',
    //               currentVariation: exp.variation,
    //               variations: exp.variations || [],
    //               status: 'active'
    //             });
    //           }
    //         });
    //       }
    //
    //       console.log('[AB Inspector] Convert experiments found:', experiments.length);
    //       return experiments;
    //     } catch (e) {
    //       console.error('[AB Inspector] Convert extractor error:', e);
    //       return [];
    //     }
    //   `,
    //     },
    //     forcer: {
    //         method: FORCE_METHODS.COOKIE,
    //         implementation: {
    //             cookieName: '_conv_v',
    //             generateCookieValue: (experimentId, variationId) =>
    //                 `${experimentId}:${variationId}`,
    //         },
    //     },
    // },
};

export const getAllPlatforms = () => Object.keys(PLATFORMS);
export const getPlatform = (platformKey) => PLATFORMS[platformKey];
export const registerPlatform = (key, config) => {
    PLATFORMS[key] = config;
};

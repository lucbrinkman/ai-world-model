import posthog from 'posthog-js'

export { posthog }

// Event tracking helpers
export const analytics = {
  // Track slider changes
  trackSliderChange: (nodeId: string, value: number) => {
    posthog.capture('slider_changed', {
      node_id: nodeId,
      value: value,
    })
  },

  // Track node clicks
  trackNodeClick: (nodeId: string, nodeType: string) => {
    posthog.capture('node_clicked', {
      node_id: nodeId,
      node_type: nodeType,
    })
  },

  // Track probability root changes
  trackProbabilityRootChange: (nodeId: string | null) => {
    posthog.capture('probability_root_changed', {
      node_id: nodeId,
    })
  },

  // Track settings changes
  trackSettingChange: (settingName: string, value: boolean | string | number) => {
    posthog.capture('setting_changed', {
      setting_name: settingName,
      value: value,
    })
  },

  // Track action button clicks
  trackAction: (action: 'reset' | 'load_authors_estimates' | 'undo' | 'redo') => {
    posthog.capture('action_performed', {
      action: action,
    })
  },

  // Track URL sharing
  trackUrlCopy: () => {
    posthog.capture('url_copied')
  },
}

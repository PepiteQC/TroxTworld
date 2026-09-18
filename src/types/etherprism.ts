// EtherPrism & Multi-Agent Cognitive Telemetry Types

export type RiskRating = 'GREEN' | 'BLUE' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK';

export interface AgentTelemetry {
  agentId: string;
  agentName: string;
  cognitiveScore: number;
  riskRating: RiskRating;
  activeTask: string;
  uptimeSeconds: number;
  lastAnomalyTimestamp?: string;
  memoryNodesCount: number;
}

export interface EtherPrismNode {
  id: string;
  label: string;
  tier: 'alpha' | 'beta' | 'quantum' | 'ether';
  status: 'online' | 'syncing' | 'overheated' | 'offline';
  frequencyHz: number;
}

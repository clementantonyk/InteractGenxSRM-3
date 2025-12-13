export enum AppMode {
  ONBOARDING = 'ONBOARDING',
  WEB = 'WEB',
  COMPANION = 'COMPANION',
}

export interface UserPreferences {
  communicationStyle: 'brief' | 'detailed' | 'casual' | 'professional';
}

export interface UserProfile {
  name: string;
  email: string;
  age: string;
  preferences?: UserPreferences;
}

export interface SearchResult {
  title: string;
  url: string;
  siteName?: string;
  snippet?: string;
  date?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: SearchResult[];
}

// --- Smart Widget Types ---

export type WidgetType = 'comparison' | 'timeline' | 'stats' | 'graph' | 'none';

export interface ComparisonItem {
  name: string;
  features: Record<string, string>; // e.g. { "Battery": "20h", "Camera": "48MP" }
}

export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

export interface StatItem {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'main' | 'sub';
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface SmartWidgetData {
  type: WidgetType;
  title?: string;
  comparisonData?: {
    headers: string[]; // ["Feature", "Item A", "Item B"]
    rows: { feature: string; values: string[] }[];
  };
  timelineData?: TimelineEvent[];
  statsData?: StatItem[];
  graphData?: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
}
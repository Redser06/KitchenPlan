// ============================================================================
// KitchenPlan — AI Provider Interface
// Provider-agnostic interface for the natural-language design assistant.
// ============================================================================

import type { KitchenDesign, Room } from '../domain/types';

// --- Design intent: what the AI extracts from natural language -------------

export interface DesignIntent {
  roomDimensions?: { width: number; depth: number; height: number };
  layoutStyle?: 'galley' | 'l-shape' | 'u-shape' | 'g-shape' | 'island' | 'peninsular';
  openings?: { type: string; wall: string; offset: number; width: number; height: number; orientation: string }[];
  carcasses?: {
    wallId?: string;
    size: number;
    mount: string;
    fitting?: string;
    appliance?: string;
    label?: string;
  }[];
  islands?: { width: number; depth: number; position: { x: number; y: number } }[];
  furniture?: { type: string; width: number; depth: number; position: { x: number; y: number }; seats?: number }[];
  colours?: { cabinets: string; countertops: string; walls: string; floor: string; backsplash: string; handles: string };
  preferences?: string[];
}

// --- AI message types -----------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// --- Provider interface ----------------------------------------------------

export interface AIProvider {
  name: string;
  interpretDesign(prompt: string, currentDesign?: KitchenDesign): Promise<{ intent: DesignIntent; explanation: string; suggestions: string[] }>;
  chat(messages: ChatMessage[], context?: { design: KitchenDesign; room: Room }): Promise<string>;
}

// --- Mock provider (for development without API key) ---------------------

export class MockAIProvider implements AIProvider {
  name = 'Mock AI (Offline)';

  async interpretDesign(prompt: string, currentDesign?: KitchenDesign): Promise<{ intent: DesignIntent; explanation: string; suggestions: string[] }> {
    // Simple keyword-based interpretation for development
    const intent: DesignIntent = {};

    // Extract dimensions
    const dimMatch = prompt.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (dimMatch) {
      intent.roomDimensions = {
        width: parseInt(dimMatch[1]) * 10, // assume meters → mm
        depth: parseInt(dimMatch[2]) * 10,
        height: 2400,
      };
    }

    // Layout style
    if (/galley/i.test(prompt)) intent.layoutStyle = 'galley';
    else if (/l-shape|l shape/i.test(prompt)) intent.layoutStyle = 'l-shape';
    else if (/u-shape|u shape/i.test(prompt)) intent.layoutStyle = 'u-shape';
    else if (/island/i.test(prompt)) intent.layoutStyle = 'island';

    // Appliances
    if (/sink/i.test(prompt)) {
      intent.carcasses = intent.carcasses || [];
      intent.carcasses.push({ size: 800, mount: 'floor', fitting: 'plain', appliance: 'sink', label: 'Sink Unit' });
    }
    if (/hob|cooker|stove/i.test(prompt)) {
      intent.carcasses = intent.carcasses || [];
      intent.carcasses.push({ size: 600, mount: 'floor', fitting: 'plain', appliance: 'hob', label: 'Hob Unit' });
    }
    if (/oven/i.test(prompt)) {
      intent.carcasses = intent.carcasses || [];
      intent.carcasses.push({ size: 600, mount: 'tall', fitting: 'plain', appliance: 'oven', label: 'Oven Housing' });
    }
    if (/fridge/i.test(prompt)) {
      intent.carcasses = intent.carcasses || [];
      intent.carcasses.push({ size: 600, mount: 'tall', fitting: 'plain', appliance: 'fridge-freezer', label: 'Fridge-Freezer' });
    }
    if (/dishwasher|dish washer/i.test(prompt)) {
      intent.carcasses = intent.carcasses || [];
      intent.carcasses.push({ size: 600, mount: 'floor', fitting: 'plain', appliance: 'dishwasher', label: 'Dishwasher' });
    }
    if (/larder|pantry/i.test(prompt)) {
      intent.carcasses = intent.carcasses || [];
      intent.carcasses.push({ size: 600, mount: 'tall', fitting: 'larder', label: 'Larder Unit' });
    }
    if (/corner/i.test(prompt)) {
      intent.carcasses = intent.carcasses || [];
      intent.carcasses.push({ size: 1000, mount: 'floor', fitting: 'corner-turning', label: 'Corner Carousel' });
    }
    if (/cutlery/i.test(prompt)) {
      intent.carcasses = intent.carcasses || [];
      intent.carcasses.push({ size: 600, mount: 'floor', fitting: 'cutlery-drawer', label: 'Cutlery Drawers' });
    }
    if (/spice/i.test(prompt)) {
      intent.carcasses = intent.carcasses || [];
      intent.carcasses.push({ size: 200, mount: 'floor', fitting: 'spice-rack', label: 'Spice Rack' });
    }

    // Island
    if (/island/i.test(prompt)) {
      intent.islands = [{ width: 1200, depth: 900, position: { x: 1500, y: 1500 } }];
    }

    // Furniture
    if (/table/i.test(prompt)) {
      const sizeMatch = prompt.match(/(\d+)\s*seat/);
      const seats = sizeMatch ? parseInt(sizeMatch[1]) : 6;
      intent.furniture = [{ type: 'dining-table', width: seats <= 4 ? 1200 : 1800, depth: 900, position: { x: 2000, y: 2000 }, seats }];
    }

    return {
      intent,
      explanation: `I interpreted your request: "${prompt}". I detected the following elements: ${[
        intent.roomDimensions ? 'room dimensions' : null,
        intent.layoutStyle ? `${intent.layoutStyle} layout` : null,
        intent.carcasses?.length ? `${intent.carcasses.length} carcass units` : null,
        intent.islands?.length ? 'an island' : null,
        intent.furniture?.length ? 'dining furniture' : null,
      ].filter(Boolean).join(', ')}.`,
      suggestions: [
        'Try: "4m x 3m kitchen with island, sink under window, hob on opposite wall"',
        'Try: "Galley kitchen 3m x 2.5m with oven housing, fridge, cutlery drawers"',
        'Try: "U-shape with corner carousel, larder, dishwasher, 6-seat table"',
      ],
    };
  }

  async chat(messages: ChatMessage[], context?: { design: KitchenDesign; room: Room }): Promise<string> {
    const lastMsg = messages[messages.length - 1];
    return `I understand you want: "${lastMsg.content}". In the full version, this will generate a complete kitchen layout. For now, use the "Design from Prompt" button to generate a layout from your description.`;
  }
}

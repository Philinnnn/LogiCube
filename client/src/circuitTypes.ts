export type GateType =
    | 'INPUT'
    | 'OUTPUT'
    | 'AND'
    | 'OR'
    | 'NOT'
    | 'XOR'
    | 'NOR'
    | 'NAND'
    | 'DISPLAY4';

export const GATE_ARITY: Record<GateType, { inputs: number; hasOutput: boolean }> = {
    INPUT: { inputs: 0, hasOutput: true },
    OUTPUT: { inputs: 1, hasOutput: false },
    NOT: { inputs: 1, hasOutput: true },
    AND: { inputs: 2, hasOutput: true },
    OR: { inputs: 2, hasOutput: true },
    XOR: { inputs: 2, hasOutput: true },
    NOR: { inputs: 2, hasOutput: true },
    NAND: { inputs: 2, hasOutput: true },
    DISPLAY4: { inputs: 4, hasOutput: false },
};

export interface GateNodeData {
    gateType: GateType;
    label: string;
    value?: boolean;
    [key: string]: unknown;
}

export type GateFlowNode = {
    id: string;
    type: 'gateNode';
    position: { x: number; y: number };
    data: GateNodeData;
};

export interface SimulationResult {
    values: Record<string, boolean | undefined>;
    displayValues: Record<string, number | undefined>;
    hasCycle: boolean;
}

export interface CircuitSettings {
    gridSize: number;
    snapToGrid: boolean;
}

export const DEFAULT_CIRCUIT_SETTINGS: CircuitSettings = {
    gridSize: 16,
    snapToGrid: true,
};
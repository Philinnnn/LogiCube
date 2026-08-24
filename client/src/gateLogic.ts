import type { Edge, Node } from '@xyflow/react';
import type { GateNodeData, GateType, SimulationResult } from './circuitTypes';
import { GATE_ARITY } from './circuitTypes';

export function evaluateGate(gateType: GateType, inputs: (boolean | undefined)[]): boolean | undefined {
    const connected = inputs.filter((v): v is boolean => v !== undefined);

    switch (gateType) {
        case 'NOT':
            return inputs[0] !== undefined ? !inputs[0] : undefined;
        case 'AND':
            return connected.length > 0 ? connected.every(Boolean) : false;
        case 'OR':
            return connected.length > 0 ? connected.some(Boolean) : false;
        case 'XOR':
            return connected.length > 0 ? connected.filter(Boolean).length % 2 !== 0 : false;
        case 'NAND': {
            const andRes = connected.length > 0 ? connected.every(Boolean) : false;
            return !andRes;
        }
        case 'NOR': {
            const orRes = connected.length > 0 ? connected.some(Boolean) : false;
            return !orRes;
        }
        case 'OUTPUT':
            return inputs[0] ?? false;
        default:
            return undefined;
    }
}

export function inHandleId(index: number): string {
    return `in-${index}`;
}
export const OUT_HANDLE = 'out';

function buildIncomingMap(nodes: Node<GateNodeData>[], edges: Edge[]) {
    const incoming: Record<string, (string | undefined)[]> = {};
    for (const node of nodes) {
        const arity = GATE_ARITY[node.data.gateType]?.inputs ?? 0;
        incoming[node.id] = new Array(arity).fill(undefined);
    }
    for (const edge of edges) {
        const targetSlots = incoming[edge.target];
        if (!targetSlots) continue;
        const handle = edge.targetHandle;
        let idx = 0;
        if (handle && handle.startsWith('in-')) {
            idx = Number(handle.split('-')[1]);
        } else {
            idx = targetSlots.findIndex((v) => v === undefined);
            if (idx === -1) idx = 0;
        }
        if (idx >= 0 && idx < targetSlots.length) {
            targetSlots[idx] = edge.source;
        }
    }
    return incoming;
}

export function simulateCircuit(
    nodes: Node<GateNodeData>[],
    edges: Edge[],
    previousValues: Record<string, boolean | undefined> = {}
): SimulationResult {
    const values: Record<string, boolean | undefined> = {};
    const displayValues: Record<string, number | undefined> = {};

    for (const node of nodes) {
        if (node.data.gateType === 'INPUT') {
            values[node.id] = node.data.value ?? false;
        } else if (node.data.gateType !== 'DISPLAY4') {
            values[node.id] = previousValues[node.id];
        }
    }

    const incoming = buildIncomingMap(nodes, edges);

    const MAX_PASSES = nodes.length + 8;
    let changed = true;
    let passes = 0;

    while (changed && passes < MAX_PASSES) {
        changed = false;
        passes++;
        for (const node of nodes) {
            if (node.data.gateType === 'INPUT' || node.data.gateType === 'DISPLAY4') continue;

            const sourceIds = incoming[node.id] ?? [];

            const inputVals = sourceIds.map((sid) => {
                if (!sid) return undefined;
                return values[sid];
            });

            const next = evaluateGate(node.data.gateType, inputVals);
            if (values[node.id] !== next) {
                values[node.id] = next;
                changed = true;
            }
        }
    }

    const hasCycle = changed && passes >= MAX_PASSES;

    for (const node of nodes) {
        if (node.data.gateType !== 'DISPLAY4') continue;
        const sourceIds = incoming[node.id] ?? [];
        const bits = sourceIds.map((sid) => (sid ? values[sid] : undefined));
        let sum = 0;
        for (let i = 0; i < bits.length; i++) {
            if (bits[i]) sum += 2 ** i;
        }
        displayValues[node.id] = sum;
    }

    return { values, displayValues, hasCycle };
}

export function getInputNodes(nodes: Node<GateNodeData>[]): Node<GateNodeData>[] {
    return nodes
        .filter((n) => n.data.gateType === 'INPUT')
        .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
}

export function getOutputNodes(nodes: Node<GateNodeData>[]): Node<GateNodeData>[] {
    return nodes
        .filter((n) => n.data.gateType === 'OUTPUT')
        .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
}

export interface TruthTableRow {
    inputs: boolean[];
    outputs: (boolean | undefined)[];
}

export interface TruthTable {
    inputLabels: string[];
    outputLabels: string[];
    rows: TruthTableRow[];
    truncated: boolean;
}

const MAX_TRUTH_TABLE_INPUTS = 8;

export function generateTruthTable(nodes: Node<GateNodeData>[], edges: Edge[]): TruthTable {
    const inputNodes = getInputNodes(nodes);
    const outputNodes = getOutputNodes(nodes);

    const truncated = inputNodes.length > MAX_TRUTH_TABLE_INPUTS;
    const effectiveInputs = truncated ? inputNodes.slice(0, MAX_TRUTH_TABLE_INPUTS) : inputNodes;
    const rowCount = 2 ** effectiveInputs.length;

    const rows: TruthTableRow[] = [];
    for (let mask = 0; mask < rowCount; mask++) {
        const bits = effectiveInputs.map((_, idx) => ((mask >> (effectiveInputs.length - 1 - idx)) & 1) === 1);

        const patched = nodes.map((n) => {
            const idx = effectiveInputs.findIndex((inp) => inp.id === n.id);
            if (idx === -1) return n;
            return { ...n, data: { ...n.data, value: bits[idx] } };
        });

        const { values } = simulateCircuit(patched, edges);
        rows.push({
            inputs: bits,
            outputs: outputNodes.map((o) => values[o.id]),
        });
    }

    return {
        inputLabels: effectiveInputs.map((n) => n.data.label || n.id),
        outputLabels: outputNodes.map((n) => n.data.label || n.id),
        rows,
        truncated,
    };
}
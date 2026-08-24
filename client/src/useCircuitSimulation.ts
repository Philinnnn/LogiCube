import { useCallback, useMemo, useRef } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { GateNodeData } from './circuitTypes';
import { simulateCircuit } from './gateLogic';

interface UseCircuitSimulationArgs {
    nodes: Node<GateNodeData>[];
    edges: Edge[];
    isRunMode: boolean;
    onInputToggled: (nodeId: string, nextValue: boolean) => void;
}

export function useCircuitSimulation({ nodes, edges, isRunMode, onInputToggled }: UseCircuitSimulationArgs) {
    const previousValuesRef = useRef<Record<string, boolean | undefined>>({});

    const simulation = useMemo(() => {
        const result = simulateCircuit(nodes, edges, previousValuesRef.current);
        previousValuesRef.current = result.values;
        return result;
    }, [nodes, edges]);

    const toggleInput = useCallback(
        (nodeId: string) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node || node.data.gateType !== 'INPUT') return;
            onInputToggled(nodeId, !node.data.value);
        },
        [nodes, onInputToggled]
    );

    const decoratedNodes = useMemo(
        () =>
            nodes.map((n) => ({
                ...n,
                data: {
                    ...n.data,
                    computedValue: simulation.values[n.id],
                    displayValue: simulation.displayValues[n.id],
                    isRunMode,
                    onToggleInput: toggleInput,
                },
            })),
        [nodes, simulation, isRunMode, toggleInput]
    );

    const decoratedEdges = useMemo(
        () =>
            edges.map((e) => {
                const sourceVal = isRunMode ? simulation.values[e.source] : undefined;
                const runColor = sourceVal === true ? '#22c55e' : sourceVal === false ? '#71717a' : '#94a3b8';
                return {
                    ...e,
                    animated: isRunMode && sourceVal === true,
                    style: {
                        ...e.style,
                        stroke: isRunMode ? runColor : '#94a3b8',
                        strokeWidth: isRunMode && sourceVal === true ? 2.5 : 1.5,
                    },
                };
            }),
        [edges, isRunMode, simulation]
    );

    return {
        simulation,
        decoratedNodes,
        decoratedEdges,
        toggleInput,
    };
}
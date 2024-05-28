export function buildGraph(nodes, graphs) {
  const adjacencyList = {};

  // Only initialize adjacency list for nodes that are part of any edge
  graphs.forEach(edge => {
    const {startNodeId, finalNodeId} = edge;
    if (!adjacencyList[startNodeId]) {
      adjacencyList[startNodeId] = [];
    }
    if (!adjacencyList[finalNodeId]) {
      adjacencyList[finalNodeId] = [];
    }
  });

  // Populate adjacency list with edges
  graphs.forEach(edge => {
    const {id, startNodeId, finalNodeId, jarak} = edge;
    adjacencyList[startNodeId].push({
      node: finalNodeId,
      weight: jarak,
      edgeId: id,
    });
  });

  return adjacencyList;
}
